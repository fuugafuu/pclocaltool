"""Train a billion-parameter residual mixture with a shared prediction network."""
import argparse
import base64
import json
import os
from pathlib import Path

import numpy as np
import torch
from torch import nn
from torch.nn import functional as F

EXPERTS = 64
WIDTH = 3840


def read_features(directory, name):
    labels = np.fromfile(directory / (name + ".labels"), dtype=np.uint8)
    values = np.fromfile(directory / (name + ".f32"), dtype="<f4")
    return torch.from_numpy(values.reshape(len(labels), 3, -1)), torch.tensor(labels, dtype=torch.long)


def probabilities(logits, labels):
    return {
        "rounds": len(labels),
        "accuracy": (logits.argmax(1) == labels).float().mean().item(),
        "logLoss": F.cross_entropy(logits, labels).item(),
    }


def scorer(inputs, width, hidden=None):
    hidden = width if hidden is None else hidden
    return nn.Sequential(nn.Linear(inputs, width), nn.ReLU(),
                         nn.Linear(width, hidden), nn.ReLU(), nn.Linear(hidden, 1))


def score(model, values):
    return model(values).squeeze(-1)


def fit_router(values):
    """Build 64 balanced leaves by learning a PCA projection at each split."""
    router = []

    def split(indices, depth):
        if depth == 6:
            leaf = sum(node["leaf"] is not None for node in router)
            router.append(dict(leaf=leaf))
            return len(router) - 1
        sample = values[indices]
        centered = sample - sample.mean(0)
        _, vectors = torch.linalg.eigh(centered.T @ centered)
        direction = vectors[:, -1]
        projected = sample @ direction
        order = torch.argsort(projected)
        sorted_projection = projected[order]
        boundaries = (sorted_projection[1:] > sorted_projection[:-1]).nonzero().flatten() + 1
        if not len(boundaries):
            raise ValueError("Cannot route identical examples to distinct experts")
        middle = int(boundaries[(boundaries - len(indices) / 2).abs().argmin()])
        threshold = (float(sorted_projection[middle - 1]) + float(sorted_projection[middle])) / 2
        node = len(router)
        router.append(dict(leaf=None))
        left = split(indices[order[:middle]], depth + 1)
        right = split(indices[order[middle:]], depth + 1)
        router[node].update(direction=direction.tolist(), threshold=threshold, left=left, right=right)
        return node

    split(torch.arange(len(values)), 0)
    return router


def route(values, router):
    leaves = torch.empty(len(values), dtype=torch.long)

    def descend(indices, index):
        if len(indices) == 0:
            return
        node = router[index]
        if node["leaf"] is not None:
            leaves[indices] = node["leaf"]
            return
        projected = (values[indices] @ torch.tensor(node["direction"])).double()
        is_left = projected <= node["threshold"]
        descend(indices[is_left], node["left"])
        descend(indices[~is_left], node["right"])

    descend(torch.arange(len(values)), 0)
    return leaves


def fit_student(x, y, valid, labels, teacher=None, epochs=20, width=160, hidden=64,
                training_weights=None, validation_weights=None):
    model = scorer(x.shape[-1], width, hidden)
    optimizer = torch.optim.AdamW(model.parameters(), lr=0.0016, weight_decay=0.02)
    best, state = float("inf"), None
    for _ in range(epochs):
        for batch in torch.randperm(len(y)).split(512):
            optimizer.zero_grad(set_to_none=True)
            logits = score(model, x[batch])
            loss = F.cross_entropy(logits, y[batch]) if training_weights is None else (
                F.cross_entropy(logits, y[batch], reduction="none") * training_weights[batch]).mean()
            if teacher is not None:
                soft = (teacher[batch] / 1.6).softmax(1)
                loss = 0.65 * loss + 0.896 * F.kl_div(
                    (logits / 1.6).log_softmax(1), soft, reduction="batchmean")
            loss.backward()
            optimizer.step()
        with torch.no_grad():
            losses = F.cross_entropy(score(model, valid), labels, reduction="none")
            loss = (losses.mean() if validation_weights is None else
                    (losses * validation_weights).mean()).item()
        if loss < best:
            best = loss
            state = {key: value.clone() for key, value in model.state_dict().items()}
    model.load_state_dict(state)
    return model


def save_checkpoint(state, path):
    temporary = path.with_suffix(".tmp")
    torch.save(state, temporary)
    os.replace(temporary, path)


def train_experts(datasets, y, routes, shared, job, epochs):
    residuals = {key: torch.zeros_like(logits) for key, logits in shared.items()}
    count, active = 0, 0
    for leaf in range(EXPERTS):
        training = (routes["train"] == leaf).nonzero().flatten()
        if not len(training):
            raise ValueError(f"Expert {leaf} received no examples")
        expert = scorer(datasets["train"].shape[-1], WIDTH)
        nn.init.zeros_(expert[-1].weight)
        nn.init.zeros_(expert[-1].bias)
        active = sum(p.numel() for p in expert.parameters())
        count += active
        optimizer = torch.optim.SGD(expert.parameters(), lr=0.07, momentum=0.75, weight_decay=0.002)
        for _ in range(epochs):
            for batch in training[torch.randperm(len(training))].split(128):
                optimizer.zero_grad(set_to_none=True)
                logits = shared["train"][batch] + score(expert, datasets["train"][batch])
                loss = F.cross_entropy(logits, y[batch])
                loss.backward()
                optimizer.step()
        with torch.no_grad():
            for name, values in datasets.items():
                indices = (routes[name] == leaf).nonzero().flatten()
                for batch in indices.split(384):
                    if len(batch):
                        residuals[name][batch] = score(expert, values[batch])
        save_checkpoint(expert.state_dict(), job / f"expert-{leaf:02d}.pt")
        print(f"expert {leaf + 1}/{EXPERTS}: {len(training)} training rounds", flush=True)
    return residuals, count, active


def pack_student(model):
    layers = []
    with torch.no_grad():
        for layer in model:
            if not isinstance(layer, nn.Linear):
                continue
            scale = layer.weight.abs().amax(1).clamp_min(1e-8) / 7
            quant = (layer.weight / scale[:, None]).round().clamp(-7, 7).to(torch.int8)
            codes = (quant.flatten().numpy() + 8).astype(np.uint8)
            if len(codes) % 2:
                codes = np.append(codes, np.uint8(8))
            packed = codes[::2] | (codes[1::2] << 4)
            layers.append(dict(rows=layer.out_features, cols=layer.in_features,
                               scales=scale.tolist(), bias=layer.bias.tolist(),
                               packed=base64.b64encode(packed.tobytes()).decode()))
            layer.weight.copy_(quant * scale[:, None])
    return layers


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("features", type=Path)
    parser.add_argument("job", type=Path)
    parser.add_argument("--epochs", type=int, default=4)
    parser.add_argument("--threads", type=int, default=6)
    parser.add_argument("--student-only", action="store_true")
    parser.add_argument("--feature-version", type=int, choices=(2, 5), default=2)
    parser.add_argument("--student-width", type=int, default=160)
    parser.add_argument("--student-hidden", type=int, default=64)
    parser.add_argument("--seed", type=int, default=10149)
    parser.add_argument("--training-source-rounds")
    parser.add_argument("--validation-source-rounds")
    parser.add_argument("--source-weights", default="2,2,2,1")
    args = parser.parse_args()
    if min(args.epochs, args.threads) < 1:
        parser.error("epochs and threads must be positive")
    torch.set_num_threads(args.threads)
    torch.manual_seed(args.seed)
    def source_weights(specification, count):
        if specification is None:
            return None
        sizes = [int(value) for value in specification.split(",")]
        weights = [float(value) for value in args.source_weights.split(",")]
        if (len(sizes) != len(weights) or min(sizes) < 1 or not np.isfinite(weights).all()
                or min(weights) <= 0 or sum(sizes) != count):
            parser.error("Source sizes must be positive, match source weights, and add to the split size")
        return torch.cat([torch.full((size,), count * weight / size / sum(weights))
                          for size, weight in zip(sizes, weights)])
    if args.student_only:
        x, y = read_features(args.features, "train")
        valid, labels = read_features(args.features, "validation")
        mean = x.mean((0, 1))
        scale = x.std((0, 1)).clamp_min(0.015)
        x.sub_(mean).div_(scale).clamp_(-12, 12)
        valid.sub_(mean).div_(scale).clamp_(-12, 12)
        if not (1 <= args.student_width <= 512 and 1 <= args.student_hidden <= 512):
            parser.error("Browser layer widths must be between 1 and 512")
        student = fit_student(x, y, valid, labels, epochs=args.epochs,
                              width=args.student_width, hidden=args.student_hidden,
                              training_weights=source_weights(args.training_source_rounds, len(y)),
                              validation_weights=source_weights(args.validation_source_rounds, len(labels)))
        layers = pack_student(student)
        with torch.no_grad():
            result = probabilities(score(student, valid), labels)
        args.job.mkdir(parents=True, exist_ok=False)
        artifact = dict(kind="candidate-int4", featureVersion=args.feature_version,
                        mean=mean.tolist(), scale=scale.tolist(), layers=layers,
                        training=dict(seed=args.seed, epochs=args.epochs,
                                      width=args.student_width, hidden=args.student_hidden,
                                      trainingSources=args.training_source_rounds,
                                      validationSources=args.validation_source_rounds,
                                      sourceWeights=args.source_weights))
        (args.job / "student.json").write_text(json.dumps(artifact, separators=(",", ":")), encoding="utf-8")
        print("quantized student validation", result, flush=True)
        return
    if args.feature_version != 2:
        parser.error("Feature version 5 requires --student-only")
    data = {name: read_features(args.features, name)
            for name in ("train", "validation", "test", "external")}
    x, y = data["train"]
    mean = x.mean((0, 1))
    scale = x.std((0, 1)).clamp_min(0.015)
    values = {name: ((features - mean) / scale).clamp(-12, 12)
              for name, (features, _) in data.items()}
    router = fit_router(values["train"].mean(1))
    routes = {name: route(features.mean(1), router) for name, features in values.items()}
    if routes["train"].unique().numel() != EXPERTS:
        raise ValueError("Training does not cover all experts")
    _, labels = data["validation"]
    shared = fit_student(values["train"], y, values["validation"], labels)
    with torch.no_grad():
        prior = {name: score(shared, features) for name, features in values.items()}
    args.job.mkdir(parents=True, exist_ok=False)
    save_checkpoint(dict(router=router, mean=mean, scale=scale, shared=shared.state_dict()),
                    args.job / "shared.pt")
    print("shared validation", probabilities(prior["validation"], labels), flush=True)
    residuals, parameters, active = train_experts(values, y, routes, prior, args.job, args.epochs)
    shared_parameters = sum(p.numel() for p in shared.parameters())
    parameters += shared_parameters
    active += shared_parameters
    strength = min((0.125, 0.25, 0.5, 0.75, 1), key=lambda fraction: F.cross_entropy(
        prior["validation"] + fraction * residuals["validation"], labels).item())
    teacher = {name: logits + strength * residuals[name] for name, logits in prior.items()}
    print(f"{parameters:,} total parameters; {active:,} active; residual weight {strength}", flush=True)
    student = fit_student(values["train"], y, values["validation"], labels, teacher["train"])
    layers = pack_student(student)
    splits = ("validation", "test", "external")
    with torch.no_grad():
        teacher_scores = {name: probabilities(teacher[name], data[name][1]) for name in splits}
        student_scores = {name: probabilities(score(student, values[name]), data[name][1]) for name in splits}
    artifact = dict(kind="candidate-int4", featureVersion=2, mean=mean.tolist(), scale=scale.tolist(),
                    layers=layers, teacherParameters=parameters, teacherActiveParameters=active,
                    teacherWeight=strength, teacherScores=teacher_scores, studentScores=student_scores)
    for key, result in (("teacher", teacher_scores), ("student", student_scores)):
        print(key, result, flush=True)
    (args.job / "student.json").write_text(json.dumps(artifact, separators=(",", ":")), encoding="utf-8")


if __name__ == "__main__":
    main()

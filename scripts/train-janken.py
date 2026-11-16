"""Train a routed 0.5B teacher and export an INT4 browser student."""
import argparse
import base64
import json
import os
from pathlib import Path
import random
import time

import torch
from torch import nn
from torch.nn import functional as F

HISTORY = 12
INPUT = HISTORY * 10
WIDTH = 2960
EXPERTS = 28
STUDENT = 128


def load_games(source):
    groups = {}
    for split, entries in json.loads(source.read_text(encoding="utf-8")).items():
        games = []
        for encoded in entries:
            history, features, routes, labels = [], [], [], []
            for pair in base64.b64decode(encoded, validate=True):
                if pair == 255:
                    history.clear()
                    continue
                if pair > 8:
                    raise ValueError("Invalid round encoding")
                keys = list(reversed(history[-HISTORY:]))
                features.append(keys + [9] * (HISTORY - len(keys)))
                routes.append(0 if not history else 1 + min(2, (len(history) - 1) // 10) * 9 + history[-1])
                labels.append(pair // 3)
                history.append(pair)
            if labels:
                games.append((torch.tensor(features), torch.tensor(routes), torch.tensor(labels)))
        groups[split] = games
    return groups


def join_games(games):
    keys, routes, labels = (torch.cat(column) for column in zip(*games))
    x = F.one_hot(keys, 10).float().flatten(1)
    return x, routes, labels


def teacher_expert():
    return nn.Sequential(nn.Linear(INPUT, WIDTH), nn.ReLU(),
                         nn.Linear(WIDTH, WIDTH), nn.ReLU(),
                         nn.Linear(WIDTH, WIDTH), nn.ReLU(), nn.Linear(WIDTH, 3))


@torch.no_grad()
def teacher_logits(experts, data, batch_size):
    x, routes, y = data
    out = torch.empty(len(y), 3)
    for index, expert in enumerate(experts):
        positions = torch.where(routes == index)[0]
        for batch in positions.split(batch_size):
            if len(batch):
                out[batch] = expert(x[batch])
    return out


def metric(logits, y):
    return dict(rounds=len(y), accuracy=(logits.argmax(1) == y).float().mean().item(),
                logLoss=F.cross_entropy(logits, y).item())


def train_teacher(games, args, validation):
    experts = nn.ModuleList(teacher_expert() for _ in range(EXPERTS))
    count = sum(p.numel() for p in experts.parameters())
    active = sum(p.numel() for p in experts[0].parameters())
    print(f"Teacher: {count:,} total / {active:,} active parameters", flush=True)
    rng = random.Random(args.seed)
    optimizers = [torch.optim.SGD(expert.parameters(), lr=0.045, momentum=0.85)
                  for expert in experts]
    best = float("inf")
    for epoch in range(1, args.epochs + 1):
        start = time.perf_counter()
        order = games.copy()
        rng.shuffle(order)
        x, routes, labels = join_games(order)
        done = 0
        for index, (expert, optimizer) in enumerate(zip(experts, optimizers)):
            for batch in torch.where(routes == index)[0].split(args.batch):
                if not len(batch):
                    continue
                optimizer.zero_grad(set_to_none=True)
                forecast = expert(x[batch])
                loss = F.cross_entropy(forecast, labels[batch])
                loss.backward()
                optimizer.step()
                done += len(batch)
            print(f"epoch {epoch}/{args.epochs} expert {index + 1}/{EXPERTS} samples {done}/{len(labels)}", flush=True)
        score = metric(teacher_logits(experts, validation, args.batch), validation[2])
        print(f"epoch {epoch} {time.perf_counter() - start:.1f}s validation {score}", flush=True)
        if score["logLoss"] < best:
            best = score["logLoss"]
            temporary = args.checkpoint.with_suffix(".tmp")
            torch.save(experts.state_dict(), temporary)
            os.replace(temporary, args.checkpoint)
    experts.load_state_dict(torch.load(args.checkpoint, weights_only=True, mmap=True))
    return experts, count, active


def pack_int4(model):
    packed = []
    for layer in model:
        if not isinstance(layer, nn.Linear):
            continue
        with torch.no_grad():
            scale = layer.weight.abs().amax(1).clamp_min(1e-8) / 7
            quant = (layer.weight / scale[:, None]).round().clamp(-7, 7).to(torch.int8)
            codes = (quant.flatten() + 8).tolist()
            codes += [8] * (len(codes) % 2)
            data = bytes(a | (b << 4) for a, b in zip(codes[::2], codes[1::2]))
            packed.append(dict(rows=layer.out_features, cols=layer.in_features,
                               scales=scale.tolist(), bias=layer.bias.tolist(),
                               packed=base64.b64encode(data).decode()))
            layer.weight.copy_(quant * scale[:, None])
    return packed


def distill(training, validation, experts, args):
    x, _, labels = training
    soft = (teacher_logits(experts, training, args.batch) / 2).softmax(1)
    student = nn.Sequential(nn.Linear(INPUT, STUDENT), nn.ReLU(),
                            nn.Linear(STUDENT, 64), nn.ReLU(), nn.Linear(64, 3))
    optimizer = torch.optim.AdamW(student.parameters(), lr=0.002)
    best, state = float("inf"), None
    for _ in range(24):
        for batch in torch.randperm(len(labels)).split(512):
            optimizer.zero_grad(set_to_none=True)
            logits = student(x[batch])
            loss = 0.65 * F.cross_entropy(logits, labels[batch])
            loss += 1.4 * F.kl_div((logits / 2).log_softmax(1), soft[batch], reduction="batchmean")
            loss.backward()
            optimizer.step()
        with torch.no_grad():
            val = F.cross_entropy(student(validation[0]), validation[2]).item()
        if val < best:
            best, state = val, {key: value.clone() for key, value in student.state_dict().items()}
    student.load_state_dict(state)
    return student


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("data", type=Path)
    parser.add_argument("--checkpoint", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--epochs", type=int, default=3)
    parser.add_argument("--batch", type=int, default=192)
    parser.add_argument("--threads", type=int, default=6)
    parser.add_argument("--seed", type=int, default=9071)
    args = parser.parse_args()
    if min(args.epochs, args.batch, args.threads) < 1:
        parser.error("epochs, batch and threads must be positive")
    torch.set_num_threads(args.threads)
    torch.manual_seed(args.seed)
    groups = load_games(args.data)
    validation = join_games(groups["validation"])
    experts, count, active = train_teacher(groups["train"], args, validation)
    training = join_games(groups["train"])
    test = join_games(groups["test"])
    student = distill(training, validation, experts, args)
    with torch.no_grad():
        teacher_score = metric(teacher_logits(experts, test, args.batch), test[2])
        before = metric(student(test[0]), test[2])
        layers = pack_int4(student)
        after = metric(student(test[0]), test[2])
    document = dict(schema=1, kind="dense-int4", history=HISTORY, layers=layers,
                    teacherParameters=count, teacherActiveParameters=active,
                    teacherTest=teacher_score, studentFloatTest=before, test=after)
    args.output.write_text("globalThis.JankenModelArtifact=" +
                           json.dumps(document, separators=(",", ":")) + ";", encoding="utf-8")
    print({key: value for key, value in document.items() if key != "layers"}, flush=True)


if __name__ == "__main__":
    main()

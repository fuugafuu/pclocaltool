"""Train and INT4-quantize a conditional opponent model from causal battle features."""
import argparse
import importlib.util
import json
import sys
from pathlib import Path

import torch


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("features", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--epochs", type=int, default=24)
    parser.add_argument("--width", type=int, default=48)
    parser.add_argument("--hidden", type=int, default=16)
    parser.add_argument("--seed", type=int, default=611181)
    parser.add_argument("--opening", action="store_true", help="Emphasize the first 24 rounds")
    parser.add_argument("--source-weights", type=float, nargs="+")
    parser.add_argument("--additional-hidden", type=int, nargs="*", default=[])
    args = parser.parse_args()
    if args.epochs < 1:
        parser.error("epochs must be positive")
    if not (1 <= args.width <= 512 and 1 <= args.hidden <= 512):
        parser.error("layer widths must be between 1 and 512")
    if len(args.additional_hidden) > 5 or any(not 1 <= size <= 512 for size in args.additional_hidden):
        parser.error("Provide at most five additional layers of width 1 through 512")
    spec = importlib.util.spec_from_file_location(
        "janken_training", Path(__file__).with_name("train-janken-routed.py"))
    sys.dont_write_bytecode = True
    helpers = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(helpers)
    torch.set_num_threads(6)
    torch.manual_seed(args.seed)
    x, y = helpers.read_features(args.features, "train")
    validation, labels = helpers.read_features(args.features, "validation")
    manifest = json.loads((args.features / "manifest.json").read_text(encoding="utf-8"))
    round_scale = 96 if manifest["featureVersion"] >= 4 else 64

    def opening_weights(rows):
        weights = 0.18 + 2.5 * torch.exp(-rows[:, 0, 0] * round_scale / 24)
        return weights / weights.mean()

    def sample_weights(rows, split):
        weights = opening_weights(rows) if args.opening else None
        if args.source_weights:
            counts = manifest["sourceRounds"][split]
            if len(counts) != len(args.source_weights) or min(args.source_weights) <= 0:
                parser.error("Provide one positive weight per source")
            source = torch.repeat_interleave(torch.tensor(args.source_weights), torch.tensor(counts))
            weights = source if weights is None else weights * source
        return weights / weights.mean() if weights is not None else None

    training_weights = sample_weights(x, "train")
    validation_weights = sample_weights(validation, "validation")
    mean = x.mean((0, 1))
    scale = x.std((0, 1)).clamp_min(0.015)
    x.sub_(mean).div_(scale).clamp_(-12, 12)
    validation.sub_(mean).div_(scale).clamp_(-12, 12)
    model = helpers.fit_student(x, y, validation, labels, epochs=args.epochs,
                                width=args.width, hidden=args.hidden,
                                training_weights=training_weights, validation_weights=validation_weights,
                                additional_hidden=args.additional_hidden)
    layers = helpers.pack_student(model)
    with torch.no_grad():
        result = helpers.probabilities(helpers.score(model, validation), labels)
    artifact = dict(kind="battle-int4", featureVersion=manifest["featureVersion"], mean=mean.tolist(),
                    scale=scale.tolist(), layers=layers, validation=result,
                    training=dict(seed=args.seed, epochs=args.epochs, width=args.width, hidden=args.hidden,
                                  rounds=len(y), generatedGames=manifest.get("generatedGames"),
                                  sourceRounds=manifest.get("sourceRounds"),
                                  sourceWeights=args.source_weights, opening=args.opening,
                                  additionalHidden=args.additional_hidden))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(artifact, separators=(",", ":")), encoding="utf-8")
    print("quantized battle model", result, flush=True)


if __name__ == "__main__":
    main()

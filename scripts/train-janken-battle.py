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
    args = parser.parse_args()
    if args.epochs < 1:
        parser.error("epochs must be positive")
    if not (1 <= args.width <= 512 and 1 <= args.hidden <= 512):
        parser.error("layer widths must be between 1 and 512")
    spec = importlib.util.spec_from_file_location(
        "janken_training", Path(__file__).with_name("train-janken-routed.py"))
    sys.dont_write_bytecode = True
    helpers = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(helpers)
    torch.set_num_threads(6)
    torch.manual_seed(args.seed)
    x, y = helpers.read_features(args.features, "train")
    validation, labels = helpers.read_features(args.features, "validation")
    mean = x.mean((0, 1))
    scale = x.std((0, 1)).clamp_min(0.015)
    x.sub_(mean).div_(scale).clamp_(-12, 12)
    validation.sub_(mean).div_(scale).clamp_(-12, 12)
    model = helpers.fit_student(x, y, validation, labels, epochs=args.epochs,
                                width=args.width, hidden=args.hidden)
    layers = helpers.pack_student(model)
    with torch.no_grad():
        result = helpers.probabilities(helpers.score(model, validation), labels)
    manifest = json.loads((args.features / "manifest.json").read_text(encoding="utf-8"))
    artifact = dict(kind="battle-int4", featureVersion=manifest["featureVersion"], mean=mean.tolist(),
                    scale=scale.tolist(), layers=layers, validation=result,
                    training=dict(seed=args.seed, epochs=args.epochs, width=args.width, hidden=args.hidden,
                                  rounds=len(y), generatedGames=manifest["generatedGames"]))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(artifact, separators=(",", ":")), encoding="utf-8")
    print("quantized battle model", result, flush=True)


if __name__ == "__main__":
    main()

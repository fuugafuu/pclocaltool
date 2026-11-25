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
    args = parser.parse_args()
    if args.epochs < 1:
        parser.error("epochs must be positive")
    spec = importlib.util.spec_from_file_location(
        "janken_training", Path(__file__).with_name("train-janken-routed.py"))
    sys.dont_write_bytecode = True
    helpers = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(helpers)
    torch.set_num_threads(6)
    torch.manual_seed(611181)
    x, y = helpers.read_features(args.features, "train")
    validation, labels = helpers.read_features(args.features, "validation")
    mean = x.mean((0, 1))
    scale = x.std((0, 1)).clamp_min(0.015)
    x.sub_(mean).div_(scale).clamp_(-12, 12)
    validation.sub_(mean).div_(scale).clamp_(-12, 12)
    model = helpers.fit_student(x, y, validation, labels, epochs=args.epochs, width=48, hidden=16)
    layers = helpers.pack_student(model)
    with torch.no_grad():
        result = helpers.probabilities(helpers.score(model, validation), labels)
    manifest = json.loads((args.features / "manifest.json").read_text(encoding="utf-8"))
    artifact = dict(kind="battle-int4", featureVersion=manifest["featureVersion"], mean=mean.tolist(),
                    scale=scale.tolist(), layers=layers, validation=result,
                    training=dict(seed=611181, epochs=args.epochs, width=48, hidden=16))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(artifact, separators=(",", ":")), encoding="utf-8")
    print("quantized battle model", result, flush=True)


if __name__ == "__main__":
    main()

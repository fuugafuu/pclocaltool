"""Fit and export a next-move model from janken-features.cjs output."""
import argparse
import base64
import json
from pathlib import Path
import tempfile

from catboost import CatBoostClassifier
import lightgbm as lgb
import numpy as np


def data(directory, name):
    labels = np.fromfile(directory / (name + ".labels"), dtype=np.uint8)
    values = np.fromfile(directory / (name + ".f32"), dtype="<f4")
    return values.reshape(len(labels) * 3, -1), labels


def score(raw, labels):
    logits = raw.reshape(-1, 3)
    correct = logits[np.arange(len(labels)), labels]
    loss = np.logaddexp.reduce(logits, axis=1) - correct
    return float(np.mean(logits.argmax(1) == labels)), float(loss.mean())


def encode_catboost(model):
    with tempfile.TemporaryDirectory() as directory:
        file = Path(directory) / "trees.json"
        model.save_model(str(file), format="json")
        native = json.loads(file.read_text(encoding="utf-8"))
    scale, bias = native["scale_and_bias"]
    feature_map = {item["feature_index"]: item["flat_feature_index"]
                   for item in native["features_info"]["float_features"]}
    feature_ids, thresholds, weights, depths = [], [], [], []
    for tree in native["oblivious_trees"]:
        splits = tree["splits"] or []
        depths.append(len(splits))
        feature_ids.extend(feature_map[split["float_feature_index"]] for split in splits)
        thresholds.extend(split["border"] for split in splits)
        weights.extend(tree["leaf_values"])
    max_abs = max(abs(weight) for weight in weights)
    step = max_abs / 32767 if max_abs else 1
    packed = np.rint(np.array(weights) / step).astype("<i2")
    return dict(kind="adaptive-tree", schema=1, depths=depths, features=feature_ids,
                thresholds=thresholds, weights=base64.b64encode(packed).decode(),
                scale=scale * step, bias=bias[0])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("features", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--trials", type=int, default=8)
    parser.add_argument("--feature-version", type=int, choices=(1, 2, 3, 4, 5), default=1)
    args = parser.parse_args()
    if not 1 <= args.trials <= 8:
        parser.error("--trials must be between 1 and 8")
    training, y = data(args.features, "train")
    validation, v = data(args.features, "validation")
    test, t = data(args.features, "test")
    binary = (np.arange(3) == y[:, None]).ravel()
    val_binary = (np.arange(3) == v[:, None]).ravel()
    best = None
    for depth, iterations, rate in [(5, 380, .09), (6, 600, .075), (7, 680, .065),
                                    (4, 500, .10), (6, 1050, .035), (8, 680, .055),
                                    (5, 900, .045), (7, 1050, .035)][:args.trials]:
        model = CatBoostClassifier(depth=depth, iterations=iterations, learning_rate=rate,
                                   thread_count=6, verbose=False, random_seed=2048,
                                   allow_writing_files=False)
        model.fit(training, binary, eval_set=(validation, val_binary), early_stopping_rounds=65)
        raw = model.predict(validation, prediction_type="RawFormulaVal")
        accuracy, loss = score(raw, v)
        print(f"cat depth={depth} trees={model.tree_count_} accuracy={accuracy:.6f} loss={loss:.6f}", flush=True)
        if best is None or (accuracy, -loss) > best[0]:
            best = (accuracy, -loss), model
            artifact = encode_catboost(model)
            artifact["featureVersion"] = args.feature_version
            args.output.write_text("globalThis.JankenModelArtifact=" +
                                   json.dumps(artifact, separators=(",", ":")) + ";\n",
                                   encoding="utf-8")
            np.save(args.output.with_suffix(".validation.npy"), raw)

    _, model = best
    print("Selected test:", score(model.predict(test, prediction_type="RawFormulaVal"), t), flush=True)
    dataset = lgb.Dataset(training, label=binary)
    holdout = lgb.Dataset(validation, label=val_binary, reference=dataset)
    baseline = lgb.train(dict(objective="binary", num_leaves=31, learning_rate=.06,
                              num_threads=6, verbosity=-1, seed=2048),
                         dataset, num_boost_round=480, valid_sets=[holdout],
                         callbacks=[lgb.early_stopping(45, verbose=False)])
    print("LightGBM comparison (validation only):", score(baseline.predict(validation, raw_score=True), v), flush=True)


if __name__ == "__main__":
    main()

"""Prepare dyad-disjoint move sequences from OpenNeuro ds006761 event tables."""
import argparse
import base64
import csv
import hashlib
import json
from pathlib import Path


def read_game(file):
    result = [[], []]
    with file.open(newline="", encoding="utf-8-sig") as stream:
        for index, row in enumerate(csv.DictReader(stream, delimiter="\t"), 1):
            if int(row["trial_num"]) != index:
                raise ValueError(f"Unexpected trial order in {file.name}")
            a, b = (int(row[f"player{side}_resp"]) - 1 for side in (1, 2))
            for perspective, (own, other) in zip(result, ((a, b), (b, a))):
                perspective.append(3 * own + other if 0 <= own <= 2 and 0 <= other <= 2 else 255)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("events", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    files = sorted(args.events.glob("sub-*.tsv"))
    if len(files) != 31:
        raise ValueError("Expected all 31 dyad files from ds006761")
    files.sort(key=lambda f: hashlib.sha256(("janken-20261117/" + f.stem).encode()).digest())
    partitions = {"train": files[:21], "validation": files[21:26], "test": files[26:]}
    dataset = {}
    total_sequences = set()
    for split, partition in partitions.items():
        data = []
        for file in partition:
            for game in read_game(file):
                encoded = base64.b64encode(bytes(game)).decode("ascii")
                if encoded in total_sequences:
                    raise ValueError("Duplicate sequence")
                total_sequences.add(encoded)
                data.append(encoded)
        dataset[split] = data
        print(split, len(data), sum(255 != code for sequence in data for code in base64.b64decode(sequence)))
    args.output.write_text(json.dumps(dataset, separators=(",", ":")), encoding="utf-8")


if __name__ == "__main__":
    main()

"""Convert the Guennouni and Speekenbrink RPS data to player-disjoint splits."""
import argparse
import base64
import hashlib
import json
from pathlib import Path

import pyreadr


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    table = pyreadr.read_r(str(args.source))["rps"]
    if not table.groupby("id", observed=True)["ai_strategy"].nunique().eq(1).all():
        raise ValueError("An individual appeared in multiple strategy groups")
    moves = {"rock": 0, "paper": 1, "scissors": 2}
    groups = {"train": [], "validation": [], "test": []}
    for _, block in table.groupby("ai_strategy", observed=True):
        players = sorted(block.groupby("id", observed=True),
                         key=lambda entry: hashlib.sha256(str(entry[0]).encode()).digest())
        for index, (_, player) in enumerate(players):
            rounds = player.sort_values("round")
            if rounds["round"].tolist() != list(range(1, 51)):
                raise ValueError("Expected 50 consecutive rounds per player")
            encoded = bytes(3 * moves[own] + moves[other]
                            for own, other in zip(rounds["human_action"], rounds["ai_action"]))
            split = {0: "test", 1: "validation"}.get(index % 5, "train")
            groups[split].append(base64.b64encode(encoded).decode("ascii"))
    args.output.write_text(json.dumps(groups), encoding="utf-8")
    print({split: 50 * len(games) for split, games in groups.items()})


if __name__ == "__main__":
    main()

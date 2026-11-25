"""Build an external test corpus from Zhang, Moisan and Gonzalez's two experiments."""
import argparse
import base64
from collections import defaultdict
import csv
import json
from pathlib import Path


def read_games(path):
    games = defaultdict(dict)
    with path.open(encoding="utf-8-sig", newline="") as file:
        for raw in csv.DictReader(file):
            row = {key.lower(): value for key, value in raw.items()}
            trial, human, other = (int(row[key]) for key in ("trial", "choice", "choice_other"))
            if human not in range(3) or other not in range(3):
                raise ValueError("Expected the three published hand codes 0, 1 and 2")
            # Experiment 1 uses paper, scissors, rock. Experiment 2 uses rock, paper, scissors.
            if "payoff_you" in row:
                human, other = (human + 1) % 3, (other + 1) % 3
            human_pay = int(row.get("payoff_you", row.get("payoff")))
            other_pay = int(row["payoff_other"])
            result = (0, 1, -1)[(human - other) % 3]
            if result != (human_pay > other_pay) - (human_pay < other_pay):
                raise ValueError("Hand codes and payoffs disagree")
            history = games[row["id"], row.get("group")]
            if trial in history:
                raise ValueError("Duplicate trial")
            history[trial] = 3 * human + other
    sequences = [bytes(history.get(trial, 255) for trial in range(1, max(history) + 1))
                 for history in games.values()]
    print(path.name, len(sequences), sum(len(game) - game.count(255) for game in sequences))
    return [base64.b64encode(game).decode("ascii") for game in sequences]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    args.output.write_text(json.dumps({"test": read_games(args.input)}, separators=(",", ":")), encoding="utf-8")


if __name__ == "__main__":
    main()

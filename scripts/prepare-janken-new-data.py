"""Build round sequences from the two pinned research datasets."""
import argparse
import base64
from collections import defaultdict
import csv
import hashlib
import json
from pathlib import Path

import pyreadr

MOVES = {"rock": 0, "paper": 1, "scissors": 2, "r": 0, "p": 1, "s": 2}
MISSING = 255


def encode(values):
    return base64.b64encode(bytes(values)).decode("ascii")


def bucket(identifier):
    return int.from_bytes(hashlib.sha256(identifier.encode()).digest()[:4], "big") % 100


def read_csv(path):
    with path.open(newline="", encoding="utf-8-sig") as stream:
        yield from csv.DictReader(stream)


def blocked_ids(paths):
    games, players = set(), set()
    for path in paths:
        for row in read_csv(path):
            games.add(row["game_id"])
            if row.get("is_bot") != "1":
                players.add(row["player_id"])
    return games, players


def bot_trials(path, excluded):
    games, people = defaultdict(dict), defaultdict(set)
    blocked_games, blocked_players = excluded
    for row in read_csv(path):
        game = row["game_id"]
        if game in blocked_games:
            continue
        side = int(row["is_bot"])
        if side not in (0, 1):
            raise ValueError("Invalid is_bot field")
        if side == 0:
            people[game].add(row["player_id"])
        move = MOVES.get(row["player_move"])
        if move is not None:
            key = int(row["round_index"]), side
            previous = games[game].setdefault(key, move)
            if previous != move:
                raise ValueError("Conflicting duplicate move")
    splits = {key: [] for key in ("train", "validation", "test")}
    seen_sequences = set()
    for game, rounds in sorted(games.items()):
        if len(people[game]) != 1 or people[game] & blocked_players:
            continue
        player = next(iter(people[game]))
        paired = [
            3 * rounds[index, 0] + rounds[index, 1]
            if (index, 0) in rounds and (index, 1) in rounds else MISSING
            for index in range(1, 1 + max(index for index, _ in rounds))
        ]
        if len(paired) - paired.count(MISSING) < 16:
            continue
        sequence = encode(paired)
        if sequence in seen_sequences:
            continue
        seen_sequences.add(sequence)
        partition = bucket(player)
        split = "test" if partition < 15 else "validation" if partition < 30 else "train"
        splits[split].append(sequence)
    return splits


def human_trials(path):
    table = pyreadr.read_r(str(path))["WXZ2014"]
    sequences = []
    for _, group in table.groupby("id", sort=True):
        rows = group.sort_values("period")
        if rows["period"].tolist() != list(range(1, len(rows) + 1)):
            raise ValueError("Missing or duplicate WXZ periods")
        sequences.append(encode(3 * MOVES[own] + MOVES[other]
                                for own, other in zip(rows["choice"], rows["other.choice"])))
    return sequences


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("v3", type=Path)
    parser.add_argument("wxz", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--exclude", type=Path, nargs="+", required=True)
    args = parser.parse_args()
    data = bot_trials(args.v3, blocked_ids(args.exclude))
    data["external"] = human_trials(args.wxz)
    for name, games in data.items():
        rounds = sum(sum(pair != MISSING for pair in base64.b64decode(game)) for game in games)
        print(name, len(games), rounds)
    args.output.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")


if __name__ == "__main__":
    main()

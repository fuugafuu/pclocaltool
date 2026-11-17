"""Build game-disjoint sequences from the pinned Roshambo.me research export."""
import argparse
import base64
import csv
import hashlib
import json
from collections import defaultdict
from pathlib import Path

EXPECTED_SHA256 = "1e6166bfb8cdea62d2ea16966381dab0d76f4e35ed80fa767126dc7657641e45"


def swapped(sequence):
    return bytes(pair if pair == 255 else (pair % 3) * 3 + pair // 3 for pair in sequence)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--exclude", type=Path, nargs="+", required=True)
    args = parser.parse_args()
    if hashlib.sha256(args.source.read_bytes()).hexdigest() != EXPECTED_SHA256:
        raise ValueError("The source is not the pinned 455,180-row research export")
    blocked = set()
    for file in args.exclude:
        corpus = json.loads(file.read_text(encoding="utf-8"))
        sequences = corpus if isinstance(corpus, list) else sum(corpus.values(), [])
        for encoded in sequences:
            sequence = base64.b64decode(encoded)
            blocked.add(min(sequence, swapped(sequence)))
    games = defaultdict(bytearray)
    previous_round = {}
    with args.source.open(encoding="utf-8-sig", newline="") as stream:
        for row in csv.DictReader(stream, delimiter="\t"):
            game = int(row["game_id"])
            turn = int(row["game_round_id"])
            own = int(row["player_one_throw"])
            other = int(row["player_two_throw"])
            if game < 1 or turn < previous_round.get(game, 1):
                raise ValueError("Non-chronological game")
            previous_round[game] = turn
            games[game].append(3 * (own - 1) + other - 1
                               if own in (1, 2, 3) and other in (1, 2, 3) else 255)
    splits = {key: [] for key in ("train", "validation", "test")}
    seen = set(blocked)
    counts = {key: 0 for key in splits}
    for sequence in games.values():
        raw = bytes(sequence)
        valid = len(raw) - raw.count(255)
        if valid < 4:
            continue
        reverse = swapped(raw)
        canonical = min(raw, reverse)
        if canonical in seen:
            continue
        seen.add(canonical)
        bucket = int.from_bytes(hashlib.sha256(canonical).digest()[:4], "big") % 100
        split = "test" if bucket < 15 else "validation" if bucket < 30 else "train"
        for side in sorted({raw, reverse}):
            splits[split].append(base64.b64encode(side).decode("ascii"))
            counts[split] += valid
    args.output.write_text(json.dumps(splits), encoding="utf-8")
    print("Rounds:", counts, "sequences:", {key: len(games) for key, games in splits.items()})


if __name__ == "__main__":
    main()

"""Convert the pinned RPSvAI archive to participant-disjoint two-hand sequences."""
import argparse
import base64
from collections import Counter
import hashlib
import json
from pathlib import Path, PurePosixPath
import zipfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    splits = {key: [] for key in ("train", "validation", "test")}
    participants = {key: set() for key in splits}
    seen = set()
    skipped = Counter()
    moves = {hand: index for index, hand in enumerate("RPS")}
    with zipfile.ZipFile(args.archive) as archive:
        for name in sorted(archive.namelist()):
            path = PurePosixPath(name)
            if path.name != "block1_AI.dat" or path.parts[1:3] != ("DATA", "TMB2"):
                continue
            person = path.parent.parent.name
            lines = archive.read(name).decode("utf-8-sig").splitlines()
            human, ai = (lines[index].split() for index in (5, 6)) if len(lines) >= 7 else ([], [])
            if len(human) != 300 or len(ai) != 300 or (set(human) | set(ai)) - moves.keys():
                skipped["invalid_or_incomplete"] += 1
                continue
            game = bytes(3 * moves[left] + moves[right] for left, right in zip(human, ai))
            if game in seen:
                skipped["duplicate"] += 1
                continue
            seen.add(game)
            bucket = int.from_bytes(hashlib.sha256(person.encode()).digest()[:4], "big") % 100
            split = "test" if bucket < 20 else "validation" if bucket < 35 else "train"
            participants[split].add(person)
            splits[split].append(base64.b64encode(game).decode("ascii"))
    totals = {split: dict(games=len(games), participants=len(participants[split]), rounds=300 * len(games))
              for split, games in splits.items()}
    if not all(totals[split]["games"] for split in splits):
        raise ValueError("A partition is empty")
    args.output.write_text(json.dumps(splits, separators=(",", ":")), encoding="utf-8")
    print(json.dumps(dict(splits=totals, skipped=skipped)))


if __name__ == "__main__":
    main()

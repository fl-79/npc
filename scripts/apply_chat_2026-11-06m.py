"""One-off: room 19 (Level 2) should match rooms 21, 72 and 73 (chat 2026-11-06): the same tables
(program/objects.json O31), bookable for reviews, classes and clubs, the same activities. Room
22's note says its tables stand in rows facing the screen.
Run once: python -I scripts/apply_chat_2026-11-06m.py
"""
import json
import os
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "program", "rooms.json")
NOW = time.strftime("%Y-%m-%d %H:%M:%S")
SRC = "owner, chat 2026-11-06 (room 19 matches; room 22 in rows)"


def main():
    with open(PATH, encoding="utf-8") as f:
        program = json.load(f)
    rooms = program["rooms"]
    src = rooms["1365002"]  # room 21
    r = rooms["1364995"]
    r["access"] = src["access"]; r["who"] = src["who"]; r.pop("access_inferred", None)
    r["activities"] = json.loads(json.dumps(src["activities"]))
    for a in r["activities"]:
        a["source"] = SRC
    r["objects"] = "program/objects.json (by_use: crit; table set O31)"
    r["notes"] = ((r.get("notes", "").rstrip() + " ") if r.get("notes") else "") + (
        "Matches rooms 21, 72 and 73 (owner, 2026-11-06): the same tables as the Level 3 crit rooms, a stand-in pair placed; "
        "booked for reviews, class lectures and discussions, and by student organizations and clubs.")
    r["updated"] = NOW; r["source"] = SRC
    r22 = rooms["1365005"]
    r22["notes"] = r22["notes"].replace("a stand-in set placed", "laid in rows facing the screen, as many rows as the room's depth allows (the owner wanted five if possible)")
    r22["objects"] = "program/objects.json (by_use: crit; table rows O28)"
    r22["updated"] = NOW
    program["meta"]["updated"] = NOW
    with open(PATH, "w", encoding="utf-8") as f:
        json.dump(program, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print("room 19 matched; room 22 note updated")
    return 0


if __name__ == "__main__":
    sys.exit(main())

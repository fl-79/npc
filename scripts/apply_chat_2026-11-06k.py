"""One-off: the crit rooms on Level 2 (19, 21, 30) and in the Basement (72, 73), chat 2026-11-06.
The owner: the smaller crit rooms there are similar to the ones on the third floor; the same
interactions are enough for now. They get Level 3's crit activities and a note; the objects
(felt, screen, projector) come from the crit rule in program/objects.json by_use.
Run once: python -I scripts/apply_chat_2026-11-06k.py
"""
import json
import os
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "program", "rooms.json")
NOW = time.strftime("%Y-%m-%d %H:%M:%S")
SRC = "owner, chat 2026-11-06 (crit rooms like Level 3's)"


def main():
    with open(PATH, encoding="utf-8") as f:
        program = json.load(f)
    rooms = program["rooms"]
    model = rooms["1364433"]  # Level 3 room 1
    acts = json.loads(json.dumps(model["activities"]))
    for a in acts:
        a["source"] = SRC
    n = 0
    for rid, r in rooms.items():
        if r.get("use") != "crit" or r.get("level") == "Level 3":
            continue
        if r["number"] == "22":
            continue
        r["activities"] = acts
        r["objects"] = "program/objects.json (by_use: crit)"
        r["notes"] = ((r.get("notes", "").rstrip() + " ") if r.get("notes") else "") + (
            "Like the Level 3 crit rooms (owner, 2026-11-06): pin-up felt on every opaque wall, a screen high on the short wall "
            "on the door's side, a projector; the same crit, seminar and lecture uses. Tables and chairs not placed, number unknown.")
        if not r.get("hours"):
            pass
        r["updated"] = NOW
        r["source"] = SRC
        n += 1
    program["meta"]["updated"] = NOW
    with open(PATH, "w", encoding="utf-8") as f:
        json.dump(program, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print("%d crit rooms given Level 3's activities" % n)
    return 0


if __name__ == "__main__":
    sys.exit(main())

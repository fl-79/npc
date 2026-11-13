"""One-off: the owner's third word on the offices and two Level 2 corrections, chat 2026-11-06.
Every office: access professor, business hours, the professor and their guests. Room 32: desks
along the north wall; room 33: some desks to show the program (both shared, count unknown; the
pieces are program/objects.json O22 and O23). Walls added between rooms 31 and 30 (with a
kitchenette on room 30's side, O21) and between room 38 and rooms 36, 37, 35 (edits E3, E4).
Run once: python -I scripts/apply_chat_2026-11-06i.py
"""
import json
import os
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "program", "rooms.json")
NOW = time.strftime("%Y-%m-%d %H:%M:%S")
SRC = "owner, chat 2026-11-06 (offices: professor, business hours)"


def main():
    with open(PATH, encoding="utf-8") as f:
        program = json.load(f)
    rooms = program["rooms"]
    n = 0
    for rid, r in rooms.items():
        if r.get("use") != "office":
            continue
        r["access"] = "professor"
        r["hours"] = "business"
        r["who"] = "the professor and their guests"
        r.pop("access_inferred", None)
        r["updated"] = NOW
        r["source"] = SRC
        n += 1
    notes = {
        "1365035": "Shared office: desks along the north wall (owner, 2026-11-06), number unknown; as many 1.6 m desks as fill the wall stand in (objects O22).",
        "1365038": "Shared office: some desks to show the program (owner, 2026-11-06), number unknown; four desks in facing pairs stand in (objects O23).",
        "1365029": "Crit room. A wall divides it from the women's washroom (room 31), missing from the model (edits E3); on this room's side of that wall a small kitchenette (object O21, size assumed).",
        "1365032": "A wall divides this washroom from crit room 30, missing from the model (edits E3).",
        "1365053": "The wall between this washroom and rooms 36, 37 and 35 is missing from the model (edits E4).",
    }
    for rid, note in notes.items():
        r = rooms[rid]
        r["notes"] = note
        r["updated"] = NOW
        if r.get("use") != "office":
            r["source"] = "owner, chat 2026-11-06 (Level 2 corrections)"
    program["meta"]["updated"] = NOW
    with open(PATH, "w", encoding="utf-8") as f:
        json.dump(program, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print("%d offices: professor, business hours; %d room notes" % (n, len(notes)))
    return 0


if __name__ == "__main__":
    sys.exit(main())

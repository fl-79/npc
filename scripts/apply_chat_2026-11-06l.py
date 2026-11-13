"""One-off: rooms 21 and 22 (Level 2) and 72 and 73 (Basement), chat 2026-11-06. The owner: they
have the same tables as the third floor crit rooms (program/objects.json O27 to O30); they are
booked for reviews or for a class lecture or discussion, and can also be used by student
organizations or clubs. Access becomes bookable; the activities say so.
Run once: python -I scripts/apply_chat_2026-11-06l.py
"""
import json
import os
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "program", "rooms.json")
NOW = time.strftime("%Y-%m-%d %H:%M:%S")
SRC = "owner, chat 2026-11-06 (bookable crit and class rooms)"
ROOMS = ["1365002", "1365005", "1365258", "1365261"]


def main():
    with open(PATH, encoding="utf-8") as f:
        program = json.load(f)
    for rid in ROOMS:
        r = program["rooms"][rid]
        r["access"] = "bookable"
        r["who"] = "booked for reviews, class lectures and discussions; also student organizations and clubs"
        r.pop("access_inferred", None)
        r["activities"] = [
            {"kind": "crit", "label": "Review / crit", "layout": "tables rolled aside or stacked; chairs turned to the wall in use; groups cycle wall to wall",
             "uses": ["pinup_wall", "chair", "table"], "parameters": None, "pending": "group sizes, durations and frequency (handover notes)", "source": SRC},
            {"kind": "lecture", "label": "Class lecture or discussion", "layout": "chairs round the tables, the screen down",
             "uses": ["screen", "projector", "chair", "table"], "parameters": None, "pending": "class sizes and timetable", "source": SRC},
            {"kind": "club", "label": "Student organization or club meeting", "layout": "chairs round the tables",
             "uses": ["table", "chair"], "parameters": None, "pending": "which clubs, when, how many", "source": SRC},
        ]
        r["objects"] = "program/objects.json (by_use: crit; table set O27 to O30)"
        r["notes"] = ((r.get("notes", "").rstrip() + " ") if r.get("notes") else "") + (
            "The same tables as the Level 3 crit rooms (owner, 2026-11-06), on casters, a stand-in set placed. Booked for reviews, "
            "class lectures and discussions, and by student organizations and clubs.")
        r["updated"] = NOW
        r["source"] = SRC
        print("%s room %s: bookable, 3 activities" % (r["level"], r["number"]))
    program["meta"]["updated"] = NOW
    with open(PATH, "w", encoding="utf-8") as f:
        json.dump(program, f, indent=2, ensure_ascii=False)
        f.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())

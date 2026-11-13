"""One-off: Level 1 rooms 12 and 13, chat 2026-11-06. The owner: both have two projection screens
on the short wall opposite the door and several rows of lecture seating with shallow tables, the
count estimated from the room's size (program/objects.json O39*, O40*). Room 15 was condensed.
Run once: python -I scripts/apply_chat_2026-11-06o.py
"""
import json
import os
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "program", "rooms.json")
NOW = time.strftime("%Y-%m-%d %H:%M:%S")
SRC = "owner, chat 2026-11-06 (rooms 12 and 13 lecture set-up)"


def main():
    with open(PATH, encoding="utf-8") as f:
        program = json.load(f)
    for rid, wall, door in (("1364831", "north", "south"), ("1364835", "south", "north")):
        r = program["rooms"][rid]
        r["notes"] = ("Lecture room. Two projection screens on the %s wall, the short wall opposite the doors on the %s; several rows of "
                      "shallow lecture tables with chairs facing them, the count estimated from the room's size by rule (owner, 2026-11-06); "
                      "a speaker's table and laptop between the screens assumed as in room 15." % (wall, door))
        r["activities"] = [
            {"kind": "lecture", "label": "Lecture", "layout": "the speaker between the screens; the audience in rows at the tables facing the %s wall" % wall,
             "uses": ["screen", "projector", "computers", "table", "chair"], "parameters": None,
             "pending": "class sizes and the timetable; whether the room is booked for other events and locked otherwise; the west side's glazing or wall", "source": SRC},
        ]
        r["objects"] = "program/objects.json (O39* / O40*)"
        r["updated"] = NOW
        r["source"] = SRC
        print("room %s: note and lecture activity" % r["number"])
    r15 = program["rooms"]["1364841"]
    r15["notes"] = r15["notes"].replace("rows of shallow tables on casters", "condensed rows of smaller tables (1.8 by 0.6 m) on casters")
    r15["updated"] = NOW
    program["meta"]["updated"] = NOW
    with open(PATH, "w", encoding="utf-8") as f:
        json.dump(program, f, indent=2, ensure_ascii=False)
        f.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())

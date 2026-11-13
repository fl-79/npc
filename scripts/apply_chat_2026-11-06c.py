"""One-off: the Level 3 crit rooms (1 and 4) from chat on 2026-11-06, the start of the object and
activity pass. Adds the rooms' activities (what pulls people in and how the room is arranged for
it) and notes to program/rooms.json. The objects themselves (pin-up walls, screens, projectors)
and the furniture rules went to program/objects.json; the kinds to program/affordances.json.
Run once: python -I scripts/apply_chat_2026-11-06c.py
"""
import json
import os
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "program", "rooms.json")
NOW = time.strftime("%Y-%m-%d %H:%M:%S")
SRC = "owner, chat 2026-11-06 (crit rooms pass)"

ACTIVITIES = [
    {
        "kind": "crit",
        "label": "Crit / review",
        "layout": "tables rolled to the side or stacked top to top; chairs turned and shifted to face the wall in use; "
                  "groups cycle wall to wall, one pinning down as the next pins up",
        "uses": ["pinup_wall", "chair", "table"],
        "parameters": None,
        "pending": "group sizes, durations, attendance and frequency come from the studio-culture handover notes, to import later",
        "source": SRC,
    },
    {
        "kind": "seminar",
        "label": "History seminar / class",
        "layout": "chairs arranged around the tables",
        "uses": ["table", "chair"],
        "parameters": None,
        "pending": "class sizes and timetable not given yet",
        "source": SRC,
    },
    {
        "kind": "lecture",
        "label": "Studio lecture / internal slide presentation",
        "layout": "chairs around the tables, the screen down on the west wall",
        "uses": ["screen", "projector", "chair", "table"],
        "parameters": None,
        "pending": "sizes and frequency not given yet",
        "source": SRC,
    },
]

NOTES = {
    "1364433": "Crit room at the north end of the studio. Pin-up felt on the north, west and south walls; screen on the west wall "
               "(the door's side), projector. The door in the south wall into the kitchen (room 9) is confirmed by the owner; "
               "room 9 opens on to the lounge (room 10).",
    "1364442": "Crit room at the south end of the studio. Pin-up felt on the south, west and north walls; screen on the west wall "
               "(the door's side), projector. Reached from the studio only.",
}


def main():
    with open(PATH, encoding="utf-8") as f:
        program = json.load(f)
    for rid, note in NOTES.items():
        r = program["rooms"][rid]
        r["activities"] = json.loads(json.dumps(ACTIVITIES))
        r["notes"] = note
        r["objects"] = "program/objects.json"
        r["updated"] = NOW
        r["source"] = SRC
        print("%s room %s: %d activities, notes set" % (r["level"], r["number"], len(ACTIVITIES)))
    program["meta"]["updated"] = NOW
    with open(PATH, "w", encoding="utf-8") as f:
        json.dump(program, f, indent=2, ensure_ascii=False)
        f.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())

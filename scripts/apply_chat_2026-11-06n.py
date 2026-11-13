"""One-off: Level 1 room 15, chat 2026-11-06. The owner: a lecture set-up, two projection screens on
the long wall opposite the doors with the speaker's laptop between them, rows of tables and
chairs facing them like room 22 (program/objects.json O32 to O38). Note and activity here.
Run once: python -I scripts/apply_chat_2026-11-06n.py
"""
import json
import os
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "program", "rooms.json")
NOW = time.strftime("%Y-%m-%d %H:%M:%S")
SRC = "owner, chat 2026-11-06 (room 15 lecture set-up)"


def main():
    with open(PATH, encoding="utf-8") as f:
        program = json.load(f)
    r = program["rooms"]["1364841"]
    r["notes"] = ("Lecture room. Two projection screens on the east wall, the long wall opposite the four doors, with the speaker's "
                  "laptop on a table between them; rows of shallow tables on casters with chairs facing them, as room 22 (owner, "
                  "2026-11-06). Placed by rule, counts following from the room; a table that would stand on a column is left out.")
    r["activities"] = [
        {"kind": "lecture", "label": "Lecture", "layout": "the speaker at the laptop between the screens; the audience in rows at the tables facing east",
         "uses": ["screen", "projector", "computers", "table", "chair"], "parameters": None,
         "pending": "class sizes and the timetable; whether the room is booked for other events and locked otherwise", "source": SRC},
    ]
    r["objects"] = "program/objects.json (O32 to O38)"
    r["updated"] = NOW
    r["source"] = SRC
    program["meta"]["updated"] = NOW
    with open(PATH, "w", encoding="utf-8") as f:
        json.dump(program, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print("room 15: note and lecture activity")
    return 0


if __name__ == "__main__":
    sys.exit(main())

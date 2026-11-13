"""One-off: the studio's rules (Level 3 room 11), chat 2026-11-06. Notes and activities to
program/rooms.json; the rules themselves (casters and the movable toggle, the divider boards, the
cohort zones, the printing area, the no-go service areas) are in program/objects.json.
Run once: python -I scripts/apply_chat_2026-11-06j.py
"""
import json
import os
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "program", "rooms.json")
NOW = time.strftime("%Y-%m-%d %H:%M:%S")
SRC = "owner, chat 2026-11-06 (studio rules)"


def main():
    with open(PATH, encoding="utf-8") as f:
        program = json.load(f)
    r = program["rooms"]["1364799"]
    r["notes"] = ("The studio: sixteen bays of eight desks along the west glass with a board and a side table at the end of "
                  "each (the board more a divider), smaller groups on the east. Desks and boards are on casters, not typically "
                  "moved during the semester (movable with the movable_furniture toggle). Cohorts: the eastern desks and the "
                  "southernmost area third years, the middle first years, the northernmost second years, generally; exact "
                  "ratios in the handover note. Printing is concentrated at the north end for the whole floor: two plotters, "
                  "three large printers (8.5x11 and 11x17), and the desktop computers mid-floor that send jobs to the plotters, "
                  "all used by all students. Presence over time comes with the handover. Service shafts and similar are not occupiable.")
    r["activities"] = [
        {"kind": "desk_work", "label": "Working at one's desk",
         "layout": "each student at their own desk in their cohort's zone; neighbours in the bay",
         "uses": ["desk", "chair", "pinup"], "parameters": None,
         "pending": "cohort ratios and presence over time (handover note)", "source": SRC},
        {"kind": "print", "label": "Printing",
         "layout": "send a job from a mid-floor computer, walk to the north end, wait at the plotters or printers, collect",
         "uses": ["computers", "printer"], "parameters": None,
         "pending": "how often students print and how long a plot takes", "source": SRC},
        {"kind": "desk_crit", "label": "Desk crit",
         "layout": "the professor comes to the student's desk; a few students gather round",
         "uses": ["desk", "chair"], "parameters": None,
         "pending": "from the studio-culture handover notes", "source": SRC},
    ]
    r["objects"] = "program/objects.json (rules, zones for room 11; O24 to O26)"
    r["updated"] = NOW
    r["source"] = SRC
    program["meta"]["updated"] = NOW
    with open(PATH, "w", encoding="utf-8") as f:
        json.dump(program, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print("studio: notes and %d activities" % len(r["activities"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())

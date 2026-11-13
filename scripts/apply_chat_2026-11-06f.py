"""One-off: the Level 3 photography room (5) and 3D-printing room (6) from chat on 2026-11-06.
Notes, access and activities to program/rooms.json; the shelf, printers, backdrop, table and
lights went to program/objects.json, the kinds to program/affordances.json.
Run once: python -I scripts/apply_chat_2026-11-06f.py
"""
import json
import os
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "program", "rooms.json")
NOW = time.strftime("%Y-%m-%d %H:%M:%S")
SRC = "owner, chat 2026-11-06 (photo and 3D-print pass)"

ROOMS = {
    "1364448": {  # 3D printing, room 6
        "access": "arch_all",
        "who": "any architecture student; students bring their own filament",
        "notes": "3D-printing room, 2.5 by 2.5 m, windowless, entered from the studio; the photography room (5) is entered "
                 "through it. On the west wall (opposite the window, which the east wall covers) a shelf with at least six "
                 "small 3D printers. Students start a print and come back to collect it once it ends; unforeseen problems "
                 "stop prints; when the printers are very busy a student moves another's work aside.",
        "activities": [
            {"kind": "print", "label": "3D printing",
             "layout": "standing at the shelf; a print runs unattended for hours, the student returns to collect",
             "uses": ["printer3d", "shelf"], "parameters": None,
             "pending": "how long prints run, how often they fail, how busy the printers are through the term", "source": SRC},
        ],
    },
    "1364445": {  # photography, room 5
        "access": "arch_all",
        "access_inferred": "the whole floor is behind key card from the stairwell and the room is reached through the "
                           "3D-printing room, which any architecture student may use",
        "notes": "Photography room, 2.5 by 2.5 m, windowless, entered only through the 3D-printing room (6). Students "
                 "photograph their models: a backdrop that drops down, a table, some lights. That is all.",
        "activities": [
            {"kind": "photograph", "label": "Photographing a model",
             "layout": "the model on the table, the backdrop down behind it, the lights on either side; the student stands in front",
             "uses": ["table", "backdrop", "light_stand"], "parameters": None,
             "pending": "session length, how many at once, whether it is booked", "source": SRC},
        ],
    },
}


def main():
    with open(PATH, encoding="utf-8") as f:
        program = json.load(f)
    for rid, vals in ROOMS.items():
        r = program["rooms"][rid]
        for k, v in vals.items():
            r[k] = v
        r["objects"] = "program/objects.json"
        r["updated"] = NOW
        r["source"] = SRC
        print("%s room %s: access %s, %d activities" % (r["level"], r["number"], r["access"], len(vals["activities"])))
    program["meta"]["updated"] = NOW
    with open(PATH, "w", encoding="utf-8") as f:
        json.dump(program, f, indent=2, ensure_ascii=False)
        f.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())

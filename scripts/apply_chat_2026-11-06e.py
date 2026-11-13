"""One-off: the owner's answers on the Level 3 lounge and kitchen, chat 2026-11-06, third step:
the whole of Level 3 is behind key card from the stairwell (a floor note on every Level 3 room;
the kitchen and lounge get the studio's access rule from it, marked inferred); everyday lounge
use is lunch, social space and group work; the event schedule comes with the handover document.
Run once: python -I scripts/apply_chat_2026-11-06e.py
"""
import json
import os
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "program", "rooms.json")
NOW = time.strftime("%Y-%m-%d %H:%M:%S")
SRC = "owner, chat 2026-11-06 (lounge answers)"
FLOOR_NOTE = "Level 3 as a whole is behind key card from the stairwell (owner, chat 2026-11-06)."


def main():
    with open(PATH, encoding="utf-8") as f:
        program = json.load(f)
    rooms = program["rooms"]
    n = 0
    for rid, r in rooms.items():
        if r.get("level") != "Level 3":
            continue
        r["floor_access"] = FLOOR_NOTE
        n += 1
    for rid in ("1364793", "1364796"):
        r = rooms[rid]
        if not r.get("access"):
            r["access"] = "arch_all"
            r["access_inferred"] = ("the whole floor is behind key card from the stairwell, so the kitchen and lounge are open to "
                                    "the studio's card holders (architecture students, professors, staff)")
        r["updated"] = NOW
        r["source"] = SRC
    lounge = rooms["1364796"]
    for a in lounge.get("activities", []):
        if a["kind"] == "lounge":
            a["label"] = "Everyday use: lunch, social space, group work"
            a["layout"] = "sit on the couches, the pews and the benches; eat lunch, talk, work in groups at the serving table and the bar"
            a["uses"] = ["seating", "pew_bench", "coffee_table", "serving_table", "bar", "fridge"]
            a["pending"] = "typical numbers through the day"
            a["source"] = SRC
        elif a["kind"] in ("good_times", "waffle_times"):
            a["pending"] = "schedule, numbers and who comes: in the handover document, to import"
            a["source"] = SRC
    lounge["notes"] = (lounge["notes"].rstrip() + " Open to the studio on the south and the west half: nothing marks the edge but the "
                       "back of the pew bench and the backs of the studio desks. The long piece along the kitchen wall is a "
                       "kitchen- or bar-height serving table; the piece along the glass north of the couch is another couch or bench. "
                       "Everyday use: lunch, social space, group work. The Good Times and Waffle Times schedule comes with the handover document.")
    program["meta"]["updated"] = NOW
    with open(PATH, "w", encoding="utf-8") as f:
        json.dump(program, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print("floor note on %d Level 3 rooms; kitchen and lounge access set; lounge activities updated" % n)
    return 0


if __name__ == "__main__":
    sys.exit(main())

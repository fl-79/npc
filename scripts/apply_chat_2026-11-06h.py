"""One-off: the owner's second word on the offices, chat 2026-11-06: the large offices have shared
desks, number unknown; in the individual offices the desk faces the door, with a visitor chair
across it, some shelving (an assumption), and on the fourth floor possibly a counter along the
window. Notes and the office-work activity in program/rooms.json; the placement rule itself is
program/objects.json by_use. Run once: python -I scripts/apply_chat_2026-11-06h.py
"""
import json
import os
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "program", "rooms.json")
NOW = time.strftime("%Y-%m-%d %H:%M:%S")
SRC = "owner, chat 2026-11-06 (offices, second pass)"
MAX_AREA = 25.0
LARGE_NOTE = "Shared desks, number unknown (owner, 2026-11-06); nothing placed until the count is known."


def main():
    with open(PATH, encoding="utf-8") as f:
        program = json.load(f)
    n = big = 0
    for rid, r in program["rooms"].items():
        if r.get("use") != "office":
            continue
        if (r.get("area_m2") or 0) > MAX_AREA:
            r["notes"] = LARGE_NOTE
            r["activities"] = [{
                "kind": "office_work", "label": "Shared office work",
                "layout": "several occupants at shared desks", "uses": ["desk", "chair"], "parameters": None,
                "pending": "the number of desks and occupants, who they are, their hours", "source": SRC}]
            r["objects"] = "program/objects.json (rules: shared desks, count unknown)"
            r["updated"] = NOW
            r["source"] = SRC
            big += 1
            continue
        for a in r.get("activities", []):
            if a.get("kind") == "office_work":
                a["layout"] = ("one occupant at the desk facing the door; a visitor in the chair across the desk; "
                               "shelving on another wall (assumed)" + ("; a counter along the window (assumed)" if r.get("level") == "Level 4" else ""))
                a["uses"] = ["desk", "chair", "shelf"] + (["counter"] if r.get("level") == "Level 4" else [])
                a["source"] = SRC
        r["notes"] = ("Individual office (owner, 2026-11-06): a desk sized by the room facing the door, the occupant's chair, a visitor "
                      "chair across the desk, some shelving as an assumption" + (", and a counter along the window as the owner suggested for "
                      "the fourth floor" if r.get("level") == "Level 4" else "") + "; all placed by rule, positions inferred.")
        r["updated"] = NOW
        r["source"] = SRC
        n += 1
    program["meta"]["updated"] = NOW
    with open(PATH, "w", encoding="utf-8") as f:
        json.dump(program, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print("%d individual offices updated; %d large offices noted as shared, count unknown" % (n, big))
    return 0


if __name__ == "__main__":
    sys.exit(main())

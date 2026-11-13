"""One-off: the offices on all floors, chat 2026-11-06. The owner: they are likely individual
offices; each gets a desk sized by the room (program/objects.json by_use, placed by the
rasteriser). Here: an office-work activity on every office up to 25 m2, parameters pending; the
larger ones are left for the owner to describe. Run once: python -I scripts/apply_chat_2026-11-06g.py
"""
import json
import os
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "program", "rooms.json")
NOW = time.strftime("%Y-%m-%d %H:%M:%S")
SRC = "owner, chat 2026-11-06 (offices: a desk per individual office)"
MAX_AREA = 25.0


def main():
    with open(PATH, encoding="utf-8") as f:
        program = json.load(f)
    n = big = 0
    for rid, r in program["rooms"].items():
        if r.get("use") != "office":
            continue
        if (r.get("area_m2") or 0) > MAX_AREA:
            r["notes"] = (r.get("notes", "").rstrip() + " Larger than an individual office (%.1f m2); the owner to say what it is before "
                          "a desk is placed." % r["area_m2"]).strip()
            r["updated"] = NOW
            big += 1
            continue
        acts = [a for a in r.get("activities", []) if a.get("kind") != "office_work"]
        acts.append({
            "kind": "office_work",
            "label": "Office work",
            "layout": "one occupant at the desk, facing the room; a visitor stands or sits across the desk",
            "uses": ["desk", "chair"],
            "parameters": None,
            "pending": "who the occupant is, their hours, whether students come for office hours and how many at a time",
            "source": SRC,
        })
        r["activities"] = acts
        r["objects"] = "program/objects.json (by_use: office)"
        r["notes"] = (r.get("notes", "").rstrip() + " Individual office (owner, 2026-11-06): a desk sized by the room and a chair, "
                      "placed by rule, position inferred.").strip()
        r["updated"] = NOW
        r["source"] = SRC
        n += 1
    program["meta"]["updated"] = NOW
    with open(PATH, "w", encoding="utf-8") as f:
        json.dump(program, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print("%d individual offices given the office-work activity; %d larger offices noted for the owner" % (n, big))
    return 0


if __name__ == "__main__":
    sys.exit(main())

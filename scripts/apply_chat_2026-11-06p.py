"""One-off: the washrooms, chat 2026-11-06. The owner: design them with approximately four stalls
and three sinks (program/objects.json by_use wc). Here: a washroom activity and a note on every
room with use wc. Run once: python -I scripts/apply_chat_2026-11-06p.py
"""
import json
import os
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "program", "rooms.json")
NOW = time.strftime("%Y-%m-%d %H:%M:%S")
SRC = "owner, chat 2026-11-06 (washrooms: four stalls, three sinks)"


def main():
    with open(PATH, encoding="utf-8") as f:
        program = json.load(f)
    n = 0
    for rid, r in program["rooms"].items():
        if r.get("use") != "wc":
            continue
        r["activities"] = [{"kind": "washroom", "label": "Washroom visit", "layout": "a stall, then a sink; others wait by the door when all stalls are taken",
                            "uses": ["stall", "sink"], "parameters": None, "pending": "how often people go, and whether the men's rooms also have urinals", "source": SRC}]
        r["objects"] = "program/objects.json (by_use: wc)"
        r["notes"] = ((r.get("notes", "").rstrip() + " ") if r.get("notes") else "") + "Approximately four stalls and three sinks, placed by rule (owner, 2026-11-06)."
        r["updated"] = NOW
        r["source"] = SRC
        n += 1
    program["meta"]["updated"] = NOW
    with open(PATH, "w", encoding="utf-8") as f:
        json.dump(program, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print("%d washrooms given the activity" % n)
    return 0


if __name__ == "__main__":
    sys.exit(main())

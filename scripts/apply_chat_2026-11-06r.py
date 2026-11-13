"""One-off: the Basement shops, chat 2026-11-06. The owner: 74 is the workshop (more wood tools, one
metal bending tool), 75 the assembly room for models; both have hours since they need supervision;
the other Basement rooms will be confirmed later. Pieces: program/objects.json O48 and O49.
Run once: python -I scripts/apply_chat_2026-11-06r.py
"""
import json
import os
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "program", "rooms.json")
NOW = time.strftime("%Y-%m-%d %H:%M:%S")
SRC = "owner, chat 2026-11-06 (Basement shops)"


def main():
    with open(PATH, encoding="utf-8") as f:
        program = json.load(f)
    r = program["rooms"]["1365264"]
    r["name"] = "Workshop"
    r["access"] = "arch_all"
    r["hours"] = "business"
    r["who"] = "architecture students under supervision, in business hours"
    r["notes"] = ("The workshop: more wood tools and one metal bending tool (owner, 2026-11-06); supervised, so business hours. The tools "
                  "beyond that and their places are assumed (objects O48). No door in the model; its west side is open to the outside in the "
                  "tiles: both to confirm.")
    r["activities"] = [{"kind": "make", "label": "Workshop session", "layout": "at a workbench or a machine, a technician present",
                        "uses": ["table", "machine", "shelf"], "parameters": None, "pending": "how long students stay, how many at once, the technician's hours", "source": SRC}]
    r["objects"] = "program/objects.json (O48)"
    r["updated"] = NOW; r["source"] = SRC
    r = program["rooms"]["1365267"]
    r["name"] = "Model assembly room"
    r["access"] = "arch_all"
    r["hours"] = "business"
    r["who"] = "architecture students under supervision, in business hours"
    r["notes"] = ("The assembly room for models (owner, 2026-11-06); supervised, so business hours. Assembly tables, stools, shelving and a "
                  "cutting table are assumed (objects O49).")
    r["activities"] = [{"kind": "assemble", "label": "Model assembly", "layout": "at the assembly tables, a technician present",
                        "uses": ["table", "chair", "cutting", "shelf"], "parameters": None, "pending": "session length, how many at once, the technician's hours", "source": SRC}]
    r["objects"] = "program/objects.json (O49)"
    r["updated"] = NOW; r["source"] = SRC
    program["meta"]["updated"] = NOW
    with open(PATH, "w", encoding="utf-8") as f:
        json.dump(program, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print("rooms 74 and 75 set")
    return 0


if __name__ == "__main__":
    sys.exit(main())

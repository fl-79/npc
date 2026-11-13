"""One-off: fold the owner's chat notes of 2026-11-06 into program/rooms.json.
Each change carries its source. Blank access rules that follow from a general remark are
filled and marked `access_inferred`, so they can be confirmed or corrected; explicit entries
by the owner are never overwritten. Run once: python -I scripts/apply_chat_2026-11-06.py
"""
import json
import os
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "program", "rooms.json")
SOURCE = "owner, chat 2026-11-06"
NOW = time.strftime("%Y-%m-%d %H:%M:%S")


def main():
    with open(PATH, encoding="utf-8") as f:
        program = json.load(f)
    rooms = program["rooms"]
    by_num = {(r["level"], str(r["number"])): (i, r) for i, r in rooms.items()}

    def room(level, number):
        return by_num[(level, str(number))][1]

    def set_fields(r, **kw):
        for k, v in kw.items():
            r[k] = v
        r["updated"] = NOW
        r["source"] = SOURCE

    # room by room, as said in chat
    r = room("Level 3", 10)
    set_fields(r, status="done", flag_reason="", name="Student lounge", use="lounge",
               notes="Good Times and Waffle Times happen here; otherwise a student lounge. The door to the kitchen (room 9) is missing from the model: see program/edits.json E1.")
    r = room("Level 2", 31)
    set_fields(r, status="done", name="Women's washroom", use="wc", notes="Corrected 2026-11-06: had been labelled office by mistake.")
    r = room("Level 3", 5)
    set_fields(r, status="done", flag_reason="", name="Photography room", use="photo", notes="Students photograph their models here.")
    r = room("Level 3", 6)
    set_fields(r, status="done", flag_reason="", name="3D printing", use="shop", notes="3D printers.")
    r = room("Level 2", 22)
    set_fields(r, name="Large classroom", notes="A large classroom that also serves as a crit / pin-up space.")

    # general remarks, applied only where the owner left access blank, and marked as inferred
    rule_crit = "crit rooms (those behind the key card, and those on Level 2 and in the Basement) are for architecture students"
    rule_studio = "the studio needs card access: architecture students, professors or staff"
    rule_lecture = "the ground-floor lecture halls are more likely used by other students on campus"
    for i, r in rooms.items():
        if r.get("status") != "done" or r.get("access"):
            continue
        if r.get("use") == "crit":
            set_fields(r, access="arch_class", access_inferred=rule_crit)
        elif r.get("use") == "studio":
            set_fields(r, access="arch_all", access_inferred=rule_studio)
        elif r.get("use") == "class" and r.get("level") == "Level 1":
            set_fields(r, access="campus_class", access_inferred=rule_lecture)
    program["meta"]["updated"] = NOW
    program["meta"]["note"] = ("Room program authored by the owner: first in the viewer's PROGRAM window (2026-11-05 to 06), "
                               "since then by chat, applied with scripts in scripts/ (each entry names its source). "
                               "Keyed by Revit room id; the export is untouched.")
    with open(PATH, "w", encoding="utf-8") as f:
        json.dump(program, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print("applied; rooms with inferred access:", sum(1 for r in rooms.values() if r.get("access_inferred")))
    return 0


if __name__ == "__main__":
    sys.exit(main())

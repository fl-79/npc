"""One-off: the rooms the 2024 Architecture Program Report (APR24, CACB) names in Lasserre, compared with
the model's rooms, chat 2026-11-11. The owner: "if room 30 is the largest classroom with seats, it's
probably 202, adjust the model. At the same time, review the other rooms with the accreditation report."

Room 30 (Level 2, 50 m2) is a crit room with no seats in the model; the largest classroom with seats on
Level 2 is room 22 (111.5 m2, the owner's "large classroom that also serves as a crit / pin-up space"),
which is what the APR says of 202 ("felt ... suitable for pinning", "Ezo board for pin up", "increased
class capacity in room 202 to 60 students"). So the capacity goes to room 22: four chairs a table on
the 2.29 m tables instead of three (64 chairs in four rows of four tables; the APR's 60 is a capacity,
not a chair count). Room 30 stays a crit room used from its floor (owner, Q16).

The other APR rooms are cross-referenced in rooms.json as `apr_room` (the APR's number, the status
"inferred" where the match rests on use and position, the source), never in the room's name:
  301 / 309 (felt, projectors, screens, Ezo boards)  -> Level 3 crit rooms 4 (south) and 1 (north); which is
                                                       which is inferred from 303A (photo) sitting beside 4
  303A (photo documentation space for ARCH)          -> Level 3 room 5, Photography room
  202 (see above)                                    -> Level 2 room 22
  102 / 104 / 105 (UBC shared teaching rooms; 105 a digital teaching space, two lecture spaces) -> Level 1
                                                       rooms 12, 13, 15 (which is which unknown)
  Room 2 (the shop)                                  -> Basement 74, Workshop
  Room 5 (former thesis studio, now shared classroom and shop extension: work-benches, a projector, 3D
          printers in 2024, open 24/7; "across the hall" from the shop) -> Basement 75, Model assembly room
  Room 9 (the Materials Lab, former reading room, 1000+ sq ft, meetings, lectures, seminars, reviews)
                                                     -> Basement 70 or 77 (104 / 109 m2): candidates only, both
                                                       stay flagged
  402 (the main office and MArch program office, fourth floor) -> no match: Level 4 room 55 (34 m2, shared
                                                       desks) is the only candidate; Level 2 room 34 (162 m2)
                                                       is the placeholder admin office and stays flagged
Run once: python -I scripts/apply_chat_2026-11-11a.py
"""
import json
import os
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOMS = os.path.join(ROOT, "program", "rooms.json")
OBJECTS = os.path.join(ROOT, "program", "objects.json")
NOW = time.strftime("%Y-%m-%d %H:%M:%S")
SRC = "owner, chat 2026-11-11 (rooms reviewed against APR24)"
APR = "UBC SALA Architecture Program Report 2024 (CACB), physical resources and facilities projects 2019-2024"


def apr(number, status, reason):
    return {"number": number, "status": status, "source": APR, "reason": reason, "added": NOW}


def main():
    with open(ROOMS, encoding="utf-8") as f:
        program = json.load(f)
    R = program["rooms"]

    # Level 2 room 22 = APR 202
    r = R["1365005"]
    r["apr_room"] = apr("202", "inferred", "The APR's 202 is a held teaching room with felt pin-up walls, a projector and screen, Ezo boards and a class capacity raised to 60; room 22 is the large classroom that also serves as crit and pin-up space (owner, 2026-11-06), the largest classroom with seats on Level 2. The owner (2026-11-11): the largest classroom with seats is probably 202; adjust the model.")
    r["capacity"] = 60
    r["notes"] = (r.get("notes", "") + " 2026-11-11: taken as the APR's room 202 (capacity 60 students, APR24); the table rows now seat four a table, 64 chairs in four rows (objects O28), the APR's 60 being a capacity rather than a chair count.").strip()
    r["updated"] = NOW; r["source"] = SRC

    # Level 2 room 30: not 202
    r = R["1365029"]
    r["notes"] = (r.get("notes", "") + " 2026-11-11: checked against APR24 for the owner: not the APR's 202 (that is the large classroom 22); the APR names no other Level 2 teaching room, so room 30 stays a crit room used from its floor (owner, Q16).").strip()
    r["updated"] = NOW

    # Level 3 crit rooms 4 (south) and 1 (north) = 301 / 309; photo 5 = 303A
    R["1364442"]["apr_room"] = apr("301", "inferred", "301 and 309 are the APR's two held teaching rooms on the third floor (felt, projectors, screens, Ezo boards): the model's crit rooms 4 (south) and 1 (north). Which is which is inferred: the photo room 303A sits beside crit room 4, so the low numbers are at the south end.")
    R["1364433"]["apr_room"] = apr("309", "inferred", "See crit room 4: the north crit room is taken as 309 because 303A (the photo room) is beside the south one. To confirm from the door signs.")
    R["1364445"]["apr_room"] = apr("303A", "inferred", "APR24: 'Created new photo documentation space for ARCH program in room 303A'; the model's only photo room is Level 3 room 5, 2.5 by 2.5 m beside crit room 4.")
    for k in ("1364442", "1364433", "1364445"):
        R[k]["updated"] = NOW

    # Level 1 classrooms = 102 / 104 / 105 (which is which unknown)
    for k in ("1364831", "1364835", "1364841"):
        R[k]["apr_room"] = apr("102 / 104 / 105", "inferred", "APR24: UBC holdings on the first floor, 'a digital teaching space Rm 105 and two lecture spaces', rooms 102, 104 and 105, renovated 2018, bookable by SALA. The model's three Level 1 classrooms; which number is which is not known.")
        R[k]["updated"] = NOW

    # Basement: 74 = Room 2 (shop), 75 = Room 5; 70 / 77 candidates for Room 9
    R["1365264"]["apr_room"] = apr("2", "inferred", "APR24: the school's shop is 'located across the hall from Room 5 in Room 2'; the model's workshop 74 (146 m2) is the largest basement room and across the corridor from 75.")
    R["1365267"]["apr_room"] = apr("5", "inferred", "APR24 Action 2: Room 5, a former thesis studio, is now a shared classroom resource and extension of the shop with work-benches, a ceiling-mounted projector and (in 2024) 3D printers, clamps and brakes, open to students 24/7, across the hall from the shop. The model's model assembly room 75 (115 m2) is across the corridor from the workshop. Room 5C, a workspace for the shop across from it, has no match yet. The owner (2026-11-06): the 3D printers are now on Level 3 in room 6.")
    R["1365267"]["notes"] = (R["1365267"].get("notes", "") + " 2026-11-11: the APR's Room 5 (see apr_room) says work-benches, a projector and 24/7 access; the model's hours stay 'business' until the owner says otherwise.").strip()
    for k in ("1365264", "1365267"):
        R[k]["updated"] = NOW
    for k in ("1365251", "1365273"):
        r = R[k]
        r["flag_reason"] = "decide later; a candidate for the APR's Room 9, the SALA Materials Lab (the former reading room, 1000+ sq ft, 'capable of hosting lecture and seminar classes, meetings, and reviews'): 70 (104 m2) and 77 (109 m2) are the two basement rooms of that size (APR24, 2026-11-11)"
        r["updated"] = NOW

    # Level 4: 402 main office has no match; 55 the only candidate. Level 2 room 34 placeholder admin stays flagged.
    r = R["1365203"]
    r["notes"] = (r.get("notes", "") + " 2026-11-11: the school's main office and MArch program office are room 402 on the fourth floor (APR24, sala.ubc.ca); this 34 m2 shared office is the only Level 4 room larger than an individual office, so it is a candidate for 402. Not applied: the owner to confirm.").strip()
    r["updated"] = NOW
    r = R["1365041"]
    r["notes"] = (r.get("notes", "") + " 2026-11-11: APR24 puts the main office at 402 on the fourth floor, not on this floor; what this 162 m2 room is remains open (a placeholder admin office in the tool). The APR's 202 is the large classroom 22.").strip()
    r["updated"] = NOW

    program["meta"]["updated"] = NOW
    with open(ROOMS, "w", encoding="utf-8") as f:
        json.dump(program, f, indent=2, ensure_ascii=False)
        f.write("\n")

    # objects: room 22's table rows seat four a table
    with open(OBJECTS, encoding="utf-8") as f:
        objects = json.load(f)
    o28 = next(o for o in objects["objects"] if o["id"] == "O28")
    o28["placement"]["chairs_per_table"] = 4
    o28["placement"]["chair_size_m"] = [0.55, 0.68, 0.45]
    o28["placement"]["rows_wanted"] = 4
    o28["reason"] += " 2026-11-11: APR24 gives room 202's class capacity as 60 students; the owner takes the largest classroom with seats on Level 2 to be 202, so four chairs a table (0.55 m wide, lecture-dense) on the four rows of four tables: 64 chairs, within four of the APR's capacity. Five rows would leave no room to walk behind a row (the earlier note), so the rows stay four."
    o28["source"] = "owner, chat 2026-11-06 and 2026-11-11; APR24 (capacity 60)"
    objects["meta"]["updated"] = NOW
    with open(OBJECTS, "w", encoding="utf-8") as f:
        json.dump(objects, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print("room 22 as APR 202 (64 chairs); apr_room set on 1, 4, 5, 12, 13, 15, 22, 74, 75; 70/77/34/55 flagged with the APR candidates")
    return 0


if __name__ == "__main__":
    sys.exit(main())

"""One-off: Level 2 room 34, chat 2026-11-06. The owner: populate it like an academic administrative
office, as a placeholder, and note that. Use admin, access staff, a placeholder note and
activities; the pieces are program/objects.json O47. Run once: python -I scripts/apply_chat_2026-11-06q.py
"""
import json
import os
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "program", "rooms.json")
NOW = time.strftime("%Y-%m-%d %H:%M:%S")
SRC = "owner, chat 2026-11-06 (room 34 placeholder)"


def main():
    with open(PATH, encoding="utf-8") as f:
        program = json.load(f)
    r = program["rooms"]["1365041"]
    r["use"] = "admin"
    r["name"] = "Administrative office"  # placeholder flagged in the note and on the pieces, never in the name (owner)
    r["access"] = "staff"
    r["who"] = "administrative staff; students and faculty visiting the reception"
    r["placeholder"] = True
    r["notes"] = ("PLACEHOLDER (owner, 2026-11-06): populated like an academic administrative office until the real room is described: a "
                  "reception counter inside the east door, six workstations, a meeting table, shelving, a printer, a waiting bench in the "
                  "middle part, two desks in the south part. Nothing here is the owner's knowledge of the room.")
    r["activities"] = [
        {"kind": "office_work", "label": "Administrative work", "layout": "staff at the workstations", "uses": ["desk", "chair", "printer", "shelf"], "parameters": None, "pending": "staff count and hours (placeholder)", "source": SRC},
        {"kind": "reception", "label": "A visit to the reception", "layout": "a visitor at the counter, waiting on the bench when the receptionist is busy", "uses": ["counter", "chair", "seating"], "parameters": None, "pending": "how many visits a day and how long (placeholder)", "source": SRC},
        {"kind": "meeting", "label": "Meeting", "layout": "round the meeting table", "uses": ["table", "chair"], "parameters": None, "pending": "frequency and size (placeholder)", "source": SRC},
    ]
    r["objects"] = "program/objects.json (O47, placeholder set)"
    r["updated"] = NOW
    r["source"] = SRC
    program["meta"]["updated"] = NOW
    with open(PATH, "w", encoding="utf-8") as f:
        json.dump(program, f, indent=2, ensure_ascii=False)
        f.write("\n")
    print("room 34: admin placeholder")
    return 0


if __name__ == "__main__":
    sys.exit(main())

"""One-off: the Level 3 kitchen (room 9) and student lounge (room 10) from chat on 2026-11-06, the
second step of the object and activity pass. Notes and activities to program/rooms.json; the
objects (fridges, microwaves, kettle, coffee machine, beer taps, pew bench), the owner's kinds
for modelled pieces and the furniture rules went to program/objects.json; the model corrections
(the kitchen pass-through, the doorway without a leaf, the service shaft) to program/edits.json.
Run once: python -I scripts/apply_chat_2026-11-06d.py
"""
import json
import os
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "program", "rooms.json")
NOW = time.strftime("%Y-%m-%d %H:%M:%S")
SRC = "owner, chat 2026-11-06 (kitchen and lounge pass)"

ROOMS = {
    "1364793": {  # kitchen, room 9
        "name": "Kitchen",
        "notes": "Communal kitchen. Counters along both long walls (modelled); fridge in the north-east corner; sink in the "
                 "middle of the west counter (modelled); a microwave on each counter; kettles, a coffee machine and other "
                 "tabletop appliances. Communal, so not everyone uses them: many prefer a personal appliance. The door from "
                 "crit room 1 leads through a pass-through doorway (no panel) in the wall across the kitchen; the doorway to "
                 "the lounge has no panel either.",
        "activities": [
            {"kind": "prepare", "label": "Heat food, make a drink",
             "layout": "standing at the counters; one person per appliance, others wait",
             "uses": ["microwave", "kettle", "coffee_machine", "fridge", "sink"],
             "parameters": None,
             "pending": "the share of people who use the communal appliances rather than their own, and when (lunch, evenings)",
             "source": SRC},
            {"kind": "event_prep", "label": "Preparing Good Times / Waffle Times",
             "layout": None, "uses": ["counter", "fridge", "sink"], "parameters": None,
             "pending": "whether the food for the lounge events is made here, by whom and how long before", "source": SRC},
        ],
    },
    "1364796": {  # student lounge, room 10
        "notes": "Student lounge, a bay of the studio open to it on the south and part of the west. Good Times and Waffle "
                 "Times happen here. Fridge in the north-east corner. On the west side, against the full-height service "
                 "shaft, the bar: two beers on tap, a counter longer than the model shows, with the keg fridge at its south "
                 "end. A couch by the east glass with a coffee table in front (the model's 'Bench2'). Along the studio desks "
                 "on the south edge, church-pew benches with a high back against the desks. The doorway to the kitchen has no "
                 "panel (edits E1).",
        "activities": [
            {"kind": "good_times", "label": "Good Times",
             "layout": "food and drink from the bar; people stand, sit on the pews, the couch and the benches, and spill into the studio",
             "uses": ["bar", "beer_tap", "pew_bench", "seating", "coffee_table", "fridge"], "parameters": None,
             "pending": "what it is, how often and when, how many come, who may come, who serves", "source": SRC},
            {"kind": "waffle_times", "label": "Waffle Times",
             "layout": "food served; people eat standing, on the pews, the couch and the benches",
             "uses": ["pew_bench", "seating", "coffee_table", "counter"], "parameters": None,
             "pending": "how often and when, how many come, who may come, where the waffles are made and served from", "source": SRC},
            {"kind": "lounge", "label": "Everyday lounge use",
             "layout": "sit on the couch, the pews and the benches; eat, talk, rest",
             "uses": ["seating", "pew_bench", "coffee_table", "fridge"], "parameters": None,
             "pending": "typical numbers through the day; whether lunch is eaten here; music, screen", "source": SRC},
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
        print("%s room %s: %d activities, notes set" % (r["level"], r["number"], len(vals.get("activities", []))))
    program["meta"]["updated"] = NOW
    with open(PATH, "w", encoding="utf-8") as f:
        json.dump(program, f, indent=2, ensure_ascii=False)
        f.write("\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())

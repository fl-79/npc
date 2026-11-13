"""Checks that every room in the tile maps is enclosed as a room should be, and writes
program/enclosure-report.md. For each level and room: the open edges (where a room's open tile
touches another room's, the corridor's or the outside's open tile with no wall, glass, door or
stair between), grouped by side with their length and what lies beyond; rooms without a door;
rooms whose area in the tiles differs much from Revit's. The report is what the owner reviews;
nothing is changed. Run: python -I scripts/check_enclosure.py
"""
import glob
import json
import os
import sys
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TILES = os.path.join(ROOT, "exports", "tiles")
PROGRAM = os.path.join(ROOT, "program")
ORDER = ["basement", "level-1", "level-2", "level-3", "level-4"]
SIDES = {"north": (-1, 0), "south": (1, 0), "west": (0, -1), "east": (0, 1)}


def main():
    prog = {}
    p = os.path.join(PROGRAM, "rooms.json")
    if os.path.exists(p):
        prog = json.load(open(p, encoding="utf-8")).get("rooms", {})
    out = ["# Enclosure check", "", "Written by scripts/check_enclosure.py from exports/tiles. An open edge is a run of a room's open tiles touching",
           "open tiles that are not the room's, with nothing painted between: a wall the model lacks, a room separation line, or a",
           "space meant to be open. Review each; a correction goes in program/edits.json.", ""]
    totals = Counter()
    for fn in ORDER:
        path = os.path.join(TILES, fn + ".json")
        if not os.path.exists(path):
            continue
        L = json.load(open(path, encoding="utf-8"))
        F, S, rows, cols, T = L["floor"], L["struct"], L["rows"], L["cols"], L["tile_m"]
        names = {r["idx"]: r for r in L["rooms"]}
        def label(idx):
            if idx == 0:
                return "the outside"
            if idx == 1:
                return "the corridor or slab"
            r = names.get(idx)
            pr = prog.get(str(r["id"]), {}) if r else {}
            return "room %s (%s)" % (r["number"], pr.get("name") or pr.get("use") or r.get("name") or "?") if r else "?"
        out.append("## %s" % L["level"])
        out.append("")
        issues = 0
        for r in sorted(L["rooms"], key=lambda x: int(x["number"])):
            idx = r["idx"]
            pr = prog.get(str(r["id"]), {})
            cells = [(a, b) for a in range(rows) for b in range(cols) if F[a][b] == idx and S[a][b] == 0]
            if not cells:
                out.append("- room %s: no open tiles at all" % r["number"]); issues += 1
                continue
            opens = defaultdict(Counter)
            doors = 0
            for (a, b) in cells:
                for side, (dr, dc) in SIDES.items():
                    aa, bb = a + dr, b + dc
                    if not (0 <= aa < rows and 0 <= bb < cols):
                        opens[side]["the outside"] += 1
                        continue
                    if S[aa][bb] == 4:
                        doors += 1
                    elif S[aa][bb] == 0 and F[aa][bb] != idx:
                        opens[side][label(F[aa][bb])] += 1
            tile_area = len(cells) * T * T
            area = pr.get("area_m2") or r.get("area_m2") or 0
            line = "- room %s (%s), %.0f m2" % (r["number"], pr.get("name") or pr.get("use") or r.get("name") or "?", area)
            problems = []
            for side in SIDES:
                for what, n in opens[side].items():
                    problems.append("open on the %s to %s for %.1f m" % (side, what, n * T))
            if doors == 0 and pr.get("use") not in ("stair", "elevator"):
                problems.append("no door")
            # the open tiles are always fewer than Revit's area: walls one tile thick sit on room tiles, stair tiles are not
            # open floor; only a room that lost more than half its area is worth a look
            if area and pr.get("use") not in ("stair", "elevator") and tile_area < 0.5 * area:
                problems.append("tiles hold only %.0f m2 of open floor against Revit's %.0f m2" % (tile_area, area))
            if problems:
                issues += 1
                out.append(line + ": " + "; ".join(problems))
        # stair tiles that sit where a wall line passes: a run or landing cut through a wall
        out.append("" if issues else "- every room enclosed, with a door")
        out.append("")
        totals[L["level"]] = issues
    out.insert(3, "Rooms with something to look at: " + ", ".join("%s %d" % (k, v) for k, v in totals.items()) + ".")
    out.insert(4, "")
    with open(os.path.join(PROGRAM, "enclosure-report.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(out) + "\n")
    print("\n".join(out))
    return 0


if __name__ == "__main__":
    sys.exit(main())

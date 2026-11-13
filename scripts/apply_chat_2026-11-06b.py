"""One-off: the washroom naming scheme from chat on 2026-11-06. Every room with use `wc` is
named "Men's WR" or "Women's WR" when the gender is known from its name, and "WR" when not.
Run once: python -I scripts/apply_chat_2026-11-06b.py
"""
import json
import os
import re
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "program", "rooms.json")
NOW = time.strftime("%Y-%m-%d %H:%M:%S")


def main():
    with open(PATH, encoding="utf-8") as f:
        program = json.load(f)
    changed = []
    for i, r in program["rooms"].items():
        if r.get("use") != "wc":
            continue
        old = r.get("name") or ""
        if re.search(r"\bwomen|\bwomen's|\bfemale", old, re.I):
            new = "Women's WR"
        elif re.search(r"\bmen|\bmen's|\bmale", old, re.I):
            new = "Men's WR"
        else:
            new = "WR"
        if new != old:
            r["name"] = new
            r["updated"] = NOW
            r["source"] = "owner, chat 2026-11-06 (washroom naming scheme)"
            changed.append((r["level"], r["number"], old, new))
    program["meta"]["updated"] = NOW
    with open(PATH, "w", encoding="utf-8") as f:
        json.dump(program, f, indent=2, ensure_ascii=False)
        f.write("\n")
    for c in changed:
        print("%s room %s: %r -> %r" % c)
    return 0


if __name__ == "__main__":
    sys.exit(main())

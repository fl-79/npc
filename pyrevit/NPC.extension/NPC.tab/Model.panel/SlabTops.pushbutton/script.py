# -*- coding: utf-8 -*-
"""Slab Tops: sets the top of every wall and column that runs into a floor slab to the slab's
underside, and joins elements that continue through a slab so the slab cuts them. One
transaction, not saved; changes are listed in exports/fix-tops.json. The work is in
slabtops_impl.py beside this file; this wrapper writes exports/fixtops-error.txt on failure."""
__title__ = "Slab\nTops"
__author__ = "NPC tool"

import os
import traceback
from pyrevit import script

OUT_DIR = r"C:\Users\felic\OneDrive - UBC\2026-03 Fall\ARCH 540 Studio\05 Assignment 2 V2\Tool-V2\exports"
ERR = os.path.join(OUT_DIR, "fixtops-error.txt")
if not os.path.isdir(OUT_DIR):
    os.makedirs(OUT_DIR)
if os.path.exists(ERR):
    os.remove(ERR)

impl = script.get_bundle_file("slabtops_impl.py")
if not impl or not os.path.exists(impl):
    impl = os.path.join(script.get_script_path(), "slabtops_impl.py")
try:
    execfile(impl, globals())
except Exception:
    with open(ERR, "w") as f:
        f.write(traceback.format_exc())
    raise

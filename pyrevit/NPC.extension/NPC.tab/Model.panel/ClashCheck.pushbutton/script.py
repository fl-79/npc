# -*- coding: utf-8 -*-
"""Clash Check: finds pairs of model elements whose solids overlap and writes them with the
overlap volume to exports/collisions.json. The work is in clash_impl.py beside this file;
this wrapper writes exports/clash-error.txt with the traceback when the check fails."""
__title__ = "Clash\nCheck"
__author__ = "NPC tool"

import os
import traceback
from pyrevit import script

OUT_DIR = r"C:\Users\felic\OneDrive - UBC\2026-03 Fall\ARCH 540 Studio\05 Assignment 2 V2\Tool-V2\exports"
ERR = os.path.join(OUT_DIR, "clash-error.txt")
if not os.path.isdir(OUT_DIR):
    os.makedirs(OUT_DIR)
if os.path.exists(ERR):
    os.remove(ERR)

impl = script.get_bundle_file("clash_impl.py")
if not impl or not os.path.exists(impl):
    impl = os.path.join(script.get_script_path(), "clash_impl.py")
try:
    execfile(impl, globals())
except Exception:
    with open(ERR, "w") as f:
        f.write(traceback.format_exc())
    raise

# -*- coding: utf-8 -*-
"""Export Model: writes the open model's facts to exports/model.json and every element's
triangulated geometry to exports/meshes.json (metres, Project Base Point origin, +Y north).
The work is in export_impl.py beside this file; this wrapper writes exports/export-error.txt
with the traceback when the export fails, so a script waiting outside Revit can stop."""
__title__ = "Export\nModel"
__author__ = "NPC tool"

import os
import traceback
from pyrevit import script

OUT_DIR = r"C:\Users\felic\OneDrive - UBC\2026-03 Fall\ARCH 540 Studio\05 Assignment 2 V2\Tool-V2\exports"
ERR = os.path.join(OUT_DIR, "export-error.txt")
if not os.path.isdir(OUT_DIR):
    os.makedirs(OUT_DIR)
if os.path.exists(ERR):
    os.remove(ERR)

impl = script.get_bundle_file("export_impl.py")
if not impl or not os.path.exists(impl):
    impl = os.path.join(script.get_script_path(), "export_impl.py")
try:
    execfile(impl, globals())
except Exception:
    with open(ERR, "w") as f:
        f.write(traceback.format_exc())
    raise

#!/usr/bin/env python3
"""Test GLB dimension extraction"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

from backend.app.utils.glb_utils import extract_glb_dimensions
from pathlib import Path

glb_file = Path("backend/uploads/glb_files/room_1_1.glb")
if glb_file.exists():
    print(f"Testing GLB file: {glb_file}")
    print(f"File size: {glb_file.stat().st_size / 1024 / 1024:.2f} MB")
    dimensions = extract_glb_dimensions(glb_file)
    print(f"Extracted dimensions: {dimensions}")
else:
    print(f"GLB file not found: {glb_file}")
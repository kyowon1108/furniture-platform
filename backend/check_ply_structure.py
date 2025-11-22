#!/usr/bin/env python3
"""Check PLY file structure."""

import sys

from plyfile import PlyData

ply_path = "uploads/ply_files/project_6_room.ply"

try:
    ply = PlyData.read(ply_path)

    print("=== PLY File Structure ===")
    print(f"Elements: {[el.name for el in ply.elements]}")
    print()

    if "vertex" in [el.name for el in ply.elements]:
        vertex = ply["vertex"]
        print(f"Vertex count: {len(vertex.data):,}")
        print(f"Properties: {vertex.data.dtype.names}")
        print()

    if "face" in [el.name for el in ply.elements]:
        face = ply["face"]
        print(f"Face count: {len(face.data):,}")
        print("✅ This is a MESH (has faces)")
    else:
        print("❌ This is a POINT CLOUD (no faces)")
        print("Need to generate mesh from point cloud")

except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)

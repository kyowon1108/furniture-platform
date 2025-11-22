#!/usr/bin/env python3
"""Add default colors to project_5_Room_from_team.ply if it doesn't have colors."""

import numpy as np
from plyfile import PlyData, PlyElement

input_file = "uploads/ply_files/project_5_Room_from_team.ply"

print(f"Checking: {input_file}")

ply = PlyData.read(input_file)
vertex = ply["vertex"]

print(f"Vertices: {len(vertex.data):,}")
print(f"Properties: {vertex.data.dtype.names}")

# Check if has colors
has_colors = "red" in vertex.data.dtype.names or "r" in vertex.data.dtype.names

if has_colors:
    print("✅ Already has colors!")
else:
    print("❌ No colors found. Adding default gray color...")

    # Create new vertex data with colors
    new_vertices = []
    for v in vertex.data:
        # Add default gray color (180, 180, 180)
        new_vertices.append(
            (
                v["x"],
                v["y"],
                v["z"],
                v["nx"],
                v["ny"],
                v["nz"],
                180,
                180,
                180,  # Gray color
            )
        )

    # Create new dtype
    new_dtype = [
        ("x", "f4"),
        ("y", "f4"),
        ("z", "f4"),
        ("nx", "f4"),
        ("ny", "f4"),
        ("nz", "f4"),
        ("red", "u1"),
        ("green", "u1"),
        ("blue", "u1"),
    ]

    new_vertex_data = np.array(new_vertices, dtype=new_dtype)
    new_vertex_element = PlyElement.describe(new_vertex_data, "vertex")

    # Keep face data
    if "face" in [el.name for el in ply.elements]:
        face = ply["face"]
        new_ply = PlyData([new_vertex_element, face])
    else:
        new_ply = PlyData([new_vertex_element])

    # Save
    output_file = input_file.replace(".ply", "_with_colors.ply")
    new_ply.write(output_file)

    print(f"✅ Saved to: {output_file}")
    print("   You can replace the original if needed.")

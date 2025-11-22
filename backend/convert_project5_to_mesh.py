#!/usr/bin/env python3
"""Convert project_5_room.ply to mesh."""

import sys

sys.path.insert(0, ".")

from pathlib import Path

from app.utils.mesh_generator import point_cloud_to_mesh

input_file = "uploads/ply_files/project_5_room.ply"
output_file = "uploads/ply_files/project_5_room_mesh.ply"

print("Converting project_5_room.ply to mesh...")
print(f"Input: {input_file}")
print(f"Output: {output_file}")
print()

result = point_cloud_to_mesh(input_file, output_file, method="ball_pivoting")

if result["success"]:
    print("\n✅ Conversion successful!")
    print(f"   Input vertices: {result['input_vertices']:,}")
    print(f"   Output vertices: {result['output_vertices']:,}")
    print(f"   Faces: {result['faces']:,}")

    # Replace original with mesh
    print("\n🔄 Replacing original with mesh...")
    import shutil

    shutil.copy(input_file, "uploads/ply_files/project_5_room_pointcloud_backup.ply")
    shutil.move(output_file, input_file)
    print("✅ Done!")
else:
    print(f"\n❌ Conversion failed: {result['message']}")

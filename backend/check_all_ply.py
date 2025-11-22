#!/usr/bin/env python3
"""Check all PLY files in uploads directory."""

from pathlib import Path

from plyfile import PlyData

ply_dir = Path("uploads/ply_files")

for ply_file in sorted(ply_dir.glob("*.ply")):
    if "backup" in ply_file.name or "mesh_ball" in ply_file.name:
        continue

    print(f"\n{'=' * 60}")
    print(f"File: {ply_file.name}")
    print(f"Size: {ply_file.stat().st_size / (1024 * 1024):.1f} MB")
    print("=" * 60)

    try:
        ply = PlyData.read(str(ply_file))

        # Check elements
        elements = [el.name for el in ply.elements]
        print(f"Elements: {elements}")

        # Check vertex
        if "vertex" in elements:
            vertex = ply["vertex"]
            print(f"Vertices: {len(vertex.data):,}")
            print(f"Properties: {vertex.data.dtype.names}")

        # Check face
        if "face" in elements:
            face = ply["face"]
            print(f"Faces: {len(face.data):,}")
            print("✅ MESH")
        else:
            print("❌ POINT CLOUD (needs mesh generation)")

        # Check format
        with open(ply_file, "r", encoding="latin-1") as f:
            for line in f:
                if line.startswith("format"):
                    print(f"Format: {line.strip()}")
                    break
                if line.strip() == "end_header":
                    break

    except Exception as e:
        print(f"Error: {e}")

print(f"\n{'=' * 60}")

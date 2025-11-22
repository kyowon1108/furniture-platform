#!/usr/bin/env python3
"""
Test if PLY file has proper face data format for Three.js PLYLoader.
"""

import numpy as np
from plyfile import PlyData


def check_ply_face_format(ply_path):
    """Check PLY face data format."""
    print(f"Checking: {ply_path}")
    print("=" * 60)

    ply = PlyData.read(ply_path)

    # Check elements
    print(f"Elements: {[el.name for el in ply.elements]}")
    print()

    # Check vertex
    if "vertex" in [el.name for el in ply.elements]:
        vertex = ply["vertex"]
        print(f"Vertex count: {len(vertex.data):,}")
        print(f"Vertex properties: {vertex.data.dtype.names}")
        print()

    # Check face
    if "face" in [el.name for el in ply.elements]:
        face = ply["face"]
        print(f"Face count: {len(face.data):,}")
        print(f"Face properties: {face.data.dtype.names}")
        print()

        # Check face data structure
        if len(face.data) > 0:
            first_face = face.data[0]
            print("First face data:")
            for prop in face.data.dtype.names:
                value = first_face[prop]
                print(f"  {prop}: {value} (type: {type(value)})")

            # Check if vertex_indices exists
            if "vertex_indices" in face.data.dtype.names:
                print()
                print("✅ Has 'vertex_indices' property")
                indices = first_face["vertex_indices"]
                print(f"   First face indices: {indices}")
                print(f"   Indices type: {type(indices)}")
                print(f"   Indices length: {len(indices) if hasattr(indices, '__len__') else 'N/A'}")
            elif "vertex_index" in face.data.dtype.names:
                print()
                print("✅ Has 'vertex_index' property")
            else:
                print()
                print("❌ No standard vertex index property found!")
                print("   Three.js PLYLoader expects 'vertex_indices' or 'vertex_index'")

        print()
        print("Sample faces (first 3):")
        for i in range(min(3, len(face.data))):
            face_data = face.data[i]
            if "vertex_indices" in face.data.dtype.names:
                indices = face_data["vertex_indices"]
                print(f"  Face {i}: {indices}")
    else:
        print("❌ No face element found!")

    print()
    print("=" * 60)


if __name__ == "__main__":
    files = [
        "uploads/ply_files/project_6_room.ply",
        "uploads/ply_files/project_6_room_mesh_ball.ply",
    ]

    for f in files:
        try:
            check_ply_face_format(f)
            print()
        except Exception as e:
            print(f"Error: {e}")
            print()

#!/usr/bin/env python3
"""
Convert binary PLY to ASCII PLY for Three.js compatibility.
"""

from pathlib import Path

import open3d as o3d


def convert_to_ascii(input_path, output_path=None):
    """Convert binary PLY to ASCII PLY."""
    if output_path is None:
        output_path = input_path.replace(".ply", "_ascii.ply")

    print(f"Loading: {input_path}")
    mesh = o3d.io.read_triangle_mesh(input_path)

    print(f"Mesh info:")
    print(f"  Vertices: {len(mesh.vertices):,}")
    print(f"  Triangles: {len(mesh.triangles):,}")
    print(f"  Has vertex colors: {mesh.has_vertex_colors()}")
    print(f"  Has vertex normals: {mesh.has_vertex_normals()}")

    print(f"\nSaving to: {output_path} (ASCII format)")
    o3d.io.write_triangle_mesh(
        output_path,
        mesh,
        write_vertex_colors=True,
        write_vertex_normals=True,
        write_ascii=True,  # ASCII format
    )

    # Check file sizes
    input_size = Path(input_path).stat().st_size / (1024 * 1024)
    output_size = Path(output_path).stat().st_size / (1024 * 1024)

    print(f"\nFile sizes:")
    print(f"  Binary: {input_size:.1f} MB")
    print(f"  ASCII: {output_size:.1f} MB")
    print(f"  Ratio: {output_size / input_size:.1f}x")

    print("\n✅ Conversion complete!")
    return output_path


if __name__ == "__main__":
    # Convert the mesh file
    input_file = "uploads/ply_files/project_6_room.ply"
    output_file = "uploads/ply_files/project_6_room_ascii.ply"

    convert_to_ascii(input_file, output_file)

    # Replace the original with ASCII version
    print("\n🔄 Replacing original with ASCII version...")
    import shutil

    shutil.copy(input_file, "uploads/ply_files/project_6_room_binary_backup.ply")
    shutil.move(output_file, input_file)
    print("✅ Done!")

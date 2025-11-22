#!/usr/bin/env python3
"""
Test mesh generation from point cloud.
"""

import sys
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent))

from app.utils.mesh_generator import auto_mesh_conversion, point_cloud_to_mesh
from plyfile import PlyData


def test_mesh_generation():
    """Test mesh generation with different methods."""

    input_file = "uploads/ply_files/project_6_room.ply"

    if not Path(input_file).exists():
        print(f"❌ Input file not found: {input_file}")
        return

    # Check input file
    print("📊 Input File Analysis")
    print("=" * 50)
    ply = PlyData.read(input_file)
    vertex_count = len(ply["vertex"].data)
    has_faces = "face" in [el.name for el in ply.elements]

    print(f"Vertices: {vertex_count:,}")
    print(f"Has faces: {has_faces}")
    print(f"Properties: {ply['vertex'].data.dtype.names}")
    print()

    if has_faces:
        print("✅ Already a mesh! No conversion needed.")
        return

    # Test Poisson reconstruction
    print("🔄 Testing Poisson Reconstruction")
    print("=" * 50)
    output_poisson = "uploads/ply_files/project_6_room_mesh_poisson.ply"

    result = point_cloud_to_mesh(input_file, output_poisson, method="poisson")

    if result["success"]:
        print(f"✅ Success!")
        print(f"   Input vertices: {result['input_vertices']:,}")
        print(f"   Output vertices: {result['output_vertices']:,}")
        print(f"   Faces: {result['faces']:,}")
        print(f"   Output file: {output_poisson}")

        # Check file size
        input_size = Path(input_file).stat().st_size / (1024 * 1024)
        output_size = Path(output_poisson).stat().st_size / (1024 * 1024)
        print(f"   Input size: {input_size:.1f} MB")
        print(f"   Output size: {output_size:.1f} MB")
    else:
        print(f"❌ Failed: {result['message']}")

    print()

    # Test Ball Pivoting
    print("🔄 Testing Ball Pivoting Reconstruction")
    print("=" * 50)
    output_ball = "uploads/ply_files/project_6_room_mesh_ball.ply"

    result = point_cloud_to_mesh(input_file, output_ball, method="ball_pivoting")

    if result["success"]:
        print(f"✅ Success!")
        print(f"   Input vertices: {result['input_vertices']:,}")
        print(f"   Output vertices: {result['output_vertices']:,}")
        print(f"   Faces: {result['faces']:,}")
        print(f"   Output file: {output_ball}")

        # Check file size
        output_size = Path(output_ball).stat().st_size / (1024 * 1024)
        print(f"   Output size: {output_size:.1f} MB")
    else:
        print(f"❌ Failed: {result['message']}")

    print()
    print("🎉 Mesh generation test complete!")
    print()
    print("💡 Next steps:")
    print("   1. Check the generated mesh files in uploads/ply_files/")
    print("   2. Verify they render correctly in the frontend")
    print("   3. Compare Poisson vs Ball Pivoting quality")


if __name__ == "__main__":
    test_mesh_generation()

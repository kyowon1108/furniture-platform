"""
Convert Gaussian Splatting PLY to standard RGB PLY format.
"""

import sys

import numpy as np
from plyfile import PlyData, PlyElement


def convert_gaussian_to_rgb(input_path: str, output_path: str):
    """
    Convert Gaussian Splatting PLY (with f_dc_* attributes) to standard RGB PLY.

    Args:
        input_path: Path to input Gaussian Splatting PLY file
        output_path: Path to output standard RGB PLY file
    """
    print(f"Loading Gaussian Splatting PLY: {input_path}")
    ply = PlyData.read(input_path)
    vertex = ply["vertex"]

    print(f"Vertex count: {len(vertex.data)}")
    print(f"Properties: {vertex.data.dtype.names}")

    # Check if this is a Gaussian Splatting PLY
    if "f_dc_0" not in vertex.data.dtype.names:
        print("ERROR: This is not a Gaussian Splatting PLY file!")
        print("Missing f_dc_0, f_dc_1, f_dc_2 attributes")
        return False

    # SH_C0 constant for converting DC coefficients to RGB
    SH_C0 = 0.28209479177387814

    print("Converting SH DC coefficients to RGB...")

    rgb_vertices = []
    for i, v in enumerate(vertex.data):
        if i % 100000 == 0:
            print(f"  Processing vertex {i}/{len(vertex.data)}...")

        # Extract SH DC coefficients
        dc0 = v["f_dc_0"]
        dc1 = v["f_dc_1"]
        dc2 = v["f_dc_2"]

        # Convert to RGB [0, 1]
        r = 0.5 + SH_C0 * dc0
        g = 0.5 + SH_C0 * dc1
        b = 0.5 + SH_C0 * dc2

        # Clamp and convert to [0, 255]
        r = int(np.clip(r * 255, 0, 255))
        g = int(np.clip(g * 255, 0, 255))
        b = int(np.clip(b * 255, 0, 255))

        # Create new vertex with RGB colors
        rgb_vertices.append((v["x"], v["y"], v["z"], v["nx"], v["ny"], v["nz"], r, g, b))

    # Create new PLY with RGB colors
    new_vertex = np.array(
        rgb_vertices,
        dtype=[
            ("x", "f4"),
            ("y", "f4"),
            ("z", "f4"),
            ("nx", "f4"),
            ("ny", "f4"),
            ("nz", "f4"),
            ("red", "u1"),
            ("green", "u1"),
            ("blue", "u1"),
        ],
    )

    new_ply = PlyData([PlyElement.describe(new_vertex, "vertex")])

    print(f"Saving standard RGB PLY: {output_path}")
    new_ply.write(output_path)

    print("✅ Conversion complete!")
    print(f"Output file: {output_path}")
    return True


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python convert_gaussian_to_rgb.py <input.ply> <output.ply>")
        print("Example: python convert_gaussian_to_rgb.py gaussian.ply standard_rgb.ply")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]

    success = convert_gaussian_to_rgb(input_file, output_file)
    sys.exit(0 if success else 1)

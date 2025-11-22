"""
Utility functions for converting Gaussian Splatting PLY to standard RGB PLY format.
"""

import shutil
from pathlib import Path

import numpy as np
from plyfile import PlyData, PlyElement


def is_gaussian_splatting_ply(ply_data: PlyData) -> bool:
    """Check if PLY file is in Gaussian Splatting format."""
    if "vertex" not in ply_data:
        return False

    vertex = ply_data["vertex"]
    properties = vertex.data.dtype.names

    return "f_dc_0" in properties and "f_dc_1" in properties and "f_dc_2" in properties


def has_standard_colors(ply_data: PlyData) -> bool:
    """Check if PLY file already has standard RGB colors."""
    if "vertex" not in ply_data:
        return False

    vertex = ply_data["vertex"]
    properties = vertex.data.dtype.names

    has_rgb = "red" in properties and "green" in properties and "blue" in properties
    has_rgb_short = "r" in properties and "g" in properties and "b" in properties

    return has_rgb or has_rgb_short


def has_faces(ply: PlyData) -> bool:
    """Check if PLY file has face data (is a mesh)."""
    try:
        return "face" in [el.name for el in ply.elements] and len(ply["face"].data) > 0
    except:
        return False


def convert_gaussian_to_rgb(input_path: str, output_path: str, generate_mesh: bool = True) -> dict:
    """
    Convert Gaussian Splatting PLY to standard RGB PLY.

    Returns dict with:
        - success: bool
        - message: str
        - vertex_count: int
        - had_colors: bool
        - converted: bool
    """
    result = {"success": False, "message": "", "vertex_count": 0, "had_colors": False, "converted": False}

    try:
        ply = PlyData.read(input_path)
        vertex = ply["vertex"]

        vertex_count = len(vertex.data)
        result["vertex_count"] = vertex_count

        # Check if already has standard colors
        if has_standard_colors(ply):
            result["success"] = True
            result["had_colors"] = True
            result["message"] = "Already has standard RGB colors"
            shutil.copy(input_path, output_path)
            return result

        # Check if Gaussian Splatting format
        if not is_gaussian_splatting_ply(ply):
            result["message"] = "Not Gaussian Splatting, no colors to convert"
            shutil.copy(input_path, output_path)
            result["success"] = True
            return result

        # Convert Gaussian Splatting to RGB
        SH_C0 = 0.28209479177387814

        rgb_vertices = []
        for v in vertex.data:
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
        new_ply.write(output_path)

        result["success"] = True
        result["converted"] = True
        result["message"] = "Successfully converted Gaussian Splatting to RGB"

        # Generate mesh if requested and file is point cloud
        if generate_mesh and not has_faces(ply):
            try:
                from app.utils.mesh_generator import point_cloud_to_mesh

                mesh_output = output_path.replace(".ply", "_mesh.ply")
                # Use ball_pivoting as it's more reliable for large point clouds
                mesh_result = point_cloud_to_mesh(output_path, mesh_output, method="ball_pivoting")

                if mesh_result["success"]:
                    # Replace point cloud with mesh
                    Path(output_path).unlink()
                    Path(mesh_output).rename(output_path)

                    result["message"] += f" and generated mesh ({mesh_result['faces']:,} faces)"
                    result["mesh_generated"] = True
                    result["face_count"] = mesh_result["faces"]
                else:
                    result["message"] += f" (mesh generation failed: {mesh_result['message']})"
                    result["mesh_generated"] = False
            except Exception as e:
                result["message"] += f" (mesh generation error: {str(e)})"
                result["mesh_generated"] = False

        return result

    except Exception as e:
        result["message"] = f"Conversion error: {str(e)}"
        return result

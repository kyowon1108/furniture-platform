"""
Mesh generation utilities for converting point clouds to meshes.
"""

import logging
from pathlib import Path

import numpy as np
import open3d as o3d
from plyfile import PlyData, PlyElement

logger = logging.getLogger(__name__)


def point_cloud_to_mesh(input_path: str, output_path: str, method: str = "poisson") -> dict:
    """
    Convert a point cloud PLY file to a mesh PLY file.

    Args:
        input_path: Path to input PLY file (point cloud)
        output_path: Path to output PLY file (mesh)
        method: Reconstruction method ('poisson', 'ball_pivoting', or 'alpha_shape')

    Returns:
        dict with success status and metadata
    """
    try:
        logger.info(f"Loading point cloud from {input_path}")

        # Load PLY file with Open3D
        pcd = o3d.io.read_point_cloud(input_path)

        if not pcd.has_points():
            return {"success": False, "message": "No points found in PLY file"}

        vertex_count = len(pcd.points)
        logger.info(f"Loaded {vertex_count:,} points")

        # Check if normals exist
        if not pcd.has_normals():
            logger.info("Computing normals...")
            pcd.estimate_normals(
                search_param=o3d.geometry.KDTreeSearchParamHybrid(
                    radius=0.1,  # Search radius
                    max_nn=30,  # Maximum nearest neighbors
                )
            )
            # Orient normals consistently
            pcd.orient_normals_consistent_tangent_plane(k=15)

        logger.info(f"Using {method} reconstruction method")

        # Generate mesh based on method
        if method == "poisson":
            mesh, densities = poisson_reconstruction(pcd)
        elif method == "ball_pivoting":
            mesh = ball_pivoting_reconstruction(pcd)
        elif method == "alpha_shape":
            mesh = alpha_shape_reconstruction(pcd)
        else:
            return {"success": False, "message": f"Unknown method: {method}"}

        if mesh is None or not mesh.has_triangles():
            return {"success": False, "message": f"Mesh reconstruction failed with {method} method"}

        # Clean up mesh
        logger.info("Cleaning mesh...")
        mesh.remove_degenerate_triangles()
        mesh.remove_duplicated_triangles()
        mesh.remove_duplicated_vertices()
        mesh.remove_non_manifold_edges()

        # Compute vertex normals for smooth shading
        mesh.compute_vertex_normals()

        # Save mesh in ASCII format for better Three.js compatibility
        logger.info(f"Saving mesh to {output_path} (ASCII format)")
        o3d.io.write_triangle_mesh(
            output_path,
            mesh,
            write_vertex_colors=True,
            write_ascii=True,  # ASCII format for Three.js PLYLoader compatibility
        )

        face_count = len(mesh.triangles)
        vertex_count_out = len(mesh.vertices)

        logger.info(f"Mesh created: {vertex_count_out:,} vertices, {face_count:,} faces")

        return {
            "success": True,
            "message": f"Successfully created mesh with {method} method",
            "method": method,
            "input_vertices": vertex_count,
            "output_vertices": vertex_count_out,
            "faces": face_count,
        }

    except Exception as e:
        logger.error(f"Error converting point cloud to mesh: {e}")
        return {"success": False, "message": f"Error: {str(e)}"}


def poisson_reconstruction(pcd: o3d.geometry.PointCloud) -> tuple:
    """
    Poisson surface reconstruction.
    Best for: Smooth surfaces, watertight meshes
    """
    logger.info("Running Poisson reconstruction...")

    # Poisson reconstruction
    # depth: octree depth (higher = more detail, but slower)
    # width: target width of the finest level octree cells
    # scale: ratio between the diameter of the cube used for reconstruction and the diameter of the samples' bounding cube
    # linear_fit: if True, the reconstructor will use linear interpolation to estimate the positions of iso-vertices
    mesh, densities = o3d.geometry.TriangleMesh.create_from_point_cloud_poisson(
        pcd,
        depth=9,  # Octree depth (8-10 is good)
        width=0,  # Auto
        scale=1.1,  # Slightly larger than bounding box
        linear_fit=False,
    )

    # Remove low density vertices (noise)
    densities = np.asarray(densities)
    density_threshold = np.quantile(densities, 0.01)  # Remove bottom 1%
    vertices_to_remove = densities < density_threshold
    mesh.remove_vertices_by_mask(vertices_to_remove)

    return mesh, densities


def ball_pivoting_reconstruction(pcd: o3d.geometry.PointCloud) -> o3d.geometry.TriangleMesh:
    """
    Ball pivoting algorithm.
    Best for: Fast reconstruction, preserving details
    """
    logger.info("Running Ball Pivoting reconstruction...")

    # Estimate point cloud density
    distances = pcd.compute_nearest_neighbor_distance()
    avg_dist = np.mean(distances)

    # Ball radii (multiple scales for better coverage)
    radii = [avg_dist * r for r in [1.0, 2.0, 4.0]]

    logger.info(f"Using ball radii: {radii}")

    mesh = o3d.geometry.TriangleMesh.create_from_point_cloud_ball_pivoting(pcd, o3d.utility.DoubleVector(radii))

    return mesh


def alpha_shape_reconstruction(pcd: o3d.geometry.PointCloud) -> o3d.geometry.TriangleMesh:
    """
    Alpha shape reconstruction.
    Best for: Simple shapes, fast computation
    """
    logger.info("Running Alpha Shape reconstruction...")

    # Compute alpha value based on point cloud density
    distances = pcd.compute_nearest_neighbor_distance()
    avg_dist = np.mean(distances)
    alpha = avg_dist * 2.0

    logger.info(f"Using alpha value: {alpha}")

    mesh = o3d.geometry.TriangleMesh.create_from_point_cloud_alpha_shape(pcd, alpha)

    return mesh


def auto_mesh_conversion(input_path: str, output_path: str) -> dict:
    """
    Automatically try different methods and pick the best result.
    """
    logger.info("Auto mesh conversion: trying multiple methods...")

    methods = ["poisson", "ball_pivoting"]
    best_result = None
    best_face_count = 0

    for method in methods:
        result = point_cloud_to_mesh(input_path, output_path + f".{method}.ply", method)

        if result["success"]:
            face_count = result.get("faces", 0)
            logger.info(f"{method}: {face_count:,} faces")

            if face_count > best_face_count:
                best_face_count = face_count
                best_result = result
                best_method = method

    if best_result:
        # Rename best result to final output
        import shutil

        shutil.move(output_path + f".{best_method}.ply", output_path)

        # Clean up other files
        for method in methods:
            temp_file = output_path + f".{method}.ply"
            if Path(temp_file).exists() and method != best_method:
                Path(temp_file).unlink()

        logger.info(f"Best method: {best_method} with {best_face_count:,} faces")
        return best_result

    return {"success": False, "message": "All mesh reconstruction methods failed"}

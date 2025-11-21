"""Collision detection system for furniture placement validation."""

from typing import Any, Dict, List, Tuple

import numpy as np
from shapely.geometry import box as shapely_box


class BoundingBox:
    """
    Represents a 3D bounding box for furniture collision detection.
    Simplified to 2D (XZ plane) for collision checking.
    """

    def __init__(self, position: Dict, dimensions: Dict, rotation: Dict):
        """
        Initialize bounding box from furniture data.

        Args:
            position: Dict with x, y, z coordinates
            dimensions: Dict with width, height, depth
            rotation: Dict with x, y, z rotation angles (degrees)
        """
        self.position = np.array([position["x"], position["y"], position["z"]])
        self.dimensions = np.array([dimensions["width"], dimensions["height"], dimensions["depth"]])
        self.rotation_y = rotation.get("y", 0)  # Only Y-axis rotation considered

    def get_2d_box(self) -> Tuple[float, float, float, float]:
        """
        Get 2D bounding box on XZ plane (simplified AABB).

        Returns:
            Tuple of (x_min, z_min, x_max, z_max)
        """
        # Simplified: use AABB without rotation for now
        # For production, implement proper OBB rotation
        half_width = self.dimensions[0] / 2
        half_depth = self.dimensions[2] / 2

        x_min = self.position[0] - half_width
        x_max = self.position[0] + half_width
        z_min = self.position[2] - half_depth
        z_max = self.position[2] + half_depth

        return (x_min, z_min, x_max, z_max)


def check_collision(box1: BoundingBox, box2: BoundingBox) -> bool:
    """
    Check if two bounding boxes collide.

    Args:
        box1: First bounding box
        box2: Second bounding box

    Returns:
        True if boxes intersect, False otherwise
    """
    bounds1 = box1.get_2d_box()
    bounds2 = box2.get_2d_box()

    poly1 = shapely_box(*bounds1)
    poly2 = shapely_box(*bounds2)

    return poly1.intersects(poly2)


def check_boundary(box: BoundingBox, room_dimensions: Dict) -> bool:
    """
    Check if bounding box is within room boundaries.

    Args:
        box: Furniture bounding box
        room_dimensions: Dict with width, height, depth of room

    Returns:
        True if within bounds, False if out of bounds
    """
    bounds = box.get_2d_box()
    x_min, z_min, x_max, z_max = bounds

    # Room centered at origin
    room_half_width = room_dimensions["width"] / 2
    room_half_depth = room_dimensions["depth"] / 2

    # Check if furniture is within room boundaries
    if x_min < -room_half_width or x_max > room_half_width:
        return False
    if z_min < -room_half_depth or z_max > room_half_depth:
        return False

    return True


def validate_layout(furniture_state: Dict, room_dimensions: Dict) -> Dict[str, Any]:
    """
    Validate entire furniture layout for collisions and boundary violations.

    Args:
        furniture_state: Dict containing 'furnitures' list
        room_dimensions: Dict with width, height, depth

    Returns:
        Dict with validation results:
        - valid: bool
        - collisions: List of collision pairs
        - out_of_bounds: List of furniture IDs out of bounds
    """
    furnitures = furniture_state.get("furnitures", [])
    collisions = []
    out_of_bounds = []

    # Create bounding boxes for all furniture
    boxes = []
    for furniture in furnitures:
        try:
            box = BoundingBox(furniture["position"], furniture["dimensions"], furniture["rotation"])
            boxes.append((furniture["id"], box))
        except (KeyError, TypeError) as e:
            # Skip invalid furniture data
            continue

    # Check boundary violations
    for furniture_id, box in boxes:
        if not check_boundary(box, room_dimensions):
            out_of_bounds.append(furniture_id)

    # Check collisions (O(n²) - acceptable for small n)
    for i in range(len(boxes)):
        for j in range(i + 1, len(boxes)):
            id1, box1 = boxes[i]
            id2, box2 = boxes[j]

            if check_collision(box1, box2):
                collisions.append({"id1": id1, "id2": id2})

    valid = len(collisions) == 0 and len(out_of_bounds) == 0

    return {"valid": valid, "collisions": collisions, "out_of_bounds": out_of_bounds}

"""Tests for collision detection system."""

import pytest
from app.core.collision import (
    BoundingBox,
    check_boundary,
    check_collision,
    validate_layout,
)


def test_bounding_box_creation():
    """Test BoundingBox initialization."""
    position = {"x": 0, "y": 0, "z": 0}
    dimensions = {"width": 2, "height": 1, "depth": 3}
    rotation = {"x": 0, "y": 0, "z": 0}

    box = BoundingBox(position, dimensions, rotation)

    assert box.position[0] == 0
    assert box.dimensions[0] == 2
    assert box.rotation_y == 0


def test_collision_detection():
    """Test collision between two overlapping boxes."""
    # Box 1 at origin
    box1 = BoundingBox({"x": 0, "y": 0, "z": 0}, {"width": 2, "height": 1, "depth": 2}, {"x": 0, "y": 0, "z": 0})

    # Box 2 overlapping with box 1
    box2 = BoundingBox({"x": 1, "y": 0, "z": 1}, {"width": 2, "height": 1, "depth": 2}, {"x": 0, "y": 0, "z": 0})

    assert check_collision(box1, box2) is True


def test_no_collision():
    """Test no collision between separated boxes."""
    # Box 1 at origin
    box1 = BoundingBox({"x": 0, "y": 0, "z": 0}, {"width": 2, "height": 1, "depth": 2}, {"x": 0, "y": 0, "z": 0})

    # Box 2 far away
    box2 = BoundingBox({"x": 10, "y": 0, "z": 10}, {"width": 2, "height": 1, "depth": 2}, {"x": 0, "y": 0, "z": 0})

    assert check_collision(box1, box2) is False


def test_boundary_check_inside():
    """Test furniture within room boundaries."""
    box = BoundingBox({"x": 0, "y": 0, "z": 0}, {"width": 2, "height": 1, "depth": 2}, {"x": 0, "y": 0, "z": 0})

    room_dimensions = {"width": 10, "height": 3, "depth": 10}

    assert check_boundary(box, room_dimensions) is True


def test_boundary_check_outside():
    """Test furniture outside room boundaries."""
    box = BoundingBox({"x": 10, "y": 0, "z": 10}, {"width": 2, "height": 1, "depth": 2}, {"x": 0, "y": 0, "z": 0})

    room_dimensions = {"width": 10, "height": 3, "depth": 10}

    assert check_boundary(box, room_dimensions) is False


def test_validate_layout_valid():
    """Test validation of valid layout."""
    furniture_state = {
        "furnitures": [
            {
                "id": "furniture1",
                "position": {"x": 0, "y": 0, "z": 0},
                "dimensions": {"width": 2, "height": 1, "depth": 2},
                "rotation": {"x": 0, "y": 0, "z": 0},
            },
            {
                "id": "furniture2",
                "position": {"x": 5, "y": 0, "z": 5},
                "dimensions": {"width": 2, "height": 1, "depth": 2},
                "rotation": {"x": 0, "y": 0, "z": 0},
            },
        ]
    }

    room_dimensions = {"width": 20, "height": 3, "depth": 20}

    result = validate_layout(furniture_state, room_dimensions)

    assert result["valid"] is True
    assert len(result["collisions"]) == 0
    assert len(result["out_of_bounds"]) == 0


def test_validate_layout_with_collision():
    """Test validation detects collisions."""
    furniture_state = {
        "furnitures": [
            {
                "id": "furniture1",
                "position": {"x": 0, "y": 0, "z": 0},
                "dimensions": {"width": 2, "height": 1, "depth": 2},
                "rotation": {"x": 0, "y": 0, "z": 0},
            },
            {
                "id": "furniture2",
                "position": {"x": 0.5, "y": 0, "z": 0.5},
                "dimensions": {"width": 2, "height": 1, "depth": 2},
                "rotation": {"x": 0, "y": 0, "z": 0},
            },
        ]
    }

    room_dimensions = {"width": 20, "height": 3, "depth": 20}

    result = validate_layout(furniture_state, room_dimensions)

    assert result["valid"] is False
    assert len(result["collisions"]) == 1
    assert result["collisions"][0]["id1"] == "furniture1"
    assert result["collisions"][0]["id2"] == "furniture2"


def test_validate_layout_out_of_bounds():
    """Test validation detects out of bounds furniture."""
    furniture_state = {
        "furnitures": [
            {
                "id": "furniture1",
                "position": {"x": 15, "y": 0, "z": 15},
                "dimensions": {"width": 2, "height": 1, "depth": 2},
                "rotation": {"x": 0, "y": 0, "z": 0},
            }
        ]
    }

    room_dimensions = {"width": 10, "height": 3, "depth": 10}

    result = validate_layout(furniture_state, room_dimensions)

    assert result["valid"] is False
    assert len(result["out_of_bounds"]) == 1
    assert result["out_of_bounds"][0] == "furniture1"

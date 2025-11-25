"""
GLB file utilities for extracting dimensions and metadata.
"""

from pathlib import Path
import struct
import json
import logging
from typing import Dict, Optional
import numpy as np

logger = logging.getLogger(__name__)


def extract_glb_dimensions(file_path: Path) -> Dict[str, float]:
    """
    Extract bounding box dimensions from GLB file.

    This function parses the GLB file to find vertex positions
    and calculates the bounding box dimensions.

    Args:
        file_path: Path to the GLB file

    Returns:
        Dictionary with width, height, and depth dimensions in meters
    """
    try:
        # Try using trimesh if available (more robust)
        try:
            import trimesh
            mesh = trimesh.load(str(file_path))
            bounds = mesh.bounds  # [[min_x, min_y, min_z], [max_x, max_y, max_z]]

            width = float(bounds[1][0] - bounds[0][0])
            height = float(bounds[1][1] - bounds[0][1])
            depth = float(bounds[1][2] - bounds[0][2])

            logger.info(f"Extracted dimensions using trimesh: {width}x{height}x{depth}")

            return {
                'width': round(width, 2),
                'height': round(height, 2),
                'depth': round(depth, 2)
            }
        except ImportError:
            logger.warning("trimesh not installed, falling back to manual parsing")
            # Fall through to manual parsing
        except Exception as e:
            logger.warning(f"trimesh failed to load GLB: {e}, falling back to manual parsing")
            # Fall through to manual parsing

        # Manual GLB parsing as fallback
        return parse_glb_manually(file_path)

    except Exception as e:
        logger.error(f"Failed to extract GLB dimensions: {e}")
        # Return default dimensions
        return {
            'width': 5.0,
            'height': 3.0,
            'depth': 4.0
        }


def parse_glb_manually(file_path: Path) -> Dict[str, float]:
    """
    Manually parse GLB file to extract dimensions.

    GLB format:
    - 12 bytes: header
    - 8 bytes: JSON chunk header
    - N bytes: JSON chunk
    - 8 bytes: BIN chunk header
    - N bytes: BIN chunk (contains vertex data)
    """
    try:
        with open(file_path, 'rb') as f:
            # Read GLB header (12 bytes)
            magic = f.read(4)
            if magic != b'glTF':
                raise ValueError("Not a valid GLB file")

            version = struct.unpack('<I', f.read(4))[0]
            length = struct.unpack('<I', f.read(4))[0]

            # Read JSON chunk header (8 bytes)
            json_chunk_length = struct.unpack('<I', f.read(4))[0]
            json_chunk_type = f.read(4)

            if json_chunk_type != b'JSON':
                raise ValueError("Invalid GLB format: Expected JSON chunk")

            # Read JSON chunk
            json_data = json.loads(f.read(json_chunk_length))

            # Try to find accessor for POSITION attribute
            dimensions = extract_dimensions_from_gltf_json(json_data)

            if dimensions:
                return dimensions

            # If no dimensions found in JSON, return defaults
            logger.warning("Could not extract dimensions from GLB JSON")
            return {
                'width': 5.0,
                'height': 3.0,
                'depth': 4.0
            }

    except Exception as e:
        logger.error(f"Manual GLB parsing failed: {e}")
        return {
            'width': 5.0,
            'height': 3.0,
            'depth': 4.0
        }


def extract_dimensions_from_gltf_json(json_data: dict) -> Optional[Dict[str, float]]:
    """
    Extract dimensions from glTF JSON data by looking at accessor bounds.
    """
    try:
        # Look for POSITION accessor bounds
        if 'accessors' in json_data:
            for accessor in json_data['accessors']:
                if 'min' in accessor and 'max' in accessor:
                    min_vals = accessor['min']
                    max_vals = accessor['max']

                    if len(min_vals) >= 3 and len(max_vals) >= 3:
                        width = float(max_vals[0] - min_vals[0])
                        height = float(max_vals[1] - min_vals[1])
                        depth = float(max_vals[2] - min_vals[2])

                        # Skip if dimensions are too small (probably not the room mesh)
                        if width > 0.1 and height > 0.1 and depth > 0.1:
                            logger.info(f"Found dimensions in accessor: {width}x{height}x{depth}")
                            return {
                                'width': round(width, 2),
                                'height': round(height, 2),
                                'depth': round(depth, 2)
                            }

        # Alternative: Look at scene bounds if available
        if 'scenes' in json_data and 'extras' in json_data:
            extras = json_data.get('extras', {})
            if 'dimensions' in extras:
                dims = extras['dimensions']
                return {
                    'width': float(dims.get('width', 5.0)),
                    'height': float(dims.get('height', 3.0)),
                    'depth': float(dims.get('depth', 4.0))
                }

        return None

    except Exception as e:
        logger.error(f"Error extracting dimensions from glTF JSON: {e}")
        return None


def validate_glb_file(file_path: Path) -> bool:
    """
    Validate that the file is a valid GLB file.

    Args:
        file_path: Path to the GLB file

    Returns:
        True if valid GLB file, False otherwise
    """
    try:
        with open(file_path, 'rb') as f:
            magic = f.read(4)
            return magic == b'glTF'
    except Exception:
        return False
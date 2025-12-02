/**
 * Geometry utility functions for furniture placement and collision detection
 */

import type { Dimensions3D } from '@/types/furniture';

/**
 * Calculate the bounding box dimensions after rotating around Y-axis
 * This is critical for collision detection when furniture is rotated
 *
 * @param dimensions - Original dimensions (width, height, depth)
 * @param rotationY - Rotation angle in radians around Y-axis
 * @returns Rotated bounding box dimensions
 */
export function getRotatedDimensions(
  dimensions: Dimensions3D,
  rotationY: number
): Dimensions3D {
  // Normalize rotation to 0-360 degrees
  const degrees = ((rotationY * 180) / Math.PI) % 360;
  const normalizedDegrees = degrees < 0 ? degrees + 360 : degrees;

  // For 90 and 270 degrees, width and depth are swapped
  // For 0 and 180 degrees, dimensions stay the same
  // For other angles, calculate bounding box

  const is90 = Math.abs(normalizedDegrees - 90) < 1 || Math.abs(normalizedDegrees - 270) < 1;
  const is180 = Math.abs(normalizedDegrees - 180) < 1;
  const is0 = Math.abs(normalizedDegrees) < 1 || Math.abs(normalizedDegrees - 360) < 1;

  if (is90) {
    // 90 or 270 degrees: swap width and depth
    return {
      width: dimensions.depth,
      height: dimensions.height,
      depth: dimensions.width
    };
  } else if (is0 || is180) {
    // 0 or 180 degrees: no change
    return {
      width: dimensions.width,
      height: dimensions.height,
      depth: dimensions.depth
    };
  } else {
    // Other angles: calculate bounding box
    const radians = Math.abs(rotationY);
    const sin = Math.abs(Math.sin(radians));
    const cos = Math.abs(Math.cos(radians));

    const rotatedWidth = dimensions.width * cos + dimensions.depth * sin;
    const rotatedDepth = dimensions.width * sin + dimensions.depth * cos;

    return {
      width: rotatedWidth,
      height: dimensions.height,
      depth: rotatedDepth
    };
  }
}

/**
 * Check if two axis-aligned bounding boxes overlap on the XZ plane
 *
 * @param box1 - First bounding box
 * @param box2 - Second bounding box
 * @returns Object with overlap information
 */
export function checkXZOverlap(
  box1: { minX: number; maxX: number; minZ: number; maxZ: number },
  box2: { minX: number; maxX: number; minZ: number; maxZ: number }
): { overlapX: number; overlapZ: number; hasOverlap: boolean } {
  const overlapX = Math.min(box1.maxX, box2.maxX) - Math.max(box1.minX, box2.minX);
  const overlapZ = Math.min(box1.maxZ, box2.maxZ) - Math.max(box1.minZ, box2.minZ);

  return {
    overlapX,
    overlapZ,
    hasOverlap: overlapX > 0 && overlapZ > 0
  };
}

/**
 * Check if two Y-axis ranges overlap
 *
 * @param range1 - First range { min, max }
 * @param range2 - Second range { min, max }
 * @returns true if ranges overlap
 */
export function checkYOverlap(
  range1: { min: number; max: number },
  range2: { min: number; max: number }
): boolean {
  return !(range1.max < range2.min || range1.min > range2.max);
}

/**
 * Calculate the AABB (Axis-Aligned Bounding Box) for furniture
 *
 * @param position - Center position
 * @param dimensions - Original dimensions
 * @param rotationY - Rotation in radians
 * @returns Bounding box coordinates
 */
export function calculateFurnitureAABB(
  position: { x: number; z: number },
  dimensions: Dimensions3D,
  rotationY: number
): { minX: number; maxX: number; minZ: number; maxZ: number } {
  const rotatedDims = getRotatedDimensions(dimensions, rotationY);
  const halfWidth = rotatedDims.width / 2;
  const halfDepth = rotatedDims.depth / 2;

  return {
    minX: position.x - halfWidth,
    maxX: position.x + halfWidth,
    minZ: position.z - halfDepth,
    maxZ: position.z + halfDepth
  };
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Convert degrees to radians
 */
export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Convert radians to degrees
 */
export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

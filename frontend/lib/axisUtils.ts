import * as THREE from 'three';

/**
 * Axis orientation utilities for 3D models
 * Handles conversion between different coordinate systems
 */

export type AxisOrientation = 'Y-up' | 'Z-up' | 'X-up';

/**
 * Detect the likely axis orientation of a 3D model based on its bounding box
 * Uses multiple heuristics to determine the most likely "up" axis
 */
export function detectAxisOrientation(boundingBox: THREE.Box3): AxisOrientation {
  const size = new THREE.Vector3();
  boundingBox.getSize(size);
  
  console.log('🔍 Detecting axis orientation from bounding box:', {
    x: size.x.toFixed(2),
    y: size.y.toFixed(2),
    z: size.z.toFixed(2)
  });
  
  // For room scans, we need to identify which axis is the height (vertical)
  // Typically, room scans have:
  // - Two large dimensions (floor width and depth)
  // - One small dimension (ceiling height)
  
  // Strategy: The smallest dimension is likely the height
  // - If Z is smallest → Model is already Y-up (correct) → No rotation
  // - If Y is smallest → Model is Z-up (wrong) → Need -90° X rotation
  // - If X is smallest → Model is X-up (rare) → Need 90° Z rotation
  
  const minDim = Math.min(size.x, size.y, size.z);
  const maxDim = Math.max(size.x, size.y, size.z);
  
  console.log('Dimension analysis:', {
    minDim: minDim.toFixed(2),
    maxDim: maxDim.toFixed(2),
    ratio: (maxDim / minDim).toFixed(2),
    isXSmallest: size.x === minDim,
    isYSmallest: size.y === minDim,
    isZSmallest: size.z === minDim
  });
  
  // Only apply rotation if there's a clear difference (ratio > 1.3)
  const threshold = 1.3;
  
  // If Z is the smallest dimension → Already Y-up (correct)
  if (size.z === minDim && maxDim / minDim > threshold) {
    console.log('✅ Detected: Y-up (Z is smallest = height, correct orientation)');
    return 'Y-up';
  }
  
  // If Y is the smallest dimension → Z-up (needs rotation)
  if (size.y === minDim && maxDim / minDim > threshold) {
    console.log('✅ Detected: Z-up (Y is smallest = height, needs -90° X rotation)');
    return 'Z-up';
  }
  
  // If X is the smallest dimension → X-up (rare, needs rotation)
  if (size.x === minDim && maxDim / minDim > threshold) {
    console.log('✅ Detected: X-up (X is smallest = height, needs 90° Z rotation)');
    return 'X-up';
  }
  
  // If dimensions are similar (cube-like), default to Y-up
  console.log('⚠️ Dimensions are similar (ratio < threshold), defaulting to Y-up (no rotation)');
  return 'Y-up';
}

/**
 * Create a rotation matrix to convert from source orientation to Y-up (Three.js standard)
 */
export function getAxisCorrectionRotation(sourceOrientation: AxisOrientation): THREE.Euler {
  switch (sourceOrientation) {
    case 'Z-up':
      // Rotate -90 degrees around X axis to convert Z-up to Y-up
      return new THREE.Euler(-Math.PI / 2, 0, 0, 'XYZ');
    
    case 'X-up':
      // Rotate 90 degrees around Z axis to convert X-up to Y-up
      return new THREE.Euler(0, 0, Math.PI / 2, 'XYZ');
    
    case 'Y-up':
    default:
      // No rotation needed
      return new THREE.Euler(0, 0, 0, 'XYZ');
  }
}

/**
 * Apply axis correction to a Three.js Object3D
 * Automatically detects orientation and applies correction
 */
export function applyAxisCorrection(
  object: THREE.Object3D,
  forceOrientation?: AxisOrientation
): AxisOrientation {
  // Compute bounding box
  const box = new THREE.Box3().setFromObject(object);
  
  // Detect or use forced orientation
  const detectedOrientation = forceOrientation || detectAxisOrientation(box);
  
  console.log('🔄 Applying axis correction:', {
    detected: detectedOrientation,
    forced: forceOrientation || 'auto'
  });
  
  // Apply rotation
  const rotation = getAxisCorrectionRotation(detectedOrientation);
  object.rotation.copy(rotation);
  
  return detectedOrientation;
}

/**
 * Apply axis correction to a BufferGeometry
 * This modifies the geometry directly (more efficient than rotating the mesh)
 */
export function applyAxisCorrectionToGeometry(
  geometry: THREE.BufferGeometry,
  forceOrientation?: AxisOrientation
): AxisOrientation {
  // Compute bounding box
  geometry.computeBoundingBox();
  if (!geometry.boundingBox) {
    console.warn('⚠️ Could not compute bounding box for geometry');
    return 'Y-up';
  }
  
  // Detect or use forced orientation
  const detectedOrientation = forceOrientation || detectAxisOrientation(geometry.boundingBox);
  
  console.log('🔄 Applying axis correction to geometry:', {
    detected: detectedOrientation,
    forced: forceOrientation || 'auto'
  });
  
  // Create rotation matrix
  const rotation = getAxisCorrectionRotation(detectedOrientation);
  const matrix = new THREE.Matrix4().makeRotationFromEuler(rotation);
  
  // Apply rotation to geometry
  geometry.applyMatrix4(matrix);
  
  // Recompute bounding box and normals
  geometry.computeBoundingBox();
  geometry.computeVertexNormals();
  
  return detectedOrientation;
}

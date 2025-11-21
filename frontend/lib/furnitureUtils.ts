/**
 * Utility functions for furniture positioning and calculations
 */

import type { FurnitureType } from '@/types/furniture';

/**
 * Get the Y offset for furniture to sit on the ground
 * This accounts for different furniture designs where the pivot point
 * may not be at the bottom
 */
export function getGroundOffset(type: FurnitureType, height: number): number {
  switch (type) {
    case 'bed':
      // Bed legs are 15% of height, mattress starts there
      return height * 0.15;
    
    case 'chair':
      // Chair legs are 40% of height
      return 0;
    
    case 'desk':
    case 'table':
      // Tables sit on legs
      return 0;
    
    case 'wardrobe':
      // Wardrobe sits directly on ground
      return height / 2;
    
    case 'sofa':
      // Sofa has a small base
      return height * 0.2;
    
    case 'shelf':
      // Shelf sits on ground
      return height / 2;
    
    default:
      return height / 2;
  }
}

/**
 * Calculate the actual Y position for furniture to be on the ground
 */
export function calculateGroundPosition(type: FurnitureType, height: number): number {
  return getGroundOffset(type, height);
}

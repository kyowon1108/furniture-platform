/**
 * Optimized texture atlas generation based on make_room_glb approach
 * This significantly reduces GLB file size by merging textures per wall
 */

import * as THREE from 'three';

interface TileInfo {
  tileKey: string;
  x: number;
  y: number;
  textureUrl?: string;
  rotation?: number;
}

interface WallGroup {
  tiles: TileInfo[];
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

interface MergedTextureResult {
  texture: string; // base64 data URL
  group: WallGroup;
}

/**
 * Compress image to reduce file size
 */
async function compressImage(imageUrl: string, quality: number = 0.8, maxSize: number = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Limit size to maxSize
      let width = img.width;
      let height = img.height;

      if (width > maxSize || height > maxSize) {
        const scale = Math.min(maxSize / width, maxSize / height);
        width = Math.floor(width * scale);
        height = Math.floor(height * scale);
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to JPEG with quality setting
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const reader = new FileReader();
            reader.onload = () => {
              resolve(reader.result as string);
            };
            reader.readAsDataURL(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = imageUrl;
  });
}

/**
 * Group tiles by wall surface for texture merging
 */
export function groupTilesByWall(scene: THREE.Scene): Record<string, WallGroup> {
  const wallGroups: Record<string, WallGroup> = {
    'wall-front': { tiles: [], minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
    'wall-back': { tiles: [], minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
    'wall-left': { tiles: [], minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
    'wall-right': { tiles: [], minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
    'wall-inner': { tiles: [], minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
    'floor': { tiles: [], minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  };

  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh && child.userData.tileKey) {
      const tileKey = child.userData.tileKey;
      const mesh = child as THREE.Mesh;
      const material = mesh.material as THREE.MeshStandardMaterial;

      // Skip tiles without textures
      if (!material.map || !material.map.image) continue;

      console.log('Processing tile for atlas:', tileKey);

      // Parse tile information
      const parts = tileKey.split('-');
      let groupKey = '';
      let x = 0, y = 0;
      let rotation = 0;

      if (tileKey.startsWith('floor-')) {
        groupKey = 'floor';
        x = parseInt(parts[1]) || 0;
        y = parseInt(parts[2]) || 0; // z coordinate for floor
      } else if (tileKey.startsWith('wall-')) {
        const wallType = parts[1];

        // Determine wall group and rotation
        if (wallType === 'front') {
          groupKey = 'wall-front';
        } else if (wallType === 'back') {
          groupKey = 'wall-back';
        } else if (wallType === 'left') {
          groupKey = 'wall-left';
          rotation = Math.PI / 2; // 90 degrees for left wall
        } else if (wallType === 'right') {
          groupKey = 'wall-right';
          rotation = -Math.PI / 2; // -90 degrees for right wall
        } else if (wallType === 'inner') {
          groupKey = 'wall-inner';
        }

        // Extract coordinates
        const coordinateIndex = parts.length - 2;
        x = parseInt(parts[coordinateIndex]) || 0;
        y = parseInt(parts[parts.length - 1]) || 0;
      }

      if (groupKey && wallGroups[groupKey]) {
        const group = wallGroups[groupKey];

        // Extract texture URL
        let textureUrl: string | undefined;
        if (material.map.image instanceof HTMLImageElement) {
          textureUrl = material.map.image.src;
        } else if (material.map.source?.data) {
          // Handle data URLs or other formats
          textureUrl = material.map.source.data.src || material.map.source.data;
        }

        if (textureUrl) {
          group.tiles.push({ tileKey, x, y, textureUrl, rotation });
          group.minX = Math.min(group.minX, x);
          group.maxX = Math.max(group.maxX, x);
          group.minY = Math.min(group.minY, y);
          group.maxY = Math.max(group.maxY, y);
        }
      }
    }
  });

  // Clean up empty groups
  Object.keys(wallGroups).forEach(key => {
    if (wallGroups[key].tiles.length === 0) {
      delete wallGroups[key];
    }
  });

  return wallGroups;
}

/**
 * Merge textures for a wall group into a single atlas
 */
export async function mergeWallTextures(
  group: WallGroup,
  groupKey: string,
  tileSize: number = 512
): Promise<string | null> {
  if (group.tiles.length === 0) return null;

  const width = (group.maxX - group.minX + 1) * tileSize;
  const height = (group.maxY - group.minY + 1) * tileSize;

  // Canvas size limit (max 4096px for compatibility)
  const maxCanvasSize = 4096;
  let finalTileSize = tileSize;

  if (width > maxCanvasSize || height > maxCanvasSize) {
    const scale = Math.min(maxCanvasSize / width, maxCanvasSize / height);
    finalTileSize = Math.floor(tileSize * scale);
  }

  const finalWidth = (group.maxX - group.minX + 1) * finalTileSize;
  const finalHeight = (group.maxY - group.minY + 1) * finalTileSize;

  console.log(`Creating atlas for ${groupKey}: ${finalWidth}x${finalHeight}px (${group.tiles.length} tiles)`);

  const canvas = document.createElement('canvas');
  canvas.width = finalWidth;
  canvas.height = finalHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  // Fill with default color based on surface type
  if (groupKey === 'floor') {
    ctx.fillStyle = '#d4a574'; // Default floor color
  } else {
    ctx.fillStyle = '#F5F5F5'; // Default wall color
  }
  ctx.fillRect(0, 0, finalWidth, finalHeight);

  // Draw each tile's texture
  const promises = group.tiles.map(async (tile) => {
    if (!tile.textureUrl) return;

    try {
      // Compress image first
      const compressedUrl = await compressImage(tile.textureUrl, 0.8, finalTileSize);

      return new Promise<void>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
          const x = (tile.x - group.minX) * finalTileSize;
          const y = (tile.y - group.minY) * finalTileSize;

          // Handle rotation for left/right walls
          if (tile.rotation) {
            ctx.save();
            ctx.translate(x + finalTileSize / 2, y + finalTileSize / 2);
            ctx.rotate(tile.rotation);
            ctx.drawImage(img, -finalTileSize / 2, -finalTileSize / 2, finalTileSize, finalTileSize);
            ctx.restore();
          } else {
            ctx.drawImage(img, x, y, finalTileSize, finalTileSize);
          }

          resolve();
        };

        img.onerror = () => {
          console.warn(`Failed to load texture for tile ${tile.tileKey}`);
          resolve();
        };

        img.src = compressedUrl;
      });
    } catch (error) {
      console.warn(`Failed to compress texture for tile ${tile.tileKey}:`, error);
    }
  });

  await Promise.all(promises);

  // Convert canvas to compressed JPEG
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            console.log(`Atlas created for ${groupKey}: ${blob.size} bytes`);
            resolve(result);
          };
          reader.readAsDataURL(blob);
        } else {
          resolve(null);
        }
      },
      'image/jpeg',
      0.8 // 80% quality for good balance
    );
  });
}

/**
 * Remap UV coordinates for merged texture atlas
 */
export function remapUVCoordinates(
  geometry: THREE.BufferGeometry,
  tile: TileInfo,
  group: WallGroup
): void {
  const uvAttribute = geometry.attributes.uv as THREE.BufferAttribute;

  if (!uvAttribute || !isFinite(group.minX) || !isFinite(group.minY)) {
    return;
  }

  const gridWidth = group.maxX - group.minX + 1;
  const gridHeight = group.maxY - group.minY + 1;

  const tileUVX = (tile.x - group.minX) / gridWidth;
  const tileUVY = (tile.y - group.minY) / gridHeight;
  const tileUVWidth = 1 / gridWidth;
  const tileUVHeight = 1 / gridHeight;

  // Update UV coordinates
  for (let i = 0; i < uvAttribute.count; i++) {
    const u = uvAttribute.getX(i);
    const v = uvAttribute.getY(i);

    uvAttribute.setXY(
      i,
      tileUVX + u * tileUVWidth,
      tileUVY + v * tileUVHeight
    );
  }

  uvAttribute.needsUpdate = true;
}

/**
 * Main optimization function for scene textures
 */
export async function optimizeSceneTextures(scene: THREE.Scene): Promise<THREE.Scene> {
  console.log('Starting texture atlas optimization...');

  // 1. Group tiles by wall
  const wallGroups = groupTilesByWall(scene);
  console.log('Wall groups:', Object.keys(wallGroups));

  // 2. Merge textures for each group
  const mergedTextures: Record<string, MergedTextureResult> = {};

  for (const [groupKey, group] of Object.entries(wallGroups)) {
    if (group.tiles.length > 0) {
      console.log(`Processing ${groupKey}: ${group.tiles.length} tiles`);
      const mergedTexture = await mergeWallTextures(group, groupKey);

      if (mergedTexture) {
        mergedTextures[groupKey] = {
          texture: mergedTexture,
          group: group
        };
      }
    }
  }

  // 3. Clone scene for export
  const optimizedScene = scene.clone();
  const textureLoader = new THREE.TextureLoader();
  const loadedTextures: Record<string, THREE.Texture> = {};

  // 4. Load merged textures
  const texturePromises = Object.entries(mergedTextures).map(([groupKey, data]) => {
    return new Promise<void>((resolve) => {
      textureLoader.load(data.texture, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        loadedTextures[groupKey] = texture;
        resolve();
      });
    });
  });

  await Promise.all(texturePromises);

  // 5. Apply merged textures and remap UV coordinates
  console.log('Applying merged textures and remapping UVs...');

  optimizedScene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh && child.userData.tileKey) {
      const mesh = child as THREE.Mesh;
      const tileKey = child.userData.tileKey;

      // Find which group this tile belongs to
      let groupKey = '';
      if (tileKey.startsWith('wall-front')) groupKey = 'wall-front';
      else if (tileKey.startsWith('wall-back')) groupKey = 'wall-back';
      else if (tileKey.startsWith('wall-left')) groupKey = 'wall-left';
      else if (tileKey.startsWith('wall-right')) groupKey = 'wall-right';
      else if (tileKey.startsWith('wall-inner')) groupKey = 'wall-inner';
      else if (tileKey.startsWith('floor')) groupKey = 'floor';

      if (groupKey && loadedTextures[groupKey] && mergedTextures[groupKey]) {
        const group = mergedTextures[groupKey].group;
        const tile = group.tiles.find(t => t.tileKey === tileKey);

        if (tile) {
          // Clone geometry and remap UV coordinates
          const geometry = mesh.geometry.clone();
          remapUVCoordinates(geometry, tile, group);
          mesh.geometry = geometry;

          // Apply merged texture
          const material = (mesh.material as THREE.MeshStandardMaterial).clone();
          material.map = loadedTextures[groupKey];
          material.needsUpdate = true;
          mesh.material = material;
        }
      }
    }
  });

  console.log('Texture optimization complete!');
  return optimizedScene;
}
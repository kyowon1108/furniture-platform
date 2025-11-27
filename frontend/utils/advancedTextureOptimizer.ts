import * as THREE from 'three';

interface TileInfo {
  tileKey: string;
  x: number;
  y: number;
  textureUrl?: string;
}

interface WallGroup {
  tiles: TileInfo[];
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * 타일들을 벽면별로 그룹화
 */
export function groupTilesByWall(scene: THREE.Scene): Record<string, WallGroup> {
  const wallGroups: Record<string, WallGroup> = {
    'wall-front': { tiles: [], minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
    'wall-back': { tiles: [], minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
    'wall-left': { tiles: [], minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
    'wall-right': { tiles: [], minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
    'floor': { tiles: [], minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  };

  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh && child.userData.tileKey) {
      const tileKey = child.userData.tileKey;
      const mesh = child as THREE.Mesh;
      const material = mesh.material as THREE.MeshStandardMaterial;

      console.log('Processing tile:', tileKey);

      // 타일 정보 파싱
      const parts = tileKey.split('-');
      let groupKey = '';
      let x = 0, y = 0;

      if (tileKey.startsWith('floor-')) {
        groupKey = 'floor';
        x = parseInt(parts[1]) || 0;
        y = parseInt(parts[2]) || 0;  // z coordinate for floor
      } else if (tileKey.startsWith('wall-')) {
        const wallType = parts[1];
        groupKey = `wall-${wallType}`;
        const coordinateIndex = parts.length - 2;
        x = parseInt(parts[coordinateIndex]) || 0;
        y = parseInt(parts[parts.length - 1]) || 0;
      }

      if (groupKey && wallGroups[groupKey]) {
        const group = wallGroups[groupKey];

        // 텍스처 URL 추출
        let textureUrl: string | undefined;
        if (material.map && material.map.image) {
          if (material.map.image instanceof HTMLImageElement) {
            textureUrl = material.map.image.src;
          }
        }

        group.tiles.push({ tileKey, x, y, textureUrl });
        group.minX = Math.min(group.minX, x);
        group.maxX = Math.max(group.maxX, x);
        group.minY = Math.min(group.minY, y);
        group.maxY = Math.max(group.maxY, y);
      }
    }
  });

  return wallGroups;
}

/**
 * 벽별로 텍스처를 합쳐서 텍스처 아틀라스 생성
 */
async function mergeWallTextures(group: WallGroup, groupKey: string, tileSize: number = 256): Promise<string | null> {
  if (group.tiles.length === 0) return null;

  const width = (group.maxX - group.minX + 1) * tileSize;
  const height = (group.maxY - group.minY + 1) * tileSize;

  // 캔버스 크기 제한 (최대 4096px)
  const maxSize = 4096;
  let finalTileSize = tileSize;
  if (width > maxSize || height > maxSize) {
    const scale = Math.min(maxSize / width, maxSize / height);
    finalTileSize = Math.floor(tileSize * scale);
  }

  const finalWidth = (group.maxX - group.minX + 1) * finalTileSize;
  const finalHeight = (group.maxY - group.minY + 1) * finalTileSize;

  const canvas = document.createElement('canvas');
  canvas.width = finalWidth;
  canvas.height = finalHeight;
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  // 배경을 기본 색상으로 채우기
  if (groupKey === 'floor') {
    ctx.fillStyle = '#d4a574'; // 기본 바닥색
  } else {
    ctx.fillStyle = '#F5F5F5'; // 기본 벽색
  }
  ctx.fillRect(0, 0, finalWidth, finalHeight);

  // 각 타일 텍스처 그리기
  const promises = group.tiles.map(async (tile) => {
    if (!tile.textureUrl) return;

    return new Promise<void>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        const x = (tile.x - group.minX) * finalTileSize;
        const y = (tile.y - group.minY) * finalTileSize;

        ctx.drawImage(img, x, y, finalTileSize, finalTileSize);
        resolve();
      };

      img.onerror = () => {
        console.warn(`Failed to load texture for tile ${tile.tileKey}`);
        resolve();
      };

      img.src = tile.textureUrl || "";
    });
  });

  await Promise.all(promises);

  // Canvas를 압축된 JPEG로 변환
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const reader = new FileReader();
          reader.onload = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(blob);
        } else {
          resolve(null);
        }
      },
      'image/jpeg',
      0.8 // 80% 품질
    );
  });
}

/**
 * 씬의 텍스처를 최적화하여 GLB 파일 크기 줄이기
 */
export async function optimizeSceneForExport(scene: THREE.Scene): Promise<void> {
  console.log('텍스처 아틀라스 생성 중...');

  // 1. 타일을 벽면별로 그룹화
  const wallGroups = groupTilesByWall(scene);

  // 2. 각 그룹의 텍스처를 합치기
  const mergedTextures: Record<string, { texture: string; group: WallGroup }> = {};

  for (const [groupKey, group] of Object.entries(wallGroups)) {
    if (group.tiles.length > 0 && isFinite(group.minX)) {
      console.log(`${groupKey} 처리 중... (타일 ${group.tiles.length}개)`);
      const mergedTexture = await mergeWallTextures(group, groupKey);
      if (mergedTexture) {
        mergedTextures[groupKey] = {
          texture: mergedTexture,
          group: group
        };
      }
    }
  }

  // 3. 합쳐진 텍스처를 로드하고 적용
  const textureLoader = new THREE.TextureLoader();
  const loadedTextures: Record<string, THREE.Texture> = {};

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

  // 4. 각 메쉬의 UV 좌표를 재계산하고 텍스처 적용
  console.log('UV 좌표 재계산 중...');

  scene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh && child.userData.tileKey) {
      const mesh = child as THREE.Mesh;
      const tileKey = child.userData.tileKey;
      const material = mesh.material as THREE.MeshStandardMaterial;

      // 어느 그룹에 속하는지 확인
      let groupKey = '';
      if (tileKey.startsWith('wall-front')) groupKey = 'wall-front';
      else if (tileKey.startsWith('wall-back')) groupKey = 'wall-back';
      else if (tileKey.startsWith('wall-left')) groupKey = 'wall-left';
      else if (tileKey.startsWith('wall-right')) groupKey = 'wall-right';
      else if (tileKey.startsWith('floor')) groupKey = 'floor';

      if (groupKey && loadedTextures[groupKey] && mergedTextures[groupKey]) {
        const group = mergedTextures[groupKey].group;
        const tile = group.tiles.find(t => t.tileKey === tileKey);

        if (tile) {
          // UV 좌표 재계산
          const geometry = mesh.geometry.clone();
          const uvAttribute = geometry.attributes.uv;

          if (isFinite(group.minX) && isFinite(group.minY)) {
            const gridWidth = group.maxX - group.minX + 1;
            const gridHeight = group.maxY - group.minY + 1;

            const tileUVX = (tile.x - group.minX) / gridWidth;
            const tileUVY = (tile.y - group.minY) / gridHeight;
            const tileUVWidth = 1 / gridWidth;
            const tileUVHeight = 1 / gridHeight;

            // UV 좌표 업데이트
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
            mesh.geometry = geometry;
          }

          // 새로운 텍스처 적용
          material.map = loadedTextures[groupKey];
          material.needsUpdate = true;
        }
      }
    }
  });

  console.log('텍스처 최적화 완료');
}
/**
 * Geometry Baking Utilities
 * Displacement Map을 실제 Geometry 정점으로 변환
 * GLB 내보내기 시 glTF 호환성을 위해 필요
 */

import * as THREE from 'three';

/**
 * Displacement Map을 Geometry 정점에 적용 (Baking)
 *
 * @param geometry - 원본 BufferGeometry
 * @param displacementMap - Displacement 텍스처
 * @param scale - Displacement 강도
 * @returns 변형된 새 BufferGeometry
 */
export function bakeDisplacementToGeometry(
  geometry: THREE.BufferGeometry,
  displacementMap: THREE.Texture,
  scale: number
): THREE.BufferGeometry {
  // Geometry 복제
  const bakedGeometry = geometry.clone();

  const positions = bakedGeometry.attributes.position;
  const uvs = bakedGeometry.attributes.uv;
  const normals = bakedGeometry.attributes.normal;

  if (!positions || !uvs || !normals) {
    console.warn('Geometry missing required attributes for baking');
    return bakedGeometry;
  }

  // Displacement Map 이미지 가져오기
  const image = displacementMap.image as HTMLImageElement | HTMLCanvasElement;
  if (!image) {
    console.warn('Displacement map has no image');
    return bakedGeometry;
  }

  // Canvas로 이미지 데이터 읽기
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.warn('Failed to create canvas context');
    return bakedGeometry;
  }

  canvas.width = image.width || 256;
  canvas.height = image.height || 256;
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  let imageData: ImageData;
  try {
    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  } catch (e) {
    console.warn('Failed to get image data (CORS?):', e);
    return bakedGeometry;
  }

  // 각 정점에 대해 displacement 적용
  for (let i = 0; i < positions.count; i++) {
    const u = uvs.getX(i);
    const v = uvs.getY(i);

    // UV로 픽셀 위치 계산
    const x = Math.floor(u * canvas.width) % canvas.width;
    const y = Math.floor((1 - v) * canvas.height) % canvas.height;
    const idx = (y * canvas.width + x) * 4;

    // 그레이스케일 값 (R 채널 사용, 0-1 정규화)
    const displacement = imageData.data[idx] / 255;

    // 노멀 방향으로 정점 이동
    const nx = normals.getX(i);
    const ny = normals.getY(i);
    const nz = normals.getZ(i);

    const px = positions.getX(i);
    const py = positions.getY(i);
    const pz = positions.getZ(i);

    positions.setX(i, px + nx * displacement * scale);
    positions.setY(i, py + ny * displacement * scale);
    positions.setZ(i, pz + nz * displacement * scale);
  }

  positions.needsUpdate = true;

  // 노멀 재계산
  bakedGeometry.computeVertexNormals();

  return bakedGeometry;
}

/**
 * Scene 전체에서 Displacement가 적용된 Mesh들을 Bake
 *
 * @param scene - Three.js Scene 또는 Group
 * @returns Baked Scene (원본 수정 없음)
 */
export async function bakeSceneDisplacements(
  scene: THREE.Object3D
): Promise<THREE.Object3D> {
  const clonedScene = scene.clone(true);

  const bakingPromises: Promise<void>[] = [];

  clonedScene.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      const material = obj.material as THREE.MeshStandardMaterial;

      if (
        material.displacementMap &&
        material.displacementScale &&
        material.displacementScale > 0
      ) {
        const promise = new Promise<void>((resolve) => {
          // 이미지 로드 확인
          const image = material.displacementMap?.image;

          if (image && image.complete !== false) {
            // 이미 로드됨
            obj.geometry = bakeDisplacementToGeometry(
              obj.geometry,
              material.displacementMap!,
              material.displacementScale
            );

            // Displacement 제거 (baking 완료)
            material.displacementMap = null;
            material.displacementScale = 0;
            resolve();
          } else if (material.displacementMap) {
            // 이미지 로드 대기
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              material.displacementMap!.image = img;
              material.displacementMap!.needsUpdate = true;

              obj.geometry = bakeDisplacementToGeometry(
                obj.geometry,
                material.displacementMap!,
                material.displacementScale
              );

              material.displacementMap = null;
              material.displacementScale = 0;
              resolve();
            };
            img.onerror = () => {
              console.warn('Failed to load displacement map image');
              resolve();
            };
            img.src = (material.displacementMap as any).source?.data?.src || '';
          } else {
            resolve();
          }
        });

        bakingPromises.push(promise);
      }
    }
  });

  await Promise.all(bakingPromises);

  return clonedScene;
}

/**
 * Displacement이 적용된 Mesh인지 확인
 */
export function hasDisplacement(mesh: THREE.Mesh): boolean {
  const material = mesh.material as THREE.MeshStandardMaterial;
  return !!(
    material.displacementMap &&
    material.displacementScale &&
    material.displacementScale > 0
  );
}

/**
 * Scene에서 Displacement가 적용된 Mesh 수 카운트
 */
export function countDisplacementMeshes(scene: THREE.Object3D): number {
  let count = 0;

  scene.traverse((obj) => {
    if (obj instanceof THREE.Mesh && hasDisplacement(obj)) {
      count++;
    }
  });

  return count;
}

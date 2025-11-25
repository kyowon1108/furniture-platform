/**
 * Utility to optimize textures before GLB export
 */

export async function optimizeTextureForExport(textureUrl: string, maxSize: number = 512): Promise<string> {
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

      // Calculate scaled dimensions
      let width = img.width;
      let height = img.height;

      if (width > maxSize || height > maxSize) {
        const scale = Math.min(maxSize / width, maxSize / height);
        width = Math.floor(width * scale);
        height = Math.floor(height * scale);
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and resize the image
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to compressed JPEG
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
        0.7 // 70% quality for good balance
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = textureUrl;
  });
}

export async function optimizeSceneTextures(scene: THREE.Scene): Promise<void> {
  const textureCache = new Map<string, THREE.Texture>();
  const loader = new THREE.TextureLoader();

  const promises: Promise<void>[] = [];

  scene.traverse((object) => {
    if ((object as THREE.Mesh).isMesh) {
      const mesh = object as THREE.Mesh;
      const material = mesh.material as THREE.MeshStandardMaterial;

      if (material && material.map) {
        const texture = material.map;

        // Check if texture has a source image
        if (texture.image && texture.image.src) {
          const originalSrc = texture.image.src;

          // Only optimize base64 images (AI generated)
          if (originalSrc.startsWith('data:image')) {
            promises.push(
              optimizeTextureForExport(originalSrc, 256).then((optimizedSrc) => {
                // Load the optimized texture
                const newTexture = loader.load(optimizedSrc);
                newTexture.wrapS = texture.wrapS;
                newTexture.wrapT = texture.wrapT;
                newTexture.repeat.copy(texture.repeat);
                material.map = newTexture;
                material.needsUpdate = true;
              }).catch(console.error)
            );
          }
        }
      }
    }
  });

  await Promise.all(promises);
}
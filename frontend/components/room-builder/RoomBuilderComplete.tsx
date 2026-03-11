'use client';

import React, { useState, useRef, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { getAuthToken } from '@/lib/authToken';
import { RoomTemplate, UploadedImage, ROOM_TEMPLATES } from './types';
import RoomTemplateSelector from './RoomTemplateSelector';
import TextureGallery from './TextureGallery';

interface RoomBuilderCompleteProps {
  projectId: number;
  projectName: string;
  onComplete: (glbBlob: Blob) => void;
}

const TILE_SIZE = 0.5;
const WALL_HEIGHT = 2.5;

const RoomBuilderComplete: React.FC<RoomBuilderCompleteProps> = ({
  projectId,
  projectName,
  onComplete,
}) => {
  const [currentTemplate, setCurrentTemplate] = useState<RoomTemplate>('rectangular');
  const [customDimensions, setCustomDimensions] = useState({ width: 3, depth: 3 });
  const [selectedTiles, setSelectedTiles] = useState<string[]>([]);
  const [tileTextures, setTileTextures] = useState<Record<string, string>>({});
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // AI generation state
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const roomSceneRef = useRef<THREE.Group | null>(null);
  const lastSelectedTileRef = useRef<string | null>(null);

  // Handle tile selection with Shift+Click for range selection
  const handleTileClick = useCallback((tileKey: string, event?: React.MouseEvent) => {
    if (event?.shiftKey && lastSelectedTileRef.current) {
      // Range selection with Shift+Click
      const currentParts = tileKey.split('-');
      const lastParts = lastSelectedTileRef.current.split('-');

      if (currentParts[0] === lastParts[0] && currentParts[1] === lastParts[1]) {
        // Same surface type (floor, wall-front, etc.)
        const tiles: string[] = [];
        const startX = Math.min(parseInt(currentParts[2] || currentParts[1]),
                               parseInt(lastParts[2] || lastParts[1]));
        const endX = Math.max(parseInt(currentParts[2] || currentParts[1]),
                             parseInt(lastParts[2] || lastParts[1]));

        if (currentParts[0] === 'floor') {
          const startY = Math.min(parseInt(currentParts[2]), parseInt(lastParts[2]));
          const endY = Math.max(parseInt(currentParts[2]), parseInt(lastParts[2]));

          for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
              tiles.push(`floor-${x}-${y}`);
            }
          }
        } else {
          // Wall tiles
          const startY = Math.min(parseInt(currentParts[3] || '0'),
                                 parseInt(lastParts[3] || '0'));
          const endY = Math.max(parseInt(currentParts[3] || '0'),
                               parseInt(lastParts[3] || '0'));

          for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
              tiles.push(`${currentParts[0]}-${currentParts[1]}-${x}-${y}`);
            }
          }
        }

        setSelectedTiles(prev => {
          const newSelection = new Set(prev);
          tiles.forEach(t => newSelection.add(t));
          return Array.from(newSelection);
        });
      }
    } else if (event?.ctrlKey || event?.metaKey) {
      // Toggle selection with Ctrl/Cmd+Click
      setSelectedTiles(prev =>
        prev.includes(tileKey)
          ? prev.filter(t => t !== tileKey)
          : [...prev, tileKey]
      );
    } else {
      // Single selection
      setSelectedTiles([tileKey]);
    }

    lastSelectedTileRef.current = tileKey;
  }, []);

  // Apply texture to selected tiles
  const handleApplyTexture = useCallback(() => {
    if (!selectedImageId || selectedTiles.length === 0) {
      alert('텍스처와 타일을 선택해주세요.');
      return;
    }

    const selectedImage = uploadedImages.find(img => img.id === selectedImageId);
    if (!selectedImage) return;

    const newTextures = { ...tileTextures };
    selectedTiles.forEach(tileKey => {
      newTextures[tileKey] = selectedImage.url;
    });

    setTileTextures(newTextures);
  }, [selectedImageId, selectedTiles, uploadedImages, tileTextures]);

  // Remove texture from selected tiles
  const handleRemoveTexture = useCallback(() => {
    if (selectedTiles.length === 0) {
      alert('텍스처를 제거할 타일을 선택해주세요.');
      return;
    }

    const newTextures = { ...tileTextures };
    selectedTiles.forEach(tileKey => {
      delete newTextures[tileKey];
    });

    setTileTextures(newTextures);
  }, [selectedTiles, tileTextures]);

  // Generate AI texture using AWS Bedrock
  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) {
      alert('프롬프트를 입력해주세요.');
      return;
    }

    setIsGenerating(true);
    console.log('[DEBUG] AI 생성 시작:', aiPrompt);

    try {
      const token = getAuthToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8008/api/v1';

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${apiUrl}/room-builder/generate-texture`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt: aiPrompt,
        }),
      });

      console.log('[DEBUG] AI 생성 응답 상태:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: '서버 오류' }));
        throw new Error(errorData.detail || `서버 오류 (${response.status})`);
      }

      const data = await response.json();
      console.log('[DEBUG] AI 생성 성공');

      if (data.texture_url) {
        // Add generated image to uploaded images
        const newImage: UploadedImage = {
          id: `ai_${Date.now()}`,
          url: data.texture_url,
          name: `AI: ${aiPrompt.substring(0, 20)}...`,
        };

        setUploadedImages(prev => [...prev, newImage]);
        setSelectedImageId(newImage.id);
        setAiPrompt('');
        console.log('[DEBUG] 생성된 이미지 추가 완료');
      }
    } catch (error) {
      console.error('[ERROR] AI 생성 실패:', error);
      alert(error instanceof Error ? error.message : 'AI 생성에 실패했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Compress image for optimization
  const compressImage = (imageUrl: string, quality: number = 0.8, maxSize: number = 512): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = Math.min(img.width, maxSize);
        canvas.height = Math.min(img.height, maxSize);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to compress image'));
              return;
            }
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('이미지 로드 실패'));
      img.src = imageUrl;
    });
  };

  // Group tiles by wall for texture merging
  const groupTilesByWall = () => {
    const groups: Record<string, any> = {
      'wall-front': { tiles: [], minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
      'wall-back': { tiles: [], minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
      'wall-left': { tiles: [], minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
      'wall-right': { tiles: [], minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
      'floor': { tiles: [], minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
    };

    Object.keys(tileTextures).forEach(tileKey => {
      const parts = tileKey.split('-');
      let groupKey = null;
      let x = 0, y = 0;

      if (tileKey.startsWith('wall-front')) {
        groupKey = 'wall-front';
        x = parseInt(parts[2]);
        y = parseInt(parts[3]);
      } else if (tileKey.startsWith('wall-back')) {
        groupKey = 'wall-back';
        x = parseInt(parts[2]);
        y = parseInt(parts[3]);
      } else if (tileKey.startsWith('wall-left')) {
        groupKey = 'wall-left';
        x = parseInt(parts[2]);
        y = parseInt(parts[3]);
      } else if (tileKey.startsWith('wall-right')) {
        groupKey = 'wall-right';
        x = parseInt(parts[2]);
        y = parseInt(parts[3]);
      } else if (tileKey.startsWith('floor')) {
        groupKey = 'floor';
        x = parseInt(parts[1]);
        y = parseInt(parts[2]);
      }

      if (groupKey && tileTextures[tileKey]) {
        groups[groupKey].tiles.push({ tileKey, x, y, imageUrl: tileTextures[tileKey] });
        groups[groupKey].minX = Math.min(groups[groupKey].minX, x);
        groups[groupKey].maxX = Math.max(groups[groupKey].maxX, x);
        groups[groupKey].minY = Math.min(groups[groupKey].minY, y);
        groups[groupKey].maxY = Math.max(groups[groupKey].maxY, y);
      }
    });

    return groups;
  };

  // Merge textures for each wall
  const mergeWallTextures = async (group: any, groupKey: string, tileSize: number = 512) => {
    if (group.tiles.length === 0) return null;

    const width = (group.maxX - group.minX + 1) * tileSize;
    const height = (group.maxY - group.minY + 1) * tileSize;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    // Background white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Check if wall needs rotation
    const needsRotation = groupKey === 'wall-left' || groupKey === 'wall-right';

    // Draw each tile
    for (const tile of group.tiles) {
      try {
        const compressedUrl = await compressImage(tile.imageUrl, 0.8, tileSize);

        await new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const canvasX = (tile.x - group.minX) * tileSize;
            const canvasY = (tile.y - group.minY) * tileSize;

            if (needsRotation) {
              ctx.save();
              ctx.translate(canvasX + tileSize / 2, canvasY + tileSize / 2);
              ctx.rotate(Math.PI / 2);
              ctx.drawImage(img, -tileSize / 2, -tileSize / 2, tileSize, tileSize);
              ctx.restore();
            } else {
              ctx.drawImage(img, canvasX, canvasY, tileSize, tileSize);
            }
            resolve();
          };
          img.onerror = () => reject(new Error('Image load failed'));
          img.src = compressedUrl;
        });
      } catch (error) {
        console.error(`타일 ${tile.tileKey} 처리 실패:`, error);
      }
    }

    return canvas.toDataURL('image/jpeg', 0.8);
  };

  // Export as GLB
  const handleCompleteRoom = async () => {
    if (!roomSceneRef.current) {
      alert('3D 씬이 준비되지 않았습니다.');
      return;
    }

    setIsExporting(true);
    setUploadProgress(10);

    try {
      // 1. Group tiles by wall
      console.log('타일 그룹화 중...');
      const wallGroups = groupTilesByWall();
      setUploadProgress(20);

      // 2. Merge textures for each wall
      console.log('벽면별 텍스처 합치는 중...');
      const mergedTextures: Record<string, any> = {};

      for (const [groupKey, group] of Object.entries(wallGroups)) {
        if (group.tiles.length > 0) {
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
      setUploadProgress(50);

      // 3. Clone scene and apply merged textures
      console.log('씬 복제 및 텍스처 교체 중...');
      const scene = roomSceneRef.current;
      const clonedScene = scene.clone(true);

      // Adjust z position
      clonedScene.position.z += WALL_HEIGHT / 2;

      // Load merged textures
      const textureLoader = new THREE.TextureLoader();
      const loadedTextures: Record<string, THREE.Texture> = {};
      const texturePromises: Promise<void>[] = [];

      for (const [groupKey, data] of Object.entries(mergedTextures)) {
        const promise = new Promise<void>((resolve) => {
          textureLoader.load(data.texture, (texture) => {
            texture.colorSpace = THREE.SRGBColorSpace;
            loadedTextures[groupKey] = texture;
            resolve();
          });
        });
        texturePromises.push(promise);
      }

      await Promise.all(texturePromises);
      setUploadProgress(70);

      // 4. Apply textures to meshes
      console.log('UV 좌표 재계산 중...');
      clonedScene.traverse((child: any) => {
        if (child.isMesh && child.userData.tileKey) {
          const tileKey = child.userData.tileKey;

          let groupKey = null;
          if (tileKey.startsWith('wall-front')) groupKey = 'wall-front';
          else if (tileKey.startsWith('wall-back')) groupKey = 'wall-back';
          else if (tileKey.startsWith('wall-left')) groupKey = 'wall-left';
          else if (tileKey.startsWith('wall-right')) groupKey = 'wall-right';
          else if (tileKey.startsWith('floor')) groupKey = 'floor';

          if (groupKey && loadedTextures[groupKey] && mergedTextures[groupKey]) {
            const group = mergedTextures[groupKey].group;
            const tile = group.tiles.find((t: any) => t.tileKey === tileKey);

            if (tile) {
              // Calculate UV coordinates
              const totalWidth = group.maxX - group.minX + 1;
              const totalHeight = group.maxY - group.minY + 1;
              const uOffset = (tile.x - group.minX) / totalWidth;
              const vOffset = (tile.y - group.minY) / totalHeight;
              const uSize = 1 / totalWidth;
              const vSize = 1 / totalHeight;

              const uvAttribute = child.geometry.attributes.uv;
              const uvArray = uvAttribute.array;

              // Rotate UV coordinates 90 degrees for left and right walls
              if (groupKey === 'wall-left' || groupKey === 'wall-right') {
                // Rotated UV mapping (90 degrees clockwise)
                uvArray[0] = uOffset;
                uvArray[1] = 1 - vOffset;
                uvArray[2] = uOffset;
                uvArray[3] = 1 - vOffset - vSize;
                uvArray[4] = uOffset + uSize;
                uvArray[5] = 1 - vOffset;
                uvArray[6] = uOffset + uSize;
                uvArray[7] = 1 - vOffset - vSize;
              } else {
                // Normal UV mapping for other walls and floor
                uvArray[0] = uOffset;
                uvArray[1] = 1 - vOffset - vSize;
                uvArray[2] = uOffset + uSize;
                uvArray[3] = 1 - vOffset - vSize;
                uvArray[4] = uOffset;
                uvArray[5] = 1 - vOffset;
                uvArray[6] = uOffset + uSize;
                uvArray[7] = 1 - vOffset;
              }

              uvAttribute.needsUpdate = true;
            }

            // Apply texture
            child.material = new THREE.MeshStandardMaterial({
              map: loadedTextures[groupKey],
              side: THREE.DoubleSide,
            });
          }
        }
      });

      setUploadProgress(90);

      // 5. Export as GLB
      console.log('GLB 파일 생성 중...');
      const exporter = new GLTFExporter();

      exporter.parse(
        clonedScene,
        async (gltf: any) => {
          const blob = new Blob([gltf as ArrayBuffer], { type: 'model/gltf-binary' });
          console.log('GLB 파일 생성 완료:', blob.size, 'bytes');

          setUploadProgress(100);
          await onComplete(blob);
        },
        (error: any) => {
          console.error('GLB export error:', error);
          alert('GLB 내보내기 실패: ' + error.message);
        },
        { binary: true }
      );
    } catch (error) {
      console.error('Room completion error:', error);
      alert('방 구조 저장에 실패했습니다.');
    } finally {
      setIsExporting(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="room-builder">
      {/* Template selector */}
      <div className="mb-6">
        <RoomTemplateSelector
          currentTemplate={currentTemplate}
          onTemplateChange={setCurrentTemplate}
          customDimensions={customDimensions}
          onCustomDimensionsChange={setCustomDimensions}
        />
      </div>

      {/* AI Generation */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="text-sm font-semibold mb-2 text-blue-700">
          🤖 AI로 타일 생성
        </div>
        <input
          type="text"
          value={aiPrompt}
          placeholder="예: wooden floor, marble texture, brick wall"
          onChange={(e) => setAiPrompt(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !isGenerating) {
              handleGenerateAI();
            }
          }}
          disabled={isGenerating}
          className="w-full px-3 py-2 mb-2 border rounded"
        />
        <button
          onClick={handleGenerateAI}
          disabled={isGenerating || !aiPrompt.trim()}
          className="w-full px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {isGenerating ? '⏳ 생성 중... (30초 소요)' : '✨ AI로 생성'}
        </button>
        <div className="text-xs text-gray-600 mt-2">
          💡 AWS Bedrock Titan Image Generator 사용
        </div>
      </div>

      {/* Texture Gallery */}
      <div className="mb-6">
        <TextureGallery
          uploadedImages={uploadedImages}
          selectedImageId={selectedImageId}
          onImageSelect={setSelectedImageId}
          onImagesUpload={setUploadedImages}
        />
      </div>

      {/* Tile Controls */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold mb-2">타일 선택</h3>
        <p className="text-xs text-muted-foreground mb-2">
          선택된 타일: {selectedTiles.length}개
          {selectedTiles.length > 0 && (
            <span className="ml-2">
              (Shift+클릭: 범위 선택, Ctrl+클릭: 다중 선택)
            </span>
          )}
        </p>
        <div className="space-y-2">
          <button
            onClick={handleApplyTexture}
            disabled={selectedTiles.length === 0 || !selectedImageId}
            className="w-full px-3 py-2 text-sm bg-primary text-primary-foreground rounded disabled:opacity-50"
          >
            선택한 타일에 텍스처 적용
          </button>
          <button
            onClick={handleRemoveTexture}
            disabled={selectedTiles.length === 0}
            className="w-full px-3 py-2 text-sm bg-destructive text-destructive-foreground rounded disabled:opacity-50"
          >
            선택한 타일 텍스처 제거
          </button>
        </div>
      </div>

      {/* Complete Button */}
      <div className="mt-6 pt-6 border-t border-border">
        <button
          onClick={handleCompleteRoom}
          disabled={isExporting}
          className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-semibold disabled:opacity-50"
        >
          {isExporting ? (
            <span>저장 중... {uploadProgress}%</span>
          ) : (
            <span>✅ 방 구조 완료</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default RoomBuilderComplete;

'use client';

import React, { useRef, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';

import { useFreeBuildStore } from '@/store/freeBuildStore';
import FreeBuildScene, { FreeBuildSceneRef } from './FreeBuildScene';
import BuildToolbar from './BuildToolbar';
import TextureGallery from './TextureGallery';
import DepthMapApplier from './DepthMapApplier';
import { UploadedImage } from './types';
import { useToastStore } from '@/store/toastStore';

interface FreeBuildModeProps {
  projectId: number;
  projectName: string;
  onComplete: (glbBlob: Blob) => void;
  onCancel?: () => void;
}

const FreeBuildMode: React.FC<FreeBuildModeProps> = ({
  projectId,
  projectName,
  onComplete,
  onCancel,
}) => {
  const sceneRef = useRef<FreeBuildSceneRef>(null);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // AI 텍스처 생성 상태
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const {
    tiles,
    selectedTileIds,
    config,
    applyTextureToSelected,
    removeTextureFromSelected,
    exportTileData,
  } = useFreeBuildStore();

  // 텍스처 적용
  const handleApplyTexture = useCallback(() => {
    if (!selectedImageId) {
      useToastStore.getState().addToast('텍스처를 선택해주세요', 'warning');
      return;
    }

    if (selectedTileIds.length === 0) {
      useToastStore.getState().addToast('타일을 선택해주세요', 'warning');
      return;
    }

    const selectedImage = uploadedImages.find((img) => img.id === selectedImageId);
    if (selectedImage) {
      applyTextureToSelected(selectedImage.url);
    }
  }, [selectedImageId, selectedTileIds, uploadedImages, applyTextureToSelected]);

  // AI 텍스처 생성
  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) {
      useToastStore.getState().addToast('프롬프트를 입력해주세요', 'warning');
      return;
    }

    setIsGeneratingAI(true);

    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8008/api/v1';

      const response = await fetch(`${apiUrl}/room-builder/generate-texture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ prompt: aiPrompt }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: '서버 오류' }));
        throw new Error(error.detail || `오류: ${response.status}`);
      }

      const data = await response.json();

      if (data.texture_url) {
        const newImage: UploadedImage = {
          id: `ai_${Date.now()}`,
          url: data.texture_url,
          name: `AI: ${aiPrompt.substring(0, 20)}...`,
        };

        setUploadedImages((prev) => [...prev, newImage]);
        setSelectedImageId(newImage.id);
        setAiPrompt('');

        useToastStore.getState().addToast('AI 텍스처 생성 완료', 'success');
      }
    } catch (error) {
      useToastStore.getState().addToast(
        error instanceof Error ? error.message : 'AI 생성 실패',
        'error'
      );
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // GLB 내보내기
  const handleCompleteRoom = async () => {
    const scene = sceneRef.current?.getScene();
    if (!scene) {
      useToastStore.getState().addToast('3D 씬을 찾을 수 없습니다', 'error');
      return;
    }

    const floorTiles = tiles.filter((t) => t.type === 'floor');
    if (floorTiles.length === 0) {
      useToastStore.getState().addToast('바닥 타일을 최소 1개 이상 배치해주세요', 'warning');
      return;
    }

    setIsExporting(true);
    setExportProgress(10);

    try {
      // 씬 복제
      const clonedScene = scene.clone(true);
      setExportProgress(30);

      // 텍스처가 있는 타일들의 material 처리
      const textureLoader = new THREE.TextureLoader();
      const texturePromises: Promise<void>[] = [];

      clonedScene.traverse((obj: THREE.Object3D) => {
        if (obj instanceof THREE.Mesh && obj.userData.tileId) {
          const tile = tiles.find((t) => t.id === obj.userData.tileId);

          if (tile?.textureUrl) {
            const promise = new Promise<void>((resolve) => {
              textureLoader.load(
                tile.textureUrl!,
                (texture) => {
                  texture.colorSpace = THREE.SRGBColorSpace;
                  (obj.material as THREE.MeshStandardMaterial).map = texture;
                  (obj.material as THREE.MeshStandardMaterial).color.set('#ffffff');
                  (obj.material as THREE.MeshStandardMaterial).needsUpdate = true;
                  resolve();
                },
                undefined,
                () => resolve()
              );
            });
            texturePromises.push(promise);
          }
        }
      });

      await Promise.all(texturePromises);
      setExportProgress(60);

      // 바운딩 박스 계산하여 방 크기 결정
      const boundingBox = new THREE.Box3().setFromObject(clonedScene);
      const size = new THREE.Vector3();
      boundingBox.getSize(size);

      setExportProgress(80);

      // GLB 내보내기
      const exporter = new GLTFExporter();

      exporter.parse(
        clonedScene,
        async (gltf) => {
          const blob = new Blob([gltf as ArrayBuffer], { type: 'model/gltf-binary' });
          console.log('GLB 생성 완료:', blob.size, 'bytes');
          console.log('방 크기:', {
            width: size.x.toFixed(2),
            height: size.y.toFixed(2),
            depth: size.z.toFixed(2),
          });

          setExportProgress(100);
          await onComplete(blob);
        },
        (error) => {
          console.error('GLB 내보내기 오류:', error);
          useToastStore.getState().addToast('GLB 내보내기 실패', 'error');
        },
        { binary: true }
      );
    } catch (error) {
      console.error('방 완료 오류:', error);
      useToastStore.getState().addToast('방 저장에 실패했습니다', 'error');
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  // 방 면적 계산
  const roomArea = React.useMemo(() => {
    const floorTiles = tiles.filter((t) => t.type === 'floor');
    return floorTiles.length * config.tileSize * config.tileSize;
  }, [tiles, config.tileSize]);

  return (
    <div className="free-build-mode h-full flex">
      {/* 왼쪽 사이드바 - 도구 */}
      <div className="w-64 flex-shrink-0 p-4 bg-background border-r border-border overflow-y-auto">
        <div className="mb-4">
          <h2 className="text-lg font-bold mb-1">{projectName}</h2>
          <p className="text-sm text-muted-foreground">자유 건축 모드</p>
        </div>

        <BuildToolbar className="mb-4" />

        {/* 방 정보 */}
        <div className="p-3 bg-muted rounded-lg mb-4">
          <h3 className="text-sm font-semibold mb-2">방 정보</h3>
          <div className="text-xs space-y-1 text-muted-foreground">
            <div>타일 크기: {config.tileSize}m</div>
            <div>벽 높이: {config.wallHeight}m</div>
            <div>바닥 면적: {roomArea.toFixed(2)}m²</div>
          </div>
        </div>
      </div>

      {/* 중앙 - 3D 뷰어 */}
      <div className="flex-1 relative bg-gray-900">
        <Canvas shadows>
          <PerspectiveCamera
            makeDefault
            position={[10, 10, 10]}
            fov={50}
          />
          <OrbitControls
            makeDefault
            target={[5, 0, 5]}
            maxPolarAngle={Math.PI / 2}
            minDistance={2}
            maxDistance={50}
          />

          {/* 조명 */}
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={1}
            castShadow
            shadow-mapSize={[2048, 2048]}
          />

          {/* 자유 건축 씬 */}
          <FreeBuildScene ref={sceneRef} />
        </Canvas>

        {/* 내보내기 진행률 오버레이 */}
        {isExporting && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 text-center">
              <div className="text-lg font-semibold mb-2">내보내는 중...</div>
              <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
              <div className="text-sm text-gray-600 mt-2">{exportProgress}%</div>
            </div>
          </div>
        )}
      </div>

      {/* 오른쪽 사이드바 - 텍스처 */}
      <div className="w-72 flex-shrink-0 p-4 bg-background border-l border-border overflow-y-auto">
        {/* AI 텍스처 생성 */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-sm font-semibold mb-2 text-blue-700">
            🤖 AI로 텍스처 생성
          </div>
          <input
            type="text"
            value={aiPrompt}
            placeholder="예: wooden floor, marble, brick"
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !isGeneratingAI) {
                handleGenerateAI();
              }
            }}
            disabled={isGeneratingAI}
            className="w-full px-3 py-2 mb-2 border rounded text-sm"
          />
          <button
            onClick={handleGenerateAI}
            disabled={isGeneratingAI || !aiPrompt.trim()}
            className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm disabled:opacity-50"
          >
            {isGeneratingAI ? '⏳ 생성 중...' : '✨ AI로 생성'}
          </button>
        </div>

        {/* 텍스처 갤러리 */}
        <div className="mb-4">
          <TextureGallery
            uploadedImages={uploadedImages}
            selectedImageId={selectedImageId}
            onImageSelect={setSelectedImageId}
            onImagesUpload={setUploadedImages}
          />
        </div>

        {/* 텍스처 적용 버튼 */}
        <div className="space-y-2 mb-4">
          <button
            onClick={handleApplyTexture}
            disabled={!selectedImageId || selectedTileIds.length === 0}
            className="w-full px-3 py-2 bg-primary text-primary-foreground rounded text-sm disabled:opacity-50"
          >
            선택 타일에 텍스처 적용
          </button>
          <button
            onClick={removeTextureFromSelected}
            disabled={selectedTileIds.length === 0}
            className="w-full px-3 py-2 bg-destructive text-destructive-foreground rounded text-sm disabled:opacity-50"
          >
            텍스처 제거
          </button>
        </div>

        {/* AI Depth Map */}
        <DepthMapApplier className="mb-6" />

        {/* 완료/취소 버튼 */}
        <div className="space-y-2 pt-4 border-t border-border">
          <button
            onClick={handleCompleteRoom}
            disabled={isExporting || tiles.filter((t) => t.type === 'floor').length === 0}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-semibold disabled:opacity-50"
          >
            {isExporting ? `저장 중... ${exportProgress}%` : '✅ 방 구조 완료'}
          </button>
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={isExporting}
              className="w-full px-4 py-2 bg-muted text-muted-foreground rounded-lg disabled:opacity-50"
            >
              취소
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FreeBuildMode;

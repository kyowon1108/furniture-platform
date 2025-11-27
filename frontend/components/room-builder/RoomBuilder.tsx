'use client';

import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import {
  RoomTemplate,
  RoomBuilderState,
  Tile,
  UploadedImage,
  ROOM_TEMPLATES,
} from './types';
import RoomScene from './RoomScene';
import RoomTemplateSelector from './RoomTemplateSelector';
import TextureGallery from './TextureGallery';

interface RoomBuilderProps {
  projectId: number;
  projectName: string;
  onComplete: (glbBlob: Blob) => void;
}

const RoomBuilder: React.FC<RoomBuilderProps> & { Scene: typeof RoomScene } = ({
  projectId,
  projectName,
  onComplete,
}) => {
  // State
  const [currentTemplate, setCurrentTemplate] = useState<RoomTemplate>('rectangular');
  const [customDimensions, setCustomDimensions] = useState({ width: 3, depth: 3 });
  const [selectedTiles, setSelectedTiles] = useState<string[]>([]);
  const [tileTextures, setTileTextures] = useState<Record<string, string>>({});
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const roomSceneRef = useRef<any>(null);

  // Get room dimensions
  const getRoomDimensions = useCallback(() => {
    if (currentTemplate === 'custom') {
      return {
        width: customDimensions.width,
        depth: customDimensions.depth,
        height: ROOM_TEMPLATES.custom.wallHeight,
      };
    }
    const template = ROOM_TEMPLATES[currentTemplate];
    return {
      width: template.width,
      depth: template.depth,
      height: template.wallHeight,
    };
  }, [currentTemplate, customDimensions]);

  // Handle template change
  const handleTemplateChange = useCallback((template: RoomTemplate) => {
    setCurrentTemplate(template);
    setSelectedTiles([]);
    setTileTextures({});
  }, []);

  // Handle tile selection
  const handleTileClick = useCallback((tileKey: string) => {
    setSelectedTiles(prev => {
      if (prev.includes(tileKey)) {
        return prev.filter(key => key !== tileKey);
      }
      return [...prev, tileKey];
    });
  }, []);

  // Apply texture to selected tiles
  const handleApplyTexture = useCallback(() => {
    if (!selectedImageId || selectedTiles.length === 0) {
      alert('텍스처와 타일을 선택해주세요.');
      return;
    }

    const selectedImage = uploadedImages.find(img => img.id === selectedImageId);
    if (!selectedImage) return;

    const newTextures: Record<string, string> = { ...tileTextures };
    selectedTiles.forEach(tileKey => {
      newTextures[tileKey] = selectedImage.url;
    });

    setTileTextures(newTextures);
    setSelectedTiles([]);
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
    setSelectedTiles([]);
  }, [selectedTiles, tileTextures]);

  // Export to GLB
  const handleCompleteRoom = useCallback(async () => {
    if (!roomSceneRef.current) {
      alert('3D 씬이 준비되지 않았습니다.');
      return;
    }

    setIsExporting(true);
    setUploadProgress(0);

    try {
      // Get the scene from RoomScene component
      const scene = roomSceneRef.current.getScene();

      // Export to GLB
      const exporter = new GLTFExporter();

      const gltfData = await new Promise<ArrayBuffer>((resolve, reject) => {
        exporter.parse(
          scene,
          (gltf: any) => resolve(gltf as ArrayBuffer),
          (error: any) => reject(error),
          {
            binary: true,
            embedImages: true
          }
        );
      });

      setUploadProgress(50);

      // Create blob and call onComplete
      const blob = new Blob([gltfData], { type: 'model/gltf-binary' });

      // Call the parent's onComplete handler
      await onComplete(blob);

      setUploadProgress(100);
    } catch (error) {
      console.error('방 구조 생성 실패:', error);
      alert('방 구조 생성에 실패했습니다.');
    } finally {
      setIsExporting(false);
      setUploadProgress(0);
    }
  }, [onComplete]);

  return (
    <div className="room-builder">
      <div className="mb-6">
        <RoomTemplateSelector
          currentTemplate={currentTemplate}
          onTemplateChange={handleTemplateChange}
          customDimensions={customDimensions}
          onCustomDimensionsChange={setCustomDimensions}
        />
      </div>

      <div className="mb-6">
        <TextureGallery
          uploadedImages={uploadedImages}
          selectedImageId={selectedImageId}
          onImageSelect={setSelectedImageId}
          onImagesUpload={setUploadedImages}
        />
      </div>

      <div className="mb-4">
        <h3 className="text-sm font-semibold mb-2">타일 선택</h3>
        <p className="text-xs text-muted-foreground mb-2">
          선택된 타일: {selectedTiles.length}개
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

      {/* Hidden component to pass ref */}
      <div style={{ display: 'none' }}>
        <RoomScene
          ref={roomSceneRef}
          currentTemplate={currentTemplate}
          customDimensions={customDimensions}
          selectedTiles={selectedTiles}
          tileTextures={tileTextures}
          onTileClick={handleTileClick}
        />
      </div>
    </div>
  );
};

// Static property for 3D scene
RoomBuilder.Scene = RoomScene;

export default RoomBuilder;
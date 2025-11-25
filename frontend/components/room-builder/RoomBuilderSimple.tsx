'use client';

import React, { useState } from 'react';
import RoomTemplateSelector from './RoomTemplateSelector';
import TextureGallery from './TextureGallery';
import { RoomTemplate, UploadedImage } from './types';

interface RoomBuilderSimpleProps {
  projectId: number;
  projectName: string;
  onComplete: (glbBlob: Blob) => void;
  currentTemplate: RoomTemplate;
  onTemplateChange: (template: RoomTemplate) => void;
  customDimensions: { width: number; depth: number };
  onCustomDimensionsChange: (dims: { width: number; depth: number }) => void;
  selectedTiles: string[];
  tileTextures: Record<string, string>;
  onApplyTexture: (tileKeys: string[], textureUrl: string) => void;
  onRemoveTexture: (tileKeys: string[]) => void;
}

const RoomBuilderSimple: React.FC<RoomBuilderSimpleProps> = ({
  projectId,
  projectName,
  onComplete,
  currentTemplate,
  onTemplateChange,
  customDimensions,
  onCustomDimensionsChange,
  selectedTiles,
  tileTextures,
  onApplyTexture,
  onRemoveTexture,
}) => {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleApplyTexture = () => {
    if (!selectedImageId || selectedTiles.length === 0) {
      alert('텍스처와 타일을 선택해주세요.');
      return;
    }

    const selectedImage = uploadedImages.find(img => img.id === selectedImageId);
    if (!selectedImage) return;

    onApplyTexture(selectedTiles, selectedImage.url);
  };

  const handleRemoveTexture = () => {
    if (selectedTiles.length === 0) {
      alert('텍스처를 제거할 타일을 선택해주세요.');
      return;
    }

    onRemoveTexture(selectedTiles);
  };

  const handleCompleteRoom = () => {
    alert('방 구조 완료 기능은 아직 구현 중입니다.');
    // TODO: Implement GLB export and upload
  };

  return (
    <div className="room-builder">
      <div className="mb-6">
        <RoomTemplateSelector
          currentTemplate={currentTemplate}
          onTemplateChange={onTemplateChange}
          customDimensions={customDimensions}
          onCustomDimensionsChange={onCustomDimensionsChange}
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
            <span>저장 중...</span>
          ) : (
            <span>✅ 방 구조 완료</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default RoomBuilderSimple;
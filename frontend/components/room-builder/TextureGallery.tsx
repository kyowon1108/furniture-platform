'use client';

import React, { useRef, useCallback } from 'react';
import { UploadedImage } from './types';

interface TextureGalleryProps {
  uploadedImages: UploadedImage[];
  selectedImageId: string | null;
  onImageSelect: (id: string | null) => void;
  onImagesUpload: (images: UploadedImage[]) => void;
}

const TextureGallery: React.FC<TextureGalleryProps> = ({
  uploadedImages,
  selectedImageId,
  onImageSelect,
  onImagesUpload,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: UploadedImage[] = [];

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const url = event.target?.result as string;
        const id = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        newImages.push({
          id,
          url,
          name: file.name,
          file,
        });

        if (newImages.length === files.length) {
          onImagesUpload([...uploadedImages, ...newImages]);
        }
      };
      reader.readAsDataURL(file);
    });
  }, [uploadedImages, onImagesUpload]);

  const handleImageClick = useCallback((imageId: string) => {
    if (selectedImageId === imageId) {
      onImageSelect(null);
    } else {
      onImageSelect(imageId);
    }
  }, [selectedImageId, onImageSelect]);

  const handleDeleteImage = useCallback((imageId: string) => {
    const filtered = uploadedImages.filter(img => img.id !== imageId);
    onImagesUpload(filtered);
    if (selectedImageId === imageId) {
      onImageSelect(null);
    }
  }, [uploadedImages, selectedImageId, onImagesUpload, onImageSelect]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold">텍스처 라이브러리</label>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded"
        >
          이미지 업로드
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />

      <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto p-2 bg-muted/50 rounded-md">
        {uploadedImages.length === 0 ? (
          <div className="col-span-3 text-center py-8 text-xs text-muted-foreground">
            텍스처 이미지를 업로드해주세요
          </div>
        ) : (
          uploadedImages.map((image) => (
            <div
              key={image.id}
              className={`relative group cursor-pointer rounded overflow-hidden ${
                selectedImageId === image.id
                  ? 'ring-2 ring-primary'
                  : 'hover:ring-2 hover:ring-primary/50'
              }`}
              onClick={() => handleImageClick(image.id)}
            >
              <img
                src={image.url}
                alt={image.name}
                className="w-full h-20 object-cover"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteImage(image.id);
                }}
                className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
              {selectedImageId === image.id && (
                <div className="absolute inset-0 bg-primary/20 pointer-events-none" />
              )}
            </div>
          ))
        )}
      </div>

      {selectedImageId && (
        <div className="text-xs text-muted-foreground">
          선택됨: {uploadedImages.find(img => img.id === selectedImageId)?.name}
        </div>
      )}
    </div>
  );
};

export default TextureGallery;
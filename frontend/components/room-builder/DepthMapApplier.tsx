'use client';

import React, { useState, useCallback } from 'react';
import { useFreeBuildStore } from '@/store/freeBuildStore';
import { useToastStore } from '@/store/toastStore';

interface DepthMapApplierProps {
  className?: string;
}

const DepthMapApplier: React.FC<DepthMapApplierProps> = ({ className = '' }) => {
  const {
    tiles,
    selectedTileIds,
    applyDepthMapToSelected,
  } = useFreeBuildStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [displacementScale, setDisplacementScale] = useState(0.1);
  const [progress, setProgress] = useState(0);

  // 선택된 타일들의 텍스처 URL 수집
  const getSelectedTextureUrls = useCallback(() => {
    const selectedTiles = tiles.filter((t) => selectedTileIds.includes(t.id));
    const textureUrls = new Set<string>();

    selectedTiles.forEach((tile) => {
      if (tile.textureUrl) {
        textureUrls.add(tile.textureUrl);
      }
    });

    return Array.from(textureUrls);
  }, [tiles, selectedTileIds]);

  // Depth Map 생성 및 적용
  const handleGenerateDepth = async () => {
    if (selectedTileIds.length === 0) {
      useToastStore.getState().addToast('타일을 선택해주세요', 'warning');
      return;
    }

    const textureUrls = getSelectedTextureUrls();
    if (textureUrls.length === 0) {
      useToastStore.getState().addToast(
        '선택된 타일에 텍스처가 없습니다. 먼저 텍스처를 적용해주세요.',
        'warning'
      );
      return;
    }

    setIsGenerating(true);
    setProgress(0);

    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8008/api/v1';

      const totalUrls = textureUrls.length;
      let processedUrls = 0;

      // 각 텍스처 URL에 대해 Depth Map 생성
      for (const textureUrl of textureUrls) {
        try {
          const response = await fetch(`${apiUrl}/depth/generate-depth-from-url`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token && { Authorization: `Bearer ${token}` }),
            },
            body: JSON.stringify({
              image_url: textureUrl,
              output_format: 'png',
            }),
          });

          if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: '서버 오류' }));
            console.error(`Depth generation failed for ${textureUrl}:`, error);
            continue;
          }

          const data = await response.json();

          if (data.depth_map_url) {
            // 해당 텍스처를 가진 선택된 타일들에 Depth Map 적용
            const affectedTileIds = tiles
              .filter((t) =>
                selectedTileIds.includes(t.id) && t.textureUrl === textureUrl
              )
              .map((t) => t.id);

            if (affectedTileIds.length > 0) {
              // 각 타일 개별 업데이트
              affectedTileIds.forEach((tileId) => {
                const tile = tiles.find((t) => t.id === tileId);
                if (tile) {
                  useFreeBuildStore.getState().updateTile(tileId, {
                    depthMapUrl: data.depth_map_url,
                    displacementScale,
                  });
                }
              });
            }
          }

          processedUrls++;
          setProgress(Math.round((processedUrls / totalUrls) * 100));
        } catch (error) {
          console.error(`Error processing ${textureUrl}:`, error);
        }
      }

      useToastStore.getState().addToast(
        `${processedUrls}개 텍스처에 Depth Map 적용 완료`,
        'success'
      );
    } catch (error) {
      console.error('Depth generation error:', error);
      useToastStore.getState().addToast(
        error instanceof Error ? error.message : 'Depth Map 생성 실패',
        'error'
      );
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  };

  // Depth Map 제거
  const handleRemoveDepth = () => {
    if (selectedTileIds.length === 0) {
      useToastStore.getState().addToast('타일을 선택해주세요', 'warning');
      return;
    }

    selectedTileIds.forEach((tileId) => {
      useFreeBuildStore.getState().updateTile(tileId, {
        depthMapUrl: undefined,
        displacementScale: undefined,
      });
    });

    useToastStore.getState().addToast(
      `${selectedTileIds.length}개 타일에서 Depth Map 제거됨`,
      'info'
    );
  };

  // Displacement Scale 일괄 적용
  const handleUpdateScale = () => {
    if (selectedTileIds.length === 0) return;

    selectedTileIds.forEach((tileId) => {
      const tile = tiles.find((t) => t.id === tileId);
      if (tile?.depthMapUrl) {
        useFreeBuildStore.getState().updateTile(tileId, {
          displacementScale,
        });
      }
    });

    useToastStore.getState().addToast('Displacement 강도 업데이트됨', 'info');
  };

  const selectedWithTexture = tiles.filter(
    (t) => selectedTileIds.includes(t.id) && t.textureUrl
  ).length;

  const selectedWithDepth = tiles.filter(
    (t) => selectedTileIds.includes(t.id) && t.depthMapUrl
  ).length;

  return (
    <div className={`depth-map-applier p-4 bg-purple-50 rounded-lg border border-purple-200 ${className}`}>
      <div className="text-sm font-semibold mb-3 text-purple-700">
        🗻 AI Depth Map
      </div>

      {/* 정보 표시 */}
      <div className="text-xs text-gray-600 mb-3 space-y-1">
        <div>선택된 타일: {selectedTileIds.length}개</div>
        <div>텍스처 있는 타일: {selectedWithTexture}개</div>
        <div>Depth Map 있는 타일: {selectedWithDepth}개</div>
      </div>

      {/* Displacement Scale 슬라이더 */}
      <div className="mb-3">
        <label className="text-xs text-gray-600 block mb-1">
          Displacement 강도: {displacementScale.toFixed(2)}
        </label>
        <input
          type="range"
          min="0"
          max="0.5"
          step="0.01"
          value={displacementScale}
          onChange={(e) => setDisplacementScale(parseFloat(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>평면</span>
          <span>입체</span>
        </div>
      </div>

      {/* 버튼들 */}
      <div className="space-y-2">
        <button
          onClick={handleGenerateDepth}
          disabled={isGenerating || selectedWithTexture === 0}
          className="w-full px-3 py-2 bg-purple-600 text-white rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <span>
              ⏳ 생성 중... {progress}%
            </span>
          ) : (
            '✨ 선택 타일에 Depth Map 생성'
          )}
        </button>

        {selectedWithDepth > 0 && (
          <>
            <button
              onClick={handleUpdateScale}
              className="w-full px-3 py-2 bg-purple-500 text-white rounded text-sm"
            >
              📏 강도 일괄 적용
            </button>

            <button
              onClick={handleRemoveDepth}
              className="w-full px-3 py-2 bg-gray-500 text-white rounded text-sm"
            >
              🗑️ Depth Map 제거
            </button>
          </>
        )}
      </div>

      {/* 안내 */}
      <div className="mt-3 text-xs text-gray-500">
        <details>
          <summary className="cursor-pointer hover:text-gray-700">사용법</summary>
          <div className="mt-2 space-y-1 pl-2">
            <div>1. 타일에 텍스처를 먼저 적용하세요</div>
            <div>2. Depth Map을 생성할 타일을 선택하세요</div>
            <div>3. 강도를 조절하고 생성 버튼을 클릭하세요</div>
            <div>4. AI가 텍스처에서 깊이 정보를 추출합니다</div>
          </div>
        </details>
      </div>
    </div>
  );
};

export default DepthMapApplier;

'use client';

import React from 'react';
import { RoomTemplate, ROOM_TEMPLATES } from './types';

interface RoomTemplateSelectorProps {
  currentTemplate: RoomTemplate;
  onTemplateChange: (template: RoomTemplate) => void;
  customDimensions: { width: number; depth: number };
  onCustomDimensionsChange: (dimensions: { width: number; depth: number }) => void;
  hideDropdown?: boolean;
}

const RoomTemplateSelector: React.FC<RoomTemplateSelectorProps> = ({
  currentTemplate,
  onTemplateChange,
  customDimensions,
  onCustomDimensionsChange,
  hideDropdown = false,
}) => {
  return (
    <div className="space-y-4">
      {!hideDropdown && (
        <div>
          <label className="text-sm font-semibold block mb-2">방 템플릿</label>
          <select
            value={currentTemplate}
            onChange={(e) => onTemplateChange(e.target.value as RoomTemplate)}
            className="w-full px-3 py-2 border border-zinc-700 rounded-md bg-zinc-800 text-white"
          >
            <option value="rectangular">{ROOM_TEMPLATES.rectangular.displayName} ({ROOM_TEMPLATES.rectangular.width}m × {ROOM_TEMPLATES.rectangular.depth}m)</option>
            <option value="small_studio">{ROOM_TEMPLATES.small_studio.displayName} ({ROOM_TEMPLATES.small_studio.width}m × {ROOM_TEMPLATES.small_studio.depth}m)</option>
            <option value="square">{ROOM_TEMPLATES.square.displayName} ({ROOM_TEMPLATES.square.width}m × {ROOM_TEMPLATES.square.depth}m)</option>
            <option value="corridor">{ROOM_TEMPLATES.corridor.displayName} ({ROOM_TEMPLATES.corridor.width}m × {ROOM_TEMPLATES.corridor.depth}m)</option>
            <option value="custom">{ROOM_TEMPLATES.custom.displayName}</option>
            <option value="free_build">{ROOM_TEMPLATES.free_build.displayName}</option>
          </select>
        </div>
      )}

      {currentTemplate === 'custom' && (
        <div className="space-y-3 p-4 bg-zinc-800/50 rounded-md">
          <h4 className="text-sm font-semibold">사용자 정의 크기</h4>

          <div>
            <label className="text-xs text-zinc-400 block mb-1">
              너비: {customDimensions.width.toFixed(1)}m
            </label>
            <input
              type="range"
              min="2"
              max="10"
              step="0.5"
              value={customDimensions.width}
              onChange={(e) =>
                onCustomDimensionsChange({
                  ...customDimensions,
                  width: parseFloat(e.target.value),
                })
              }
              className="w-full"
            />
          </div>

          <div>
            <label className="text-xs text-zinc-400 block mb-1">
              깊이: {customDimensions.depth.toFixed(1)}m
            </label>
            <input
              type="range"
              min="2"
              max="10"
              step="0.5"
              value={customDimensions.depth}
              onChange={(e) =>
                onCustomDimensionsChange({
                  ...customDimensions,
                  depth: parseFloat(e.target.value),
                })
              }
              className="w-full"
            />
          </div>

          <div className="text-xs text-zinc-400">
            높이: 2.5m (고정)
          </div>
        </div>
      )}

      {currentTemplate === 'free_build' && (
        <div className="p-4 bg-blue-900/30 border border-blue-500/30 rounded-md">
          <div className="text-sm font-semibold text-blue-300 mb-2">🏗️ 자유 건축 모드</div>
          <div className="text-xs text-zinc-400 space-y-1">
            <div>• 그리드 위에 자유롭게 바닥 타일을 배치하세요</div>
            <div>• 벽은 바닥 경계에 자동으로 생성됩니다</div>
            <div>• L자형, ㄷ자형 등 다양한 모양의 방을 만들 수 있습니다</div>
          </div>
        </div>
      )}

      {currentTemplate !== 'custom' && currentTemplate !== 'free_build' && (
        <div className="text-xs text-zinc-400 p-3 bg-zinc-800/50 rounded-md">
          <div>크기: {ROOM_TEMPLATES[currentTemplate].width}m × {ROOM_TEMPLATES[currentTemplate].depth}m</div>
          <div>높이: {ROOM_TEMPLATES[currentTemplate].wallHeight}m</div>
        </div>
      )}
    </div>
  );
};

export default RoomTemplateSelector;
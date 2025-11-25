'use client';

import React from 'react';
import { RoomTemplate, ROOM_TEMPLATES } from './types';

interface RoomTemplateSelectorProps {
  currentTemplate: RoomTemplate;
  onTemplateChange: (template: RoomTemplate) => void;
  customDimensions: { width: number; depth: number };
  onCustomDimensionsChange: (dimensions: { width: number; depth: number }) => void;
}

const RoomTemplateSelector: React.FC<RoomTemplateSelectorProps> = ({
  currentTemplate,
  onTemplateChange,
  customDimensions,
  onCustomDimensionsChange,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-semibold block mb-2">방 템플릿</label>
        <select
          value={currentTemplate}
          onChange={(e) => onTemplateChange(e.target.value as RoomTemplate)}
          className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
        >
          <option value="small_studio">{ROOM_TEMPLATES.small_studio.displayName} ({ROOM_TEMPLATES.small_studio.width}m × {ROOM_TEMPLATES.small_studio.depth}m)</option>
          <option value="rectangular">{ROOM_TEMPLATES.rectangular.displayName} ({ROOM_TEMPLATES.rectangular.width}m × {ROOM_TEMPLATES.rectangular.depth}m)</option>
          <option value="lshaped">{ROOM_TEMPLATES.lshaped.displayName} ({ROOM_TEMPLATES.lshaped.width}m × {ROOM_TEMPLATES.lshaped.depth}m)</option>
          <option value="square">{ROOM_TEMPLATES.square.displayName} ({ROOM_TEMPLATES.square.width}m × {ROOM_TEMPLATES.square.depth}m)</option>
          <option value="ushaped">{ROOM_TEMPLATES.ushaped.displayName} ({ROOM_TEMPLATES.ushaped.width}m × {ROOM_TEMPLATES.ushaped.depth}m)</option>
          <option value="corridor">{ROOM_TEMPLATES.corridor.displayName} ({ROOM_TEMPLATES.corridor.width}m × {ROOM_TEMPLATES.corridor.depth}m)</option>
          <option value="custom">{ROOM_TEMPLATES.custom.displayName}</option>
        </select>
      </div>

      {currentTemplate === 'custom' && (
        <div className="space-y-3 p-4 bg-muted/50 rounded-md">
          <h4 className="text-sm font-semibold">사용자 정의 크기</h4>

          <div>
            <label className="text-xs text-muted-foreground block mb-1">
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
            <label className="text-xs text-muted-foreground block mb-1">
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

          <div className="text-xs text-muted-foreground">
            높이: 2.5m (고정)
          </div>
        </div>
      )}

      {currentTemplate !== 'custom' && (
        <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-md">
          <div>크기: {ROOM_TEMPLATES[currentTemplate].width}m × {ROOM_TEMPLATES[currentTemplate].depth}m</div>
          <div>높이: {ROOM_TEMPLATES[currentTemplate].wallHeight}m</div>
        </div>
      )}
    </div>
  );
};

export default RoomTemplateSelector;
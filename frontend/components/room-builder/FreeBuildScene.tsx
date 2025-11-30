'use client';

import React, { useRef, useMemo, useCallback, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { useThree, ThreeEvent } from '@react-three/fiber';
import { useFreeBuildStore } from '@/store/freeBuildStore';
import {
  FreeBuildTile,
  BuildTool,
  WallDirection,
  WALL_ROTATIONS,
  calculateTilePosition,
} from '@/types/freeBuild';

// 단일 타일 메쉬 컴포넌트
const FreeBuildTileMesh: React.FC<{
  tile: FreeBuildTile;
  tileSize: number;
  isSelected: boolean;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
}> = ({ tile, tileSize, isSelected, onClick }) => {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  // 텍스처 로딩
  useEffect(() => {
    if (tile.textureUrl) {
      const loader = new THREE.TextureLoader();
      loader.load(tile.textureUrl, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        setTexture(tex);
      });
    } else {
      setTexture(null);
    }
  }, [tile.textureUrl]);

  // 위치 계산
  const position = useMemo(() => {
    const config = useFreeBuildStore.getState().config;
    return calculateTilePosition(tile, config);
  }, [tile]);

  // 회전 계산
  const rotation = useMemo((): [number, number, number] => {
    if (tile.type === 'floor') {
      return [-Math.PI / 2, 0, 0];
    }
    return WALL_ROTATIONS[tile.wallDirection || 'north'];
  }, [tile.type, tile.wallDirection]);

  // 색상 결정
  const color = useMemo(() => {
    if (isSelected) return '#4CAF50';
    if (texture) return '#ffffff';
    return tile.type === 'floor' ? '#d4a574' : '#f5f5f5';
  }, [isSelected, texture, tile.type]);

  return (
    <mesh
      position={position}
      rotation={rotation}
      onClick={onClick}
      userData={{ tileId: tile.id, tileType: tile.type }}
    >
      <planeGeometry args={[tileSize, tileSize]} />
      <meshStandardMaterial
        color={color}
        map={texture}
        side={THREE.DoubleSide}
        transparent={isSelected}
        opacity={isSelected ? 0.8 : 1}
        roughness={0.8}
        metalness={0}
      />
    </mesh>
  );
};

// 그리드 헬퍼 컴포넌트
const GridHelper: React.FC<{
  gridSize: number;
  tileSize: number;
  visible: boolean;
}> = ({ gridSize, tileSize, visible }) => {
  if (!visible) return null;

  const totalSize = gridSize * tileSize;
  const divisions = gridSize;

  return (
    <group position={[totalSize / 2, 0.01, totalSize / 2]}>
      <gridHelper
        args={[totalSize, divisions, '#666666', '#333333']}
      />
    </group>
  );
};

// 그리드 클릭 감지용 평면
const ClickPlane: React.FC<{
  gridSize: number;
  tileSize: number;
  onGridClick: (gridX: number, gridZ: number, e: ThreeEvent<MouseEvent>) => void;
}> = ({ gridSize, tileSize, onGridClick }) => {
  const totalSize = gridSize * tileSize;

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();

    // 타일 클릭이 아닌 경우에만 처리
    if (e.object.userData.tileId) return;

    const point = e.point;
    const gridX = Math.floor(point.x / tileSize);
    const gridZ = Math.floor(point.z / tileSize);

    // 범위 확인
    if (gridX >= 0 && gridX < gridSize && gridZ >= 0 && gridZ < gridSize) {
      onGridClick(gridX, gridZ, e);
    }
  }, [gridSize, tileSize, onGridClick]);

  return (
    <mesh
      position={[totalSize / 2, -0.01, totalSize / 2]}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={handleClick}
      visible={false}
    >
      <planeGeometry args={[totalSize, totalSize]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
};

// 벽 방향 결정 (마우스 위치 기반)
const determineWallDirection = (
  clickPoint: THREE.Vector3,
  gridX: number,
  gridZ: number,
  tileSize: number
): WallDirection => {
  const centerX = gridX * tileSize + tileSize / 2;
  const centerZ = gridZ * tileSize + tileSize / 2;

  const dx = clickPoint.x - centerX;
  const dz = clickPoint.z - centerZ;

  // 더 가까운 엣지 방향 결정
  if (Math.abs(dx) > Math.abs(dz)) {
    return dx > 0 ? 'east' : 'west';
  } else {
    return dz > 0 ? 'south' : 'north';
  }
};

export interface FreeBuildSceneRef {
  getScene: () => THREE.Group | null;
}

interface FreeBuildSceneProps {
  onTileClick?: (tileId: string) => void;
}

const FreeBuildScene = forwardRef<FreeBuildSceneRef, FreeBuildSceneProps>(
  ({ onTileClick }, ref) => {
    const groupRef = useRef<THREE.Group>(null);
    const lastSelectedTileRef = useRef<string | null>(null);

    const {
      tiles,
      selectedTileIds,
      currentTool,
      config,
      showGrid,
      addFloorTile,
      addWallTile,
      removeTilesAt,
      selectTile,
      selectTilesInRange,
      clearSelection,
    } = useFreeBuildStore();

    // Scene 참조 노출
    useImperativeHandle(ref, () => ({
      getScene: () => groupRef.current,
    }));

    // 그리드 클릭 처리
    const handleGridClick = useCallback(
      (gridX: number, gridZ: number, e: ThreeEvent<MouseEvent>) => {
        switch (currentTool) {
          case 'floor':
            addFloorTile(gridX, gridZ);
            break;

          case 'wall':
            // 클릭 위치에 따라 벽 방향 결정
            const direction = determineWallDirection(
              e.point,
              gridX,
              gridZ,
              config.tileSize
            );
            // 모든 높이의 벽 타일 추가
            for (let y = 0; y < config.tilesPerWallHeight; y++) {
              addWallTile(gridX, gridZ, direction, y);
            }
            break;

          case 'eraser':
            removeTilesAt(gridX, gridZ);
            break;

          case 'select':
            clearSelection();
            break;
        }
      },
      [currentTool, config, addFloorTile, addWallTile, removeTilesAt, clearSelection]
    );

    // 타일 클릭 처리
    const handleTileClick = useCallback(
      (tileId: string, e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();

        const tile = tiles.find((t) => t.id === tileId);
        if (!tile) return;

        switch (currentTool) {
          case 'select':
            if (e.shiftKey && lastSelectedTileRef.current) {
              // 범위 선택
              selectTilesInRange(lastSelectedTileRef.current, tileId);
            } else {
              // 단일/다중 선택
              selectTile(tileId, e.ctrlKey || e.metaKey);
            }
            lastSelectedTileRef.current = tileId;
            break;

          case 'eraser':
            removeTilesAt(tile.gridX, tile.gridZ);
            break;

          case 'floor':
          case 'wall':
            // 이미 타일이 있는 곳에서는 아무 것도 안 함
            break;
        }

        onTileClick?.(tileId);
      },
      [tiles, currentTool, selectTile, selectTilesInRange, removeTilesAt, onTileClick]
    );

    // 커서 스타일 변경
    useEffect(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return;

      switch (currentTool) {
        case 'select':
          canvas.style.cursor = 'default';
          break;
        case 'floor':
        case 'wall':
          canvas.style.cursor = 'crosshair';
          break;
        case 'eraser':
          canvas.style.cursor = 'not-allowed';
          break;
      }

      return () => {
        canvas.style.cursor = 'default';
      };
    }, [currentTool]);

    return (
      <group ref={groupRef}>
        {/* 그리드 헬퍼 */}
        <GridHelper
          gridSize={config.gridSize}
          tileSize={config.tileSize}
          visible={showGrid}
        />

        {/* 클릭 감지용 평면 */}
        <ClickPlane
          gridSize={config.gridSize}
          tileSize={config.tileSize}
          onGridClick={handleGridClick}
        />

        {/* 타일들 */}
        {tiles.map((tile) => (
          <FreeBuildTileMesh
            key={tile.id}
            tile={tile}
            tileSize={config.tileSize}
            isSelected={selectedTileIds.includes(tile.id)}
            onClick={(e) => handleTileClick(tile.id, e)}
          />
        ))}
      </group>
    );
  }
);

FreeBuildScene.displayName = 'FreeBuildScene';

export default FreeBuildScene;

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { projectsAPI } from '@/lib/api';
import { useToastStore } from '@/store/toastStore';
import RoomTemplateSelector from '@/components/room-builder/RoomTemplateSelector';
import TextureGallery from '@/components/room-builder/TextureGallery';
import RoomScene, { RoomSceneHandle } from '@/components/room-builder/RoomScene';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ToastContainer } from '@/components/ui/Toast';
import { getAuthToken } from '@/lib/authToken';
import { RoomTemplate, UploadedImage, ROOM_TEMPLATES } from '@/components/room-builder/types';
import type { ProjectDetail } from '@/types/api';
// import { optimizeSceneTextures } from '@/utils/textureOptimizer';
import { optimizeSceneTextures } from '@/utils/optimizedTextureAtlas';
import {
  FreeBuildTile,
  WallDirection,
  generateTileId,
  NEIGHBOR_OFFSETS,
  DEFAULT_FREE_BUILD_CONFIG,
} from '@/types/freeBuild';

const TILE_SIZE = 0.5;
const WALL_HEIGHT = 2.5;

// Build tool type
type BuildTool = 'select' | 'floor' | 'eraser';
type TileSelectionEvent = {
  shiftKey?: boolean;
  nativeEvent?: {
    shiftKey?: boolean;
  };
};

type SceneWithExtras = THREE.Group & {
  extras?: {
    dimensions: {
      width: number;
      height: number;
      depth: number;
    };
  };
};

const debugRoomBuilder = (..._args: unknown[]) => {};

type RoomBuilderProject = Pick<ProjectDetail, 'id' | 'name' | 'description'> & Partial<ProjectDetail>;

export default function RoomBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = Number(params.projectId);
  const addToast = useToastStore((state) => state.addToast);

  const [project, setProject] = useState<RoomBuilderProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Room builder state
  const [hasSelectedTemplate, setHasSelectedTemplate] = useState(false);
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

  // Custom mode - Free Build state
  const [currentTool, setCurrentTool] = useState<BuildTool>('floor');
  const [customTiles, setCustomTiles] = useState<FreeBuildTile[]>([]);
  const [showGrid, setShowGrid] = useState(true);
  const [isAutoWallEnabled, setIsAutoWallEnabled] = useState(true);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

  const roomSceneRef = useRef<RoomSceneHandle | null>(null);
  const lastSelectedTileRef = useRef<string | null>(null);

  useEffect(() => {
    if (isNaN(projectId)) {
      console.error('Invalid project ID');
      setError('유효하지 않은 프로젝트 ID입니다.');
      setLoading(false);
      return;
    }

    const loadProject = async () => {
      try {
        const token = getAuthToken();
        if (!token) {
          console.warn('No token found, using demo mode');
          addToast('로그인이 필요합니다. 데모 모드로 진행합니다.', 'warning');
          setProject({
            id: projectId,
            name: 'Demo Project',
            description: 'Testing room builder'
          });
          setLoading(false);
          return;
        }

        const projectData = await projectsAPI.get(projectId);
        setProject(projectData);

        // If project already has a 3D file, we could potentially load it or skip selection.
        // But per user request, if they are here, they likely want to (re)design.
        // We just ensure loading finishes.
        setLoading(false);
      } catch (err) {
        console.error('Failed to load project:', err);
        addToast('프로젝트를 불러올 수 없어 데모 모드로 진행합니다.', 'warning');
        setProject({
          id: projectId,
          name: `Project ${projectId}`,
          description: 'Room builder demo'
        });
        setLoading(false);
      }
    };

    loadProject();
  }, [projectId, addToast]);

  // Keyboard shortcuts for custom mode (F/E/V keys)
  useEffect(() => {
    if (currentTemplate !== 'custom') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'f':
          setCurrentTool('floor');
          break;
        case 'e':
          setCurrentTool('eraser');
          break;
        case 'v':
          setCurrentTool('select');
          break;
        case 'g':
          setShowGrid(prev => !prev);
          break;
        case 'escape':
          setSelectedTiles([]);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTemplate]);

  // Generate walls from floor tiles (auto-wall feature)
  const generateWallsFromFloor = useCallback((floorTiles: FreeBuildTile[]): FreeBuildTile[] => {
    const floorSet = new Set(floorTiles.map(t => `${t.gridX},${t.gridZ}`));
    const newWalls: FreeBuildTile[] = [];
    const tilesPerWallHeight = Math.floor(WALL_HEIGHT / TILE_SIZE);

    floorTiles.forEach((floor) => {
      const { gridX, gridZ } = floor;

      NEIGHBOR_OFFSETS.forEach(({ dx, dz, wallDir }) => {
        const neighborKey = `${gridX + dx},${gridZ + dz}`;

        // If no floor tile at neighbor position, generate wall
        if (!floorSet.has(neighborKey)) {
          for (let y = 0; y < tilesPerWallHeight; y++) {
            const wallId = generateTileId('wall', gridX, gridZ, y, wallDir);

            // Avoid duplicates
            if (!newWalls.some(w => w.id === wallId)) {
              newWalls.push({
                id: wallId,
                type: 'wall',
                gridX,
                gridZ,
                gridY: y,
                wallDirection: wallDir,
              });
            }
          }
        }
      });
    });

    return newWalls;
  }, []);

  // Handle grid click for placing/removing tiles in custom mode
  const handleGridClick = useCallback((gridX: number, gridZ: number) => {
    if (currentTemplate !== 'custom') return;

    if (currentTool === 'floor') {
      const tileId = generateTileId('floor', gridX, gridZ);

      // Check if tile already exists
      if (customTiles.some(t => t.id === tileId)) {
        return; // Tile already exists
      }

      const newFloorTile: FreeBuildTile = {
        id: tileId,
        type: 'floor',
        gridX,
        gridZ,
      };

      setCustomTiles(prev => {
        const newFloorTiles = [...prev.filter(t => t.type === 'floor'), newFloorTile];

        if (isAutoWallEnabled) {
          // Regenerate walls based on new floor layout
          const walls = generateWallsFromFloor(newFloorTiles);
          return [...newFloorTiles, ...walls];
        }

        return [...prev, newFloorTile];
      });
    }
  }, [currentTemplate, currentTool, customTiles, isAutoWallEnabled, generateWallsFromFloor]);

  // Handle tile click in custom mode with dynamic tiles
  const handleCustomTileClick = useCallback((tileId: string, event?: TileSelectionEvent) => {
    // Only handle custom mode with dynamic tiles here
    if (currentTemplate !== 'custom' || !customTiles.length) {
      return; // Will be handled by handleTileClick for non-custom modes
    }

    if (currentTool === 'eraser') {
      // Remove tile(s) at this position
      const tile = customTiles.find(t => t.id === tileId);
      if (tile) {
        setCustomTiles(prev => {
          // Remove all tiles at this grid position (floor + walls)
          const remainingTiles = prev.filter(t =>
            !(t.gridX === tile.gridX && t.gridZ === tile.gridZ)
          );

          if (isAutoWallEnabled) {
            // Regenerate walls based on remaining floor tiles
            const floorTiles = remainingTiles.filter(t => t.type === 'floor');
            const walls = generateWallsFromFloor(floorTiles);
            return [...floorTiles, ...walls];
          }

          return remainingTiles;
        });
      }
    } else if (currentTool === 'select') {
      // Toggle tile selection
      const shiftKey = event?.shiftKey || (event?.nativeEvent && event?.nativeEvent.shiftKey);

      if (shiftKey) {
        // Select all tiles of same type
        const tile = customTiles.find(t => t.id === tileId);
        if (tile) {
          const sameTileIds = customTiles
            .filter(t => t.type === tile.type)
            .map(t => t.id);
          setSelectedTiles(sameTileIds);
        }
      } else {
        setSelectedTiles(prev =>
          prev.includes(tileId)
            ? prev.filter(t => t !== tileId)
            : [...prev, tileId]
        );
      }
    }
  }, [currentTemplate, currentTool, customTiles, isAutoWallEnabled, generateWallsFromFloor]);

  // Get all tiles for a surface
  const getAllTilesForSurface = useCallback((tileKey: string) => {
    const parts = tileKey.split('-');
    const type = parts[0];
    const tiles: string[] = [];

    if (type === 'floor') {
      // Get all floor tiles
      const template = ROOM_TEMPLATES[currentTemplate];
      const dimensions = currentTemplate === 'custom' ? customDimensions :
        { width: template.width, depth: template.depth };
      const xCount = Math.floor(dimensions.width / TILE_SIZE);
      const zCount = Math.floor(dimensions.depth / TILE_SIZE);

      // Regular floor only - L-shaped and U-shaped removed
      for (let x = 0; x < xCount; x++) {
        for (let z = 0; z < zCount; z++) {
          tiles.push(`floor-${x}-${z}`);
        }
      }
    } else if (type === 'wall') {
      // Get all tiles for this wall side
      const wallIdentifier = parts.slice(1).join('-'); // Get the full wall identifier
      const template = ROOM_TEMPLATES[currentTemplate];
      const dimensions = currentTemplate === 'custom' ? customDimensions :
        { width: template.width, depth: template.depth };
      const xCount = Math.floor(dimensions.width / TILE_SIZE);
      const zCount = Math.floor(dimensions.depth / TILE_SIZE);
      const yCount = Math.floor(WALL_HEIGHT / TILE_SIZE);

      // Parse the wall type from the clicked tile
      const wallType = parts[1]; // 'back', 'front', 'left', 'right'

      for (let y = 0; y < yCount; y++) {
        if (wallType === 'back') {
          // Back wall is always full width
          for (let x = 0; x < xCount; x++) {
            tiles.push(`wall-back-${x}-${y}`);
          }
        } else if (wallType === 'front') {
          // Regular front wall only - L-shaped and U-shaped removed
          for (let x = 0; x < xCount; x++) {
            tiles.push(`wall-front-${x}-${y}`);
          }
        } else if (wallType === 'left') {
          // Left wall is always full depth
          for (let z = 0; z < zCount; z++) {
            tiles.push(`wall-left-${z}-${y}`);
          }
        } else if (wallType === 'right') {
          // Regular right wall only - L-shaped removed
          for (let z = 0; z < zCount; z++) {
            tiles.push(`wall-right-${z}-${y}`);
          }
        }
        // Inner walls removed - only support rectangular rooms
      }
    }

    return tiles;
  }, [currentTemplate, customDimensions]);

  // Handle tile selection
  const handleTileClick = useCallback((tileKey: string, event?: TileSelectionEvent) => {
    const shiftKey = event?.shiftKey || (event?.nativeEvent && event?.nativeEvent.shiftKey);

    if (shiftKey) {
      // Select entire surface with Shift+Click
      const surfaceTiles = getAllTilesForSurface(tileKey);
      setSelectedTiles(surfaceTiles);
    } else {
      // Toggle selection for single tile
      setSelectedTiles(prev =>
        prev.includes(tileKey)
          ? prev.filter(t => t !== tileKey)
          : [...prev, tileKey]
      );
    }

    lastSelectedTileRef.current = tileKey;
  }, [getAllTilesForSurface]);

  // Apply texture to selected tiles
  const handleApplyTexture = useCallback(() => {
    if (!selectedImageId || selectedTiles.length === 0) {
      addToast('텍스처와 타일을 먼저 선택해주세요.', 'warning');
      return;
    }

    const selectedImage = uploadedImages.find(img => img.id === selectedImageId);
    if (!selectedImage) return;

    const newTextures = { ...tileTextures };
    selectedTiles.forEach(tileKey => {
      newTextures[tileKey] = selectedImage.url;
    });

    setTileTextures(newTextures);
    addToast(`텍스처를 ${selectedTiles.length}개 타일에 적용했습니다.`, 'success');

    // Clear selection after applying texture
    setSelectedTiles([]);
  }, [selectedImageId, selectedTiles, uploadedImages, tileTextures, addToast]);

  // Remove texture from selected tiles
  const handleRemoveTexture = useCallback(() => {
    if (selectedTiles.length === 0) {
      addToast('텍스처를 제거할 타일을 먼저 선택해주세요.', 'warning');
      return;
    }

    const newTextures = { ...tileTextures };
    selectedTiles.forEach(tileKey => {
      delete newTextures[tileKey];
    });

    setTileTextures(newTextures);

    // Clear selection after removing texture
    setSelectedTiles([]);
    addToast(`텍스처를 ${selectedTiles.length}개 타일에서 제거했습니다.`, 'success');
  }, [selectedTiles, tileTextures, addToast]);

  // Generate AI texture
  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) {
      addToast('프롬프트를 입력해주세요.', 'warning');
      return;
    }

    setIsGenerating(true);
    debugRoomBuilder('AI texture generation started', aiPrompt);

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

      debugRoomBuilder('AI response status', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: '서버 오류' }));
        throw new Error(errorData.detail || `서버 오류 (${response.status})`);
      }

      const data = await response.json();
      debugRoomBuilder('AI texture generation completed');

      if (data.texture_url) {
        const newImage: UploadedImage = {
          id: `ai_${Date.now()}`,
          url: data.texture_url,
          name: `AI: ${aiPrompt.substring(0, 20)}...`,
        };

        setUploadedImages(prev => [...prev, newImage]);
        setSelectedImageId(newImage.id);
        setAiPrompt('');
        addToast('AI 마감재 이미지를 생성했습니다.', 'success');
      }
    } catch (error) {
      console.error('[ERROR] AI 생성 실패:', error);
      addToast(error instanceof Error ? error.message : 'AI 생성에 실패했습니다.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Complete room and export GLB
  const handleRoomComplete = async () => {
    if (!roomSceneRef.current) {
      addToast('3D 씬이 아직 준비되지 않았습니다.', 'warning');
      return;
    }

    setIsExporting(true);
    setUploadProgress(10);

    try {
      const scene = roomSceneRef.current.getScene();
      if (!scene) {
        throw new Error('Scene not available');
      }

      setUploadProgress(30);

      // Get actual room dimensions
      const templateConfig = ROOM_TEMPLATES[currentTemplate];
      let roomWidth: number;
      let roomDepth: number;
      const roomHeight = templateConfig.wallHeight;

      if (currentTemplate === 'custom' && customTiles.length > 0) {
        // Calculate dimensions from actual floor tile positions
        const floorTiles = customTiles.filter(t => t.type === 'floor');
        if (floorTiles.length > 0) {
          const maxGridX = Math.max(...floorTiles.map(t => t.gridX));
          const maxGridZ = Math.max(...floorTiles.map(t => t.gridZ));
          // Add 1 to include the tile itself, multiply by tile size
          roomWidth = (maxGridX + 1) * TILE_SIZE;
          roomDepth = (maxGridZ + 1) * TILE_SIZE;
          debugRoomBuilder('Calculated room size from floor tiles', { roomWidth, roomDepth, floorCount: floorTiles.length });
        } else {
          // Fallback to slider dimensions if no floor tiles
          roomWidth = customDimensions.width;
          roomDepth = customDimensions.depth;
        }
      } else if (currentTemplate === 'custom') {
        roomWidth = customDimensions.width;
        roomDepth = customDimensions.depth;
      } else {
        roomWidth = templateConfig.width;
        roomDepth = templateConfig.depth;
      }

      // Clone scene and remove grid elements before export
      const exportScene = scene.clone(true);
      const objectsToRemove: THREE.Object3D[] = [];
      exportScene.traverse((child: THREE.Object3D) => {
        // Remove gridHelper and grid plane (transparent meshes with specific colors)
        if (child.type === 'GridHelper') {
          objectsToRemove.push(child);
        }
        // Remove invisible click planes
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const material = mesh.material as THREE.MeshBasicMaterial;
          if (material && material.opacity !== undefined && material.opacity < 0.5 && material.transparent) {
            objectsToRemove.push(child);
          }
        }
      });
      objectsToRemove.forEach(obj => obj.removeFromParent());
      debugRoomBuilder(`Removed ${objectsToRemove.length} grid/helper objects from export`);

      // Optimize textures before export to reduce file size
      debugRoomBuilder('Optimizing textures before export');
      const optimizedScene = await optimizeSceneTextures(exportScene);
      setUploadProgress(40);

      // Add dimensions metadata to the optimized scene
      optimizedScene.userData.dimensions = {
        width: roomWidth,
        height: roomHeight,
        depth: roomDepth
      };

      // Also add to extras for GLB export (GLTFExporter uses extras)
      const exportSceneWithExtras = optimizedScene as SceneWithExtras;
      exportSceneWithExtras.extras = {
        dimensions: {
          width: roomWidth,
          height: roomHeight,
          depth: roomDepth
        }
      };

      // Export as GLB
      debugRoomBuilder('Exporting GLB');
      const exporter = new GLTFExporter();

      const glbBlob = await new Promise<Blob>((resolve, reject) => {
        exporter.parse(
          optimizedScene,
          (gltf) => {
            const blob = new Blob([gltf as ArrayBuffer], { type: 'model/gltf-binary' });
            debugRoomBuilder('GLB export completed', { size: blob.size, dimensions: optimizedScene.userData.dimensions });
            resolve(blob);
          },
          (error) => {
            console.error('GLB export error:', error);
            reject(error);
          },
          {
            binary: true,
            embedImages: true, // Embed textures in GLB file (keep for portability)
            includeCustomExtensions: true, // Ensure extras are included
            maxTextureSize: 256 // Limit texture size to 256px
          }
        );
      });

      setUploadProgress(70);

      // Upload GLB
      const token = getAuthToken();

      if (!token) {
        addToast('데모 모드에서는 서버 업로드 없이 에디터로 이동합니다.', 'info');
        router.push(`/editor/${projectId}`);
        return;
      }

      // Explicitly update project dimensions and room structure in DB first
      // This ensures the DB has the correct dimensions even if GLB extraction fails
      try {
        debugRoomBuilder('Updating room dimensions before upload', { roomWidth, roomDepth, roomHeight });

        // Build room_structure with floor tile positions for collision detection
        let roomStructure: Record<string, unknown> | undefined;
        let buildMode: 'template' | 'free_build' = 'template';

        if (currentTemplate === 'custom' && customTiles.length > 0) {
          buildMode = 'free_build';
          // Save floor tile grid positions for collision detection
          const floorTiles = customTiles.filter(t => t.type === 'floor');

          // Calculate the actual GLB geometry center (same as GlbModel.tsx does)
          // This is critical for coordinate transformation in Scene.tsx
          const glbBox = new THREE.Box3().setFromObject(optimizedScene);
          const glbCenter = new THREE.Vector3();
          glbBox.getCenter(glbCenter);

          debugRoomBuilder('GLB geometry center', { x: glbCenter.x, y: glbCenter.y, z: glbCenter.z });
          debugRoomBuilder('GLB bounding box', { min: glbBox.min, max: glbBox.max });

          roomStructure = {
            mode: 'free_build',
            tileSize: TILE_SIZE,
            floorTiles: floorTiles.map(t => ({
              gridX: t.gridX,
              gridZ: t.gridZ,
            })),
            // Also save bounds for quick reference
            bounds: {
              minX: Math.min(...floorTiles.map(t => t.gridX)),
              maxX: Math.max(...floorTiles.map(t => t.gridX)),
              minZ: Math.min(...floorTiles.map(t => t.gridZ)),
              maxZ: Math.max(...floorTiles.map(t => t.gridZ)),
            },
            // Save GLB geometry center for accurate coordinate transformation
            // GlbModel.tsx centers the model using: position.set(-center.x, -box.min.y, -center.z)
            // So the center offset is the geometry center position
            glbCenter: {
              x: glbCenter.x,
              z: glbCenter.z,
            }
          };
          debugRoomBuilder('Saving free-build room structure', roomStructure);
        }

        await projectsAPI.update(projectId, {
          room_width: roomWidth,
          room_depth: roomDepth,
          room_height: roomHeight,
          build_mode: buildMode,
          room_structure: roomStructure,
        });
        debugRoomBuilder('Room dimensions updated');
      } catch (updateError) {
        console.error('Failed to update project dimensions:', updateError);
        // Continue with GLB upload even if dimension update fails
      }

      const formData = new FormData();
      formData.append('file', glbBlob, `room_${projectId}.glb`);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8008/api/v1';

      const response = await fetch(`${apiUrl}/files-3d/upload-3d/${projectId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      setUploadProgress(90);

      if (!response.ok) {
        console.error('GLB upload failed, continuing in demo mode');
        addToast('서버 연결에 실패해 데모 흐름으로 이동합니다.', 'warning');
        router.push(`/editor/${projectId}`);
        return;
      }

      await response.json();

      setUploadProgress(100);
      addToast('방 구조를 저장하고 에디터로 이동합니다.', 'success');
      router.push(`/editor/${projectId}`);
    } catch (error) {
      console.error('Failed to complete room:', error);
      addToast('방 구조 저장에 실패했습니다.', 'error');
    } finally {
      setIsExporting(false);
      setUploadProgress(0);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (!hasSelectedTemplate) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#09090b] text-white">
        <div className="max-w-4xl w-full p-8">
          <h1 className="text-3xl font-bold text-center mb-2">어떤 공간을 꾸미시겠어요?</h1>
          <p className="text-zinc-400 text-center mb-12">시작할 방의 기본 구조를 선택해주세요.</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            {(['rectangular', 'small_studio', 'square', 'corridor'] as RoomTemplate[]).map((templateKey) => {
              const template = ROOM_TEMPLATES[templateKey];
              return (
                <button
                  key={templateKey}
                  onClick={() => {
                    setCurrentTemplate(templateKey);
                    setHasSelectedTemplate(true);
                  }}
                  className="group relative aspect-square p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-violet-500 hover:bg-zinc-800 transition-all flex flex-col items-center justify-center gap-4"
                >
                  <div className="w-full aspect-[4/3] rounded-lg bg-zinc-800 group-hover:bg-violet-500/10 overflow-hidden mb-3 relative">
                    <Image
                      src={`/templates/${templateKey}.png`}
                      alt={template.displayName}
                      fill
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold mb-1 group-hover:text-violet-400 transition-colors">
                      {template.displayName}
                    </h3>
                    <p className="text-xs text-zinc-500">
                      {template.width}m × {template.depth}m
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => {
                setCurrentTemplate('custom');
                setHasSelectedTemplate(true);
              }}
              className="px-8 py-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-violet-500 hover:bg-zinc-800 transition-all flex items-center gap-3"
            >
              <span className="text-xl">✨</span>
              <div className="text-left">
                <div className="font-semibold">직접 설정할게요</div>
                <div className="text-xs text-zinc-500">가로, 세로 길이를 자유롭게 조절</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="h-screen w-full overflow-hidden bg-background">
      <div className="flex h-full">
        {/* Left Panel - Controls */}
        <div className="w-96 bg-zinc-900 border-r border-zinc-700 overflow-y-auto">
          <div className="p-4">
            <div className="mb-6">
              <h1 className="text-xl font-semibold mb-2">방 구조 디자인</h1>
              <p className="text-sm text-zinc-400 mb-4">
                {ROOM_TEMPLATES[currentTemplate].displayName} ({currentTemplate === 'custom' ? customDimensions.width : ROOM_TEMPLATES[currentTemplate].width}m × {currentTemplate === 'custom' ? customDimensions.depth : ROOM_TEMPLATES[currentTemplate].depth}m)
              </p>
              <button
                onClick={() => setHasSelectedTemplate(false)}
                className="text-xs px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg flex items-center gap-2 transition-colors w-full justify-center border border-zinc-700"
              >
                <span>↩️</span>
                <span>방 구조 다시 설정할래요</span>
              </button>
            </div>

            {/* Template Selector Removed from Sidebar */}

            {/* AI Generation */}
            <div className="mb-6 p-4 bg-violet-950/50 rounded-lg border border-violet-500/30">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-violet-300">
                  🤖 AI로 타일 생성
                </div>
                <div className="group relative">
                  <button className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-300 text-xs flex items-center justify-center hover:bg-violet-500/40 transition-colors">
                    ?
                  </button>
                  <div className="absolute right-0 top-6 w-64 p-3 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 hidden group-hover:block">
                    <p className="text-xs text-zinc-300 leading-relaxed">
                      원하는 재질을 텍스트로 묘사해보세요.<br />
                      AI가 세상에 하나뿐인 타일을 만들어줍니다.<br />
                      <span className="text-zinc-500 mt-1 block">(예: 따뜻한 느낌의 원목 마루, 대리석 바닥)</span>
                    </p>
                  </div>
                </div>
              </div>
              <input
                type="text"
                value={aiPrompt}
                placeholder="예: wooden floor, marble texture"
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !isGenerating) {
                    handleGenerateAI();
                  }
                }}
                disabled={isGenerating}
                className="w-full px-3 py-2 mb-2 border border-zinc-700 rounded bg-zinc-800 text-white placeholder:text-zinc-400"
              />
              <button
                onClick={handleGenerateAI}
                disabled={isGenerating || !aiPrompt.trim()}
                className="w-full px-3 py-2 bg-violet-600 text-white rounded disabled:opacity-50 hover:bg-violet-700"
              >
                {isGenerating ? '⏳ 생성 중... (30초 소요)' : '✨ AI로 생성'}
              </button>
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
              <p className="text-xs text-zinc-400 mb-2">
                선택된 타일: {selectedTiles.length}개
              </p>
              <div className="text-xs text-gray-500 mb-3">
                • 클릭: 타일 선택/해제<br />
                • Shift+클릭: 벽면/바닥 전체 선택<br />
              </div>
              <div className="space-y-2">
                <button
                  onClick={handleApplyTexture}
                  disabled={selectedTiles.length === 0 || !selectedImageId}
                  className="w-full px-3 py-2 text-sm bg-violet-600 text-white rounded disabled:opacity-50 hover:bg-violet-700"
                >
                  선택한 타일에 텍스처 적용
                </button>
                <button
                  onClick={handleRemoveTexture}
                  disabled={selectedTiles.length === 0}
                  className="w-full px-3 py-2 text-sm bg-red-600 text-white rounded disabled:opacity-50 hover:bg-red-700"
                >
                  선택한 타일 텍스처 제거
                </button>
                <button
                  onClick={() => setSelectedTiles([])}
                  disabled={selectedTiles.length === 0}
                  className="w-full px-3 py-2 text-sm bg-gray-500 text-white rounded disabled:opacity-50"
                >
                  선택 해제
                </button>
              </div>
            </div>

            {/* Complete Button */}
            <div className="mt-6 pt-6 border-t border-zinc-700">
              <button
                onClick={handleRoomComplete}
                disabled={isExporting}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg font-semibold disabled:opacity-50"
              >
                {isExporting ? (
                  <span>저장 중... {uploadProgress}%</span>
                ) : (
                  <span>가구 배치하러 가기 👉</span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - 3D Preview */}
        <div className="flex-1 relative">
          <Canvas
            camera={{ position: [5, 5, 5], fov: 50 }}
            className="bg-gradient-to-b from-gray-100 to-gray-200"
            gl={{
              antialias: true,
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.5
            }}
          >
            <color attach="background" args={['#f5f5f5']} />
            <fog attach="fog" args={['#f5f5f5', 10, 30]} />

            {/* Enhanced lighting for better visibility */}
            <ambientLight intensity={0.8} />
            <directionalLight
              position={[10, 10, 5]}
              intensity={1.2}
              castShadow
              shadow-mapSize-width={2048}
              shadow-mapSize-height={2048}
            />
            <directionalLight position={[-10, 10, -5]} intensity={0.5} />
            <pointLight position={[0, 10, 0]} intensity={0.5} />

            <OrbitControls makeDefault />

            {/* 3D Scene */}
            <RoomScene
              ref={roomSceneRef}
              currentTemplate={currentTemplate}
              customDimensions={customDimensions}
              selectedTiles={selectedTiles}
              tileTextures={tileTextures}
              onTileClick={currentTemplate === 'custom' && customTiles.length > 0 ? handleCustomTileClick : handleTileClick}
              customTiles={currentTemplate === 'custom' ? customTiles : undefined}
              currentTool={currentTool}
              onGridClick={handleGridClick}
              showGrid={showGrid}
            />
          </Canvas>

          {/* Selection Info Overlay */}
          {selectedTiles.length > 0 && (
            <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-2 rounded">
              <div className="text-sm">
                선택된 타일: {selectedTiles.length}개
              </div>
              <div className="text-xs mt-1 opacity-80">
                Shift+클릭: 면 전체 선택
              </div>
            </div>
          )}

          {/* Template Info */}
          <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-2 rounded">
            <div className="text-sm">
              템플릿: {currentTemplate}
            </div>
          </div>

          {/* Custom Dimensions Controls (Overlay) */}
          {currentTemplate === 'custom' && (
            <div className="absolute bottom-6 right-6 bg-black/80 text-white p-4 rounded-xl backdrop-blur-sm border border-white/10 w-80 shadow-2xl">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <span>🏗️</span> 자유 건축 모드
              </h4>

              {/* Build Tools */}
              <div className="mb-4">
                <h5 className="text-xs font-semibold text-zinc-400 mb-2">🔧 도구 선택</h5>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentTool('floor')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      currentTool === 'floor'
                        ? 'bg-violet-600 text-white'
                        : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                    }`}
                  >
                    <span className="block">🟫 바닥</span>
                    <kbd className="text-xs opacity-60">F</kbd>
                  </button>
                  <button
                    onClick={() => setCurrentTool('eraser')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      currentTool === 'eraser'
                        ? 'bg-red-600 text-white'
                        : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                    }`}
                  >
                    <span className="block">🧹 지우개</span>
                    <kbd className="text-xs opacity-60">E</kbd>
                  </button>
                  <button
                    onClick={() => setCurrentTool('select')}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      currentTool === 'select'
                        ? 'bg-blue-600 text-white'
                        : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
                    }`}
                  >
                    <span className="block">👆 선택</span>
                    <kbd className="text-xs opacity-60">V</kbd>
                  </button>
                </div>
              </div>

              {/* Auto Wall Toggle */}
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs text-zinc-400">🧱 자동 벽 생성</span>
                <button
                  onClick={() => setIsAutoWallEnabled(!isAutoWallEnabled)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                    isAutoWallEnabled
                      ? 'bg-green-600 text-white'
                      : 'bg-zinc-700 text-zinc-400'
                  }`}
                >
                  {isAutoWallEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Grid Toggle */}
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs text-zinc-400">📐 그리드 표시</span>
                <button
                  onClick={() => setShowGrid(!showGrid)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                    showGrid
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-700 text-zinc-400'
                  }`}
                >
                  {showGrid ? 'ON' : 'OFF'} <kbd className="opacity-60">G</kbd>
                </button>
              </div>

              {/* Room Size */}
              <div className="space-y-3 pt-3 border-t border-white/10">
                <h5 className="text-xs font-semibold text-zinc-400">📏 방 크기</h5>
                <div>
                  <div className="flex justify-between text-xs text-zinc-400 mb-1">
                    <span>너비 (Width)</span>
                    <span className="text-violet-400 font-mono">{customDimensions.width.toFixed(1)}m</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="10"
                    step="0.5"
                    value={customDimensions.width}
                    onChange={(e) =>
                      setCustomDimensions({
                        ...customDimensions,
                        width: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-violet-500 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-zinc-400 mb-1">
                    <span>깊이 (Depth)</span>
                    <span className="text-violet-400 font-mono">{customDimensions.depth.toFixed(1)}m</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="10"
                    step="0.5"
                    value={customDimensions.depth}
                    onChange={(e) =>
                      setCustomDimensions({
                        ...customDimensions,
                        depth: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-violet-500 h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div className="text-xs text-zinc-500 flex justify-between">
                  <span>높이 (Height)</span>
                  <span>2.5m (고정)</span>
                </div>
              </div>

              {/* Tile Stats */}
              <div className="mt-3 pt-3 border-t border-white/10">
                <div className="text-xs text-zinc-400 flex justify-between">
                  <span>배치된 바닥 타일</span>
                  <span className="text-violet-400 font-mono">
                    {customTiles.filter(t => t.type === 'floor').length}개
                  </span>
                </div>
                <div className="text-xs text-zinc-400 flex justify-between mt-1">
                  <span>자동 생성된 벽</span>
                  <span className="text-violet-400 font-mono">
                    {customTiles.filter(t => t.type === 'wall').length}개
                  </span>
                </div>
              </div>

              {/* Clear All Button */}
              {customTiles.length > 0 && (
                <button
                  onClick={() => setShowClearAllConfirm(true)}
                  className="w-full mt-3 px-3 py-2 bg-red-600/20 text-red-400 rounded text-xs hover:bg-red-600/30 transition-colors"
                  aria-label="모든 타일 삭제"
                >
                  🗑️ 모든 타일 삭제
                </button>
              )}

              {/* Shortcut Hints */}
              <div className="pt-3 mt-3 border-t border-white/10">
                <h5 className="text-xs font-semibold text-zinc-400 mb-2">⌨️ 단축키</h5>
                <div className="text-xs text-zinc-500 space-y-1">
                  <div className="flex justify-between">
                    <span><kbd className="px-1 py-0.5 bg-zinc-700 rounded text-zinc-300">F</kbd></span>
                    <span className="text-zinc-400">바닥 배치</span>
                  </div>
                  <div className="flex justify-between">
                    <span><kbd className="px-1 py-0.5 bg-zinc-700 rounded text-zinc-300">E</kbd></span>
                    <span className="text-zinc-400">지우개</span>
                  </div>
                  <div className="flex justify-between">
                    <span><kbd className="px-1 py-0.5 bg-zinc-700 rounded text-zinc-300">V</kbd></span>
                    <span className="text-zinc-400">선택</span>
                  </div>
                  <div className="flex justify-between">
                    <span><kbd className="px-1 py-0.5 bg-zinc-700 rounded text-zinc-300">G</kbd></span>
                    <span className="text-zinc-400">그리드 토글</span>
                  </div>
                  <div className="flex justify-between">
                    <span><kbd className="px-1 py-0.5 bg-zinc-700 rounded text-zinc-300">Esc</kbd></span>
                    <span className="text-zinc-400">선택 해제</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Clear All Confirm Modal */}
      <ConfirmModal
        isOpen={showClearAllConfirm}
        title="모든 타일 삭제"
        message="모든 타일을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
        confirmText="삭제"
        cancelText="취소"
        variant="warning"
        onConfirm={() => {
          setCustomTiles([]);
          setSelectedTiles([]);
          setShowClearAllConfirm(false);
        }}
        onCancel={() => setShowClearAllConfirm(false)}
      />
      <ToastContainer />
    </div >
  );
}

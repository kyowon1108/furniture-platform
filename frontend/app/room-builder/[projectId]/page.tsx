'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter';
import { projectsAPI } from '@/lib/api';
import RoomTemplateSelector from '@/components/room-builder/RoomTemplateSelector';
import TextureGallery from '@/components/room-builder/TextureGallery';
import RoomScene from '@/components/room-builder/RoomScene';
import { RoomTemplate, UploadedImage, ROOM_TEMPLATES } from '@/components/room-builder/types';
import { optimizeSceneTextures } from '@/utils/textureOptimizer';

const TILE_SIZE = 0.5;
const WALL_HEIGHT = 2.5;

export default function RoomBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = Number(params.projectId);

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Room builder state
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

  const roomSceneRef = useRef<any>(null);
  const lastSelectedTileRef = useRef<string | null>(null);

  useEffect(() => {
    const loadProject = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.warn('No token found, using demo mode');
          setProject({
            id: projectId,
            name: 'Demo Project',
            description: 'Testing room builder'
          });
          setLoading(false);
          return;
        }

        const projectData = await projectsAPI.getById(projectId);
        setProject(projectData);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load project:', err);
        setProject({
          id: projectId,
          name: `Project ${projectId}`,
          description: 'Room builder demo'
        });
        setLoading(false);
      }
    };

    loadProject();
  }, [projectId]);

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

      if (currentTemplate === 'lshaped') {
        // L-shaped floor
        for (let x = 0; x < xCount; x++) {
          for (let z = 0; z < zCount * 0.6; z++) {
            tiles.push(`floor-${x}-${z}`);
          }
        }
        for (let x = 0; x < xCount * 0.6; x++) {
          for (let z = Math.floor(zCount * 0.6); z < zCount; z++) {
            tiles.push(`floor-${x}-${z}`);
          }
        }
      } else if (currentTemplate === 'ushaped') {
        // U-shaped floor
        const excludeXStart = Math.floor(xCount * 0.3);
        const excludeXEnd = Math.floor(xCount * 0.7);
        const excludeZStart = Math.floor(zCount * 0.6);

        for (let x = 0; x < xCount; x++) {
          for (let z = 0; z < zCount; z++) {
            if (!(x >= excludeXStart && x < excludeXEnd && z >= excludeZStart)) {
              tiles.push(`floor-${x}-${z}`);
            }
          }
        }
      } else {
        // Regular floor
        for (let x = 0; x < xCount; x++) {
          for (let z = 0; z < zCount; z++) {
            tiles.push(`floor-${x}-${z}`);
          }
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
      const wallType = parts[1]; // 'back', 'front', 'left', 'right', 'inner'

      for (let y = 0; y < yCount; y++) {
        if (wallType === 'back') {
          // Back wall is always full width
          for (let x = 0; x < xCount; x++) {
            tiles.push(`wall-back-${x}-${y}`);
          }
        } else if (wallType === 'front') {
          if (currentTemplate === 'lshaped') {
            // L-shaped has partial front wall
            // Check if it's the "top" section
            if (wallIdentifier.includes('top')) {
              for (let x = 0; x < Math.floor(xCount * 0.6); x++) {
                tiles.push(`wall-front-top-${x}-${y}`);
              }
            }
          } else if (currentTemplate === 'ushaped') {
            // U-shaped has two front wall sections
            if (wallIdentifier.includes('left')) {
              for (let x = 0; x < Math.floor(xCount * 0.3); x++) {
                tiles.push(`wall-front-left-${x}-${y}`);
              }
            } else if (wallIdentifier.includes('right')) {
              for (let x = Math.floor(xCount * 0.7); x < xCount; x++) {
                tiles.push(`wall-front-right-${x}-${y}`);
              }
            }
          } else {
            // Regular front wall
            for (let x = 0; x < xCount; x++) {
              tiles.push(`wall-front-${x}-${y}`);
            }
          }
        } else if (wallType === 'left') {
          // Left wall is always full depth
          for (let z = 0; z < zCount; z++) {
            tiles.push(`wall-left-${z}-${y}`);
          }
        } else if (wallType === 'right') {
          if (currentTemplate === 'lshaped') {
            // L-shaped has partial right wall
            if (wallIdentifier.includes('bottom')) {
              for (let z = 0; z < Math.floor(zCount * 0.6); z++) {
                tiles.push(`wall-right-bottom-${z}-${y}`);
              }
            }
          } else {
            // Regular right wall
            for (let z = 0; z < zCount; z++) {
              tiles.push(`wall-right-${z}-${y}`);
            }
          }
        } else if (wallType === 'inner') {
          // Handle inner walls for L-shaped and U-shaped rooms
          if (currentTemplate === 'lshaped') {
            const splitX = Math.floor(xCount * 0.6);
            const splitZ = Math.floor(zCount * 0.6);

            // Check which inner wall section
            if (wallIdentifier.includes('h')) {
              // Horizontal inner wall
              for (let x = splitX; x < xCount; x++) {
                tiles.push(`wall-inner-h-${x}-${y}`);
              }
            } else if (wallIdentifier.includes('v')) {
              // Vertical inner wall
              for (let z = splitZ; z < zCount; z++) {
                tiles.push(`wall-inner-v-${z}-${y}`);
              }
            }
          } else if (currentTemplate === 'ushaped') {
            const excludeZStart = Math.floor(zCount * 0.6);

            // Check which inner wall section
            if (wallIdentifier.includes('left')) {
              for (let z = 0; z < excludeZStart; z++) {
                tiles.push(`wall-inner-left-${z}-${y}`);
              }
            } else if (wallIdentifier.includes('right')) {
              for (let z = 0; z < excludeZStart; z++) {
                tiles.push(`wall-inner-right-${z}-${y}`);
              }
            }
          }
        }
      }
    }

    return tiles;
  }, [currentTemplate, customDimensions]);

  // Handle tile selection
  const handleTileClick = useCallback((tileKey: string, event?: any) => {
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
    console.log('Applied texture to tiles:', selectedTiles.length);

    // Clear selection after applying texture
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

    // Clear selection after removing texture
    setSelectedTiles([]);
  }, [selectedTiles, tileTextures]);

  // Generate AI texture
  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) {
      alert('프롬프트를 입력해주세요.');
      return;
    }

    setIsGenerating(true);
    console.log('[DEBUG] AI 생성 시작:', aiPrompt);

    try {
      const token = localStorage.getItem('token');
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

  // Complete room and export GLB
  const handleRoomComplete = async () => {
    if (!roomSceneRef.current) {
      alert('3D 씬이 준비되지 않았습니다.');
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

      // Optimize textures before export to reduce file size
      console.log('텍스처 최적화 중...');
      await optimizeSceneTextures(scene);
      setUploadProgress(40);

      // Export as GLB
      console.log('GLB 파일 생성 중...');
      const exporter = new GLTFExporter();

      // Get actual room dimensions
      const templateConfig = ROOM_TEMPLATES[currentTemplate];
      const roomWidth = currentTemplate === 'custom' ? customDimensions.width : templateConfig.width;
      const roomDepth = currentTemplate === 'custom' ? customDimensions.depth : templateConfig.depth;
      const roomHeight = templateConfig.wallHeight;

      // Add dimensions metadata to the scene
      scene.userData.dimensions = {
        width: roomWidth,
        height: roomHeight,
        depth: roomDepth
      };

      const glbBlob = await new Promise<Blob>((resolve, reject) => {
        exporter.parse(
          scene,
          (gltf) => {
            const blob = new Blob([gltf as ArrayBuffer], { type: 'model/gltf-binary' });
            console.log('GLB 파일 생성 완료:', blob.size, 'bytes, dimensions:', scene.userData.dimensions);
            resolve(blob);
          },
          (error) => {
            console.error('GLB export error:', error);
            reject(error);
          },
          { binary: true }
        );
      });

      setUploadProgress(70);

      // Upload GLB
      const token = localStorage.getItem('token');

      if (!token) {
        console.log('Demo mode: Skipping GLB upload');
        alert('데모 모드: 방 구조가 저장되었습니다.');
        router.push(`/editor/${projectId}`);
        return;
      }

      const formData = new FormData();
      formData.append('file', glbBlob, `room_${projectId}.glb`);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8008/api/v1';

      const response = await fetch(`${apiUrl}/room-builder/upload-glb/${projectId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      setUploadProgress(90);

      if (!response.ok) {
        console.error('GLB upload failed, continuing in demo mode');
        alert('서버 연결 실패. 데모 모드로 계속합니다.');
        router.push(`/editor/${projectId}`);
        return;
      }

      const result = await response.json();
      console.log('Room GLB uploaded:', result);

      setUploadProgress(100);
      router.push(`/editor/${projectId}`);
    } catch (error) {
      console.error('Failed to complete room:', error);
      alert('방 구조 저장에 실패했습니다.');
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

  return (
    <div className="h-screen w-full overflow-hidden bg-background">
      <div className="flex h-full">
        {/* Left Panel - Controls */}
        <div className="w-96 bg-surface border-r border-border overflow-y-auto">
          <div className="p-4">
            <div className="mb-6">
              <h1 className="text-xl font-semibold mb-2">방 구조 디자인</h1>
              <p className="text-sm text-muted-foreground">
                프로젝트: {project?.name}
              </p>
            </div>

            {/* Template Selector */}
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
              </p>
              <div className="text-xs text-gray-500 mb-3">
                • 클릭: 타일 선택/해제<br />
                • Shift+클릭: 벽면/바닥 전체 선택<br />
              </div>
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
            <div className="mt-6 pt-6 border-t border-border">
              <button
                onClick={handleRoomComplete}
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
              onTileClick={handleTileClick}
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
        </div>
      </div>
    </div>
  );
}
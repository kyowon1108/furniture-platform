'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { projectsAPI } from '@/lib/api';
import RoomTemplateSelector from '@/components/room-builder/RoomTemplateSelector';
import TextureGallery from '@/components/room-builder/TextureGallery';
import RoomScene from '@/components/room-builder/RoomScene';
import { RoomTemplate, UploadedImage, ROOM_TEMPLATES } from '@/components/room-builder/types';
// import { optimizeSceneTextures } from '@/utils/textureOptimizer';
import { optimizeSceneTextures } from '@/utils/optimizedTextureAtlas';

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

  const roomSceneRef = useRef<any>(null);
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

        const projectData = await projectsAPI.get(projectId);
        setProject(projectData);

        // If project already has a 3D file, we could potentially load it or skip selection.
        // But per user request, if they are here, they likely want to (re)design.
        // We just ensure loading finishes.
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

      // Get actual room dimensions
      const templateConfig = ROOM_TEMPLATES[currentTemplate];
      const roomWidth = currentTemplate === 'custom' ? customDimensions.width : templateConfig.width;
      const roomDepth = currentTemplate === 'custom' ? customDimensions.depth : templateConfig.depth;
      const roomHeight = templateConfig.wallHeight;

      // Optimize textures before export to reduce file size
      console.log('텍스처 최적화 중...');
      const optimizedScene = await optimizeSceneTextures(scene);
      setUploadProgress(40);

      // Add dimensions metadata to the optimized scene
      optimizedScene.userData.dimensions = {
        width: roomWidth,
        height: roomHeight,
        depth: roomDepth
      };

      // Also add to extras for GLB export (GLTFExporter uses extras)
      (optimizedScene as any).extras = {
        dimensions: {
          width: roomWidth,
          height: roomHeight,
          depth: roomDepth
        }
      };

      // Export as GLB
      console.log('GLB 파일 생성 중...');
      const exporter = new GLTFExporter();

      const glbBlob = await new Promise<Blob>((resolve, reject) => {
        exporter.parse(
          optimizedScene,
          (gltf) => {
            const blob = new Blob([gltf as ArrayBuffer], { type: 'model/gltf-binary' });
            console.log('GLB 파일 생성 완료:', blob.size, 'bytes, dimensions:', optimizedScene.userData.dimensions);
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
                    <img
                      src={`/templates/${templateKey}.png`}
                      alt={template.displayName}
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
              className="px-8 py-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800 transition-all flex items-center gap-3"
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

          {/* Custom Dimensions Controls (Overlay) */}
          {currentTemplate === 'custom' && (
            <div className="absolute bottom-6 right-6 bg-black/80 text-white p-4 rounded-xl backdrop-blur-sm border border-white/10 w-64 shadow-2xl">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <span>📏</span> 사용자 정의 크기
              </h4>

              <div className="space-y-4">
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

                <div className="text-xs text-zinc-500 pt-2 border-t border-white/10 flex justify-between">
                  <span>높이 (Height)</span>
                  <span>2.5m (고정)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div >
  );
}
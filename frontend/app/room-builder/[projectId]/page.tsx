'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { projectsAPI } from '@/lib/api';
import RoomBuilderSimple from '@/components/room-builder/RoomBuilderSimple';
import RoomScene from '@/components/room-builder/RoomScene';
import { RoomTemplate } from '@/components/room-builder/types';

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
  const roomSceneRef = useRef<any>(null);

  useEffect(() => {
    const loadProject = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const projectData = await projectsAPI.getById(projectId);
        setProject(projectData);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load project:', err);
        setError('프로젝트를 불러올 수 없습니다.');
        setLoading(false);
      }
    };

    loadProject();
  }, [projectId, router]);

  const handleRoomComplete = async (glbBlob: Blob) => {
    try {
      // Upload GLB to backend
      const formData = new FormData();
      formData.append('file', glbBlob, `room_${projectId}.glb`);

      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8008/api/v1';

      const response = await fetch(`${apiUrl}/room-builder/upload-glb/${projectId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('GLB 업로드 실패');
      }

      const result = await response.json();
      console.log('Room GLB uploaded:', result);

      // Redirect to editor
      router.push(`/editor/${projectId}`);
    } catch (error) {
      console.error('Failed to complete room:', error);
      alert('방 구조 저장에 실패했습니다.');
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

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 text-red-500">{error}</div>
          <button
            onClick={() => router.push('/projects')}
            className="px-4 py-2 bg-primary text-white rounded"
          >
            프로젝트 목록으로
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full overflow-hidden bg-background">
      <div className="flex h-full">
        {/* Left Panel - Controls */}
        <div className="w-80 bg-surface border-r border-border overflow-y-auto">
          <div className="p-4">
            <div className="mb-6">
              <h1 className="text-xl font-semibold mb-2">방 구조 디자인</h1>
              <p className="text-sm text-muted-foreground">
                프로젝트: {project?.name}
              </p>
            </div>

            {/* Room Builder Controls */}
            <RoomBuilderSimple
              projectId={projectId}
              projectName={project?.name || ''}
              onComplete={handleRoomComplete}
              currentTemplate={currentTemplate}
              onTemplateChange={setCurrentTemplate}
              customDimensions={customDimensions}
              onCustomDimensionsChange={setCustomDimensions}
              selectedTiles={selectedTiles}
              tileTextures={tileTextures}
              onApplyTexture={(tileKeys, textureUrl) => {
                const newTextures = { ...tileTextures };
                tileKeys.forEach(key => {
                  newTextures[key] = textureUrl;
                });
                setTileTextures(newTextures);
                setSelectedTiles([]);
              }}
              onRemoveTexture={(tileKeys) => {
                const newTextures = { ...tileTextures };
                tileKeys.forEach(key => {
                  delete newTextures[key];
                });
                setTileTextures(newTextures);
                setSelectedTiles([]);
              }}
            />
          </div>
        </div>

        {/* Right Panel - 3D Preview */}
        <div className="flex-1 relative">
          <Canvas
            camera={{ position: [5, 5, 5], fov: 50 }}
            className="bg-gradient-to-b from-gray-900 to-gray-800"
          >
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <OrbitControls makeDefault />

            {/* 3D Scene */}
            <RoomScene
              ref={roomSceneRef}
              currentTemplate={currentTemplate}
              customDimensions={customDimensions}
              selectedTiles={selectedTiles}
              tileTextures={tileTextures}
              onTileClick={(tileKey) => {
                setSelectedTiles(prev =>
                  prev.includes(tileKey)
                    ? prev.filter(k => k !== tileKey)
                    : [...prev, tileKey]
                );
              }}
            />
          </Canvas>
        </div>
      </div>
    </div>
  );
}
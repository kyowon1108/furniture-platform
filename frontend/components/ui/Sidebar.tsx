'use client';

import { useState, useMemo, useEffect } from 'react';
import { FURNITURE_CATALOG, type FurnitureCatalogItem } from '@/types/catalog';
import { useEditorStore } from '@/store/editorStore';
import { useMaterialStore } from '@/store/materialStore';
import { socketService } from '@/lib/socket';
import type { FurnitureItem } from '@/types/furniture';
import { MATERIAL_CATALOG, getMaterialsByCategory } from '@/data/materialCatalog';
import { catalogAPI } from '@/lib/api';

export function Sidebar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'furniture' | 'materials'>('furniture');
  const [materialCategory, setMaterialCategory] = useState<'floor' | 'wall'>('floor');
  const [catalog, setCatalog] = useState<FurnitureCatalogItem[]>(FURNITURE_CATALOG);
  const [isLoading, setIsLoading] = useState(true);

  // Load catalog from S3 on mount
  useEffect(() => {
    const loadCatalog = async () => {
      try {
        setIsLoading(true);
        const response = await catalogAPI.getCatalog();
        if (response.items && response.items.length > 0) {
          setCatalog(response.items);
        }
      } catch {
        // Keep using local FURNITURE_CATALOG as fallback
      } finally {
        setIsLoading(false);
      }
    };

    loadCatalog();
  }, []);

  const { addFurniture } = useEditorStore();
  const { 
    selectedMaterialId, 
    applicationMode, 
    setSelectedMaterial, 
    setApplicationMode 
  } = useMaterialStore();

  // 배치된 가구들의 총 예상 비용 계산
  const totalEstimatedCost = useMemo(() => {
    return furnitures.reduce((total, furniture) => {
      // furniture.id에서 카탈로그 ID 추출 (예: "bed-single-1234567890" -> "bed-single")
      const catalogId = furniture.id.replace(/-\d+$/, '');
      const catalogItem = FURNITURE_CATALOG.find(item => item.id === catalogId);
      return total + (catalogItem?.price || 0);
    }, 0);
  }, [furnitures]);

  const categories = ['all', 'bedroom', 'living', 'office', 'kitchen', 'decoration'];

  const filteredFurniture = useMemo(() => {
    return catalog.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some((tag) => tag.includes(searchQuery.toLowerCase()));
      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [catalog, searchQuery, selectedCategory]);

  const handleDragStart = (e: React.DragEvent, item: FurnitureCatalogItem) => {
    e.dataTransfer.setData('furniture', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleClick = (catalogItem: FurnitureCatalogItem) => {
    // Set initial position based on mount type
    let initialY = catalogItem.dimensions.height / 2;
    if (catalogItem.mountType === 'wall') {
      initialY = 1.5; // Eye level for wall-mounted items
    } else if (catalogItem.mountType === 'surface') {
      initialY = 0.5; // Slightly above ground for surface items
    }

    const newFurniture: FurnitureItem = {
      id: `${catalogItem.id}-${Date.now()}`,
      type: catalogItem.type,
      position: { x: 0, y: initialY, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: { x: 1, y: 1, z: 1 },
      dimensions: catalogItem.dimensions,
      color: catalogItem.color,
      mountType: catalogItem.mountType,
      glbUrl: catalogItem.glbUrl, // S3 GLB URL
    };

    addFurniture(newFurniture);
    socketService.emitFurnitureAdd(newFurniture);
  };

  const getEmoji = (type: string) => {
    const emojiMap: Record<string, string> = {
      bed: '🛏️',
      desk: '🪑',
      chair: '💺',
      wardrobe: '🚪',
      sofa: '🛋️',
      table: '🍽️',
      shelf: '📚',
      'wall-lamp': '💡',
      'wall-tv': '📺',
      'wall-art': '🖼️',
      'desk-lamp': '🔦',
      'decoration': '🏺',
    };
    return emojiMap[type] || '📦';
  };

  const filteredMaterials = useMemo(() => {
    return getMaterialsByCategory(materialCategory);
  }, [materialCategory]);

  return (
    <div className="sidebar-container absolute left-0 top-0 h-screen w-80 z-10 flex flex-col">
      {/* Header */}
      <div className="sidebar-header flex-shrink-0">
        {/* Tab Switcher - Materials tab disabled for now */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('furniture')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              activeTab === 'furniture'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            🪑 가구
          </button>
          {/* Materials tab temporarily disabled - uncomment to enable
          <button
            onClick={() => setActiveTab('materials')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              activeTab === 'materials'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            🎨 재질
          </button>
          */}
        </div>

        {activeTab === 'furniture' ? (
          <>
            <h2 className="sidebar-title">가구 카탈로그</h2>

            {/* Search */}
            <input
              type="text"
              placeholder="가구 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input w-full"
            />

            {/* Category Filter */}
            <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`category-button ${selectedCategory === cat ? 'active' : ''}`}
                >
                  {cat === 'all' ? '전체' : 
                   cat === 'bedroom' ? '침실' :
                   cat === 'living' ? '거실' :
                   cat === 'office' ? '사무실' :
                   cat === 'kitchen' ? '주방' : '장식'}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <h2 className="sidebar-title">재질 & 타일</h2>

            {/* Material Category */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setMaterialCategory('floor')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  materialCategory === 'floor'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                바닥
              </button>
              <button
                onClick={() => setMaterialCategory('wall')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  materialCategory === 'wall'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                벽면
              </button>
            </div>

            {/* Application Mode */}
            <div className="mb-4">
              <p className="text-sm font-medium mb-2 text-gray-700">적용 모드:</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setApplicationMode('full')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    applicationMode === 'full'
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  전체 적용
                </button>
                <button
                  onClick={() => setApplicationMode('partial')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    applicationMode === 'partial'
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  부분 적용
                </button>
              </div>
              {applicationMode !== 'none' && selectedMaterialId && (
                <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-800 font-medium">
                    {applicationMode === 'full' 
                      ? `💡 ${materialCategory === 'floor' ? '바닥' : '벽면'}을 클릭하면 전체에 적용됩니다`
                      : `💡 ${materialCategory === 'floor' ? '바닥' : '벽면'}의 원하는 위치를 클릭하세요`}
                  </p>
                </div>
              )}
              {applicationMode !== 'none' && !selectedMaterialId && (
                <p className="text-xs text-orange-600 mt-2">
                  ⚠️ 먼저 재질을 선택하세요
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Content */}
      <div className="furniture-grid overflow-y-auto flex-1">
        {activeTab === 'furniture' ? (
          isLoading ? (
            <p style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
              S3에서 카탈로그 로딩 중...
            </p>
          ) : filteredFurniture.length === 0 ? (
            <p style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)' }}>
              가구를 찾을 수 없습니다
            </p>
          ) : (
            filteredFurniture.map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item)}
                onClick={() => handleClick(item)}
                className="furniture-card"
              >
                <span className="furniture-emoji">{getEmoji(item.type)}</span>
                <div className="furniture-name">{item.name}</div>
                <div className="furniture-price">
                  {item.dimensions.width.toFixed(1)}m × {item.dimensions.depth.toFixed(1)}m
                </div>
                {item.price && (
                  <div className="furniture-price" style={{ color: 'var(--success)', fontWeight: 600 }}>
                    ₩{item.price.toLocaleString()}
                  </div>
                )}
              </div>
            ))
          )
        ) : (
          filteredMaterials.map((material) => (
            <div
              key={material.id}
              onClick={() => setSelectedMaterial(material.id)}
              className={`furniture-card cursor-pointer ${
                selectedMaterialId === material.id ? 'ring-2 ring-blue-500' : ''
              }`}
              style={{
                background: material.color || '#ccc',
                border: selectedMaterialId === material.id ? '3px solid #3b82f6' : '1px solid #ddd',
              }}
            >
              <div className="furniture-name text-center" style={{
                color: material.color && material.color.startsWith('#') &&
                       parseInt(material.color.slice(1), 16) > 0x888888 ? '#000' : '#fff',
                textShadow: '0 1px 2px rgba(0,0,0,0.5)'
              }}>
                {material.name}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 총 예상 비용 표시 */}
      {activeTab === 'furniture' && (
        <div
          className="flex-shrink-0"
          style={{
            padding: '1rem',
            borderTop: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
              fontWeight: 500
            }}>
              총 예상 비용:
            </span>
            <span style={{
              fontSize: '1.125rem',
              fontWeight: 700,
              color: totalEstimatedCost > 0 ? 'var(--accent-primary)' : 'var(--text-tertiary)'
            }}>
              ₩{totalEstimatedCost.toLocaleString()}
            </span>
          </div>
          {furnitures.length > 0 && (
            <div style={{
              fontSize: '0.75rem',
              color: 'var(--text-tertiary)',
              marginTop: '0.25rem',
              textAlign: 'right'
            }}>
              배치된 가구 {furnitures.length}개
            </div>
          )}
        </div>
      )}
    </div>
  );
}

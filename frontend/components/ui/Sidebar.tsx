'use client';

import { useState, useMemo, useEffect } from 'react';
import { FURNITURE_CATALOG, type FurnitureCatalogItem } from '@/types/catalog';
import { useEditorStore } from '@/store/editorStore';
import { useUIStore } from '@/store/uiStore';
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

  const { addFurniture, furnitures } = useEditorStore();
  const { isSidebarCollapsed, toggleSidebar } = useUIStore();
  const {
    selectedMaterialId,
    applicationMode,
    setSelectedMaterial,
    setApplicationMode
  } = useMaterialStore();

  // 배치된 가구들의 총 예상 비용 계산
  const totalEstimatedCost = useMemo(() => {
    return furnitures.reduce((total, furniture) => {
      // Use price directly from furniture if available
      if (furniture.price) {
        return total + furniture.price;
      }
      // Fallback: look up price from catalog (for backward compatibility)
      const catalogId = furniture.id.replace(/-\d+$/, '');
      const catalogItem = catalog.find(item => item.id === catalogId);
      return total + (catalogItem?.price || 0);
    }, 0);
  }, [furnitures, catalog]);

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
    // Set initial position based on mount type and whether GLB exists
    let initialY = 0;

    if (catalogItem.mountType === 'wall') {
      initialY = 1.5; // Eye level for wall-mounted items
    } else if (catalogItem.mountType === 'surface') {
      initialY = 0.5; // Slightly above ground for surface items
    } else if (!catalogItem.glbUrl) {
      // Procedural models need to be lifted by half their height
      initialY = catalogItem.dimensions.height / 2;
    }
    // GLB models: Y=0 (model is already aligned to ground in GlbFurnitureModel)

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
      price: catalogItem.price, // Include price for budget calculation
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
    <div
      className="sidebar-enhanced transition-all duration-300 ease-in-out"
      style={{ width: isSidebarCollapsed ? '60px' : '320px' }}
    >
      {/* Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-6 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-full p-1 z-50 shadow-md hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-white transition-colors"
        title={isSidebarCollapsed ? "카탈로그 펼치기" : "카탈로그 접기"}
      >
        {isSidebarCollapsed ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        )}
      </button>

      {/* Collapsed State Icon */}
      <div
        className={`absolute top-0 left-0 w-full h-full flex flex-col items-center pt-20 gap-4 transition-opacity duration-200 ${isSidebarCollapsed ? 'opacity-100 visible delay-100' : 'opacity-0 invisible'}`}
      >
        <div className="text-2xl" title="가구 카탈로그">🪑</div>
        <div className="w-8 h-[1px] bg-[var(--border-color)]"></div>
        <div className="text-xs text-[var(--text-tertiary)] vertical-text" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
          가구 카탈로그
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex flex-col h-full w-full overflow-hidden transition-opacity duration-200 ${isSidebarCollapsed ? 'opacity-0 invisible' : 'opacity-100 visible'}`}>
        {/* Header */}
        <div className="sidebar-header flex-shrink-0">
          {/* Tab Switcher - Materials tab disabled for now */}


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
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${materialCategory === 'floor'
                    ? 'bg-[var(--success)] text-white'
                    : 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10'
                    }`}
                >
                  바닥
                </button>
                <button
                  onClick={() => setMaterialCategory('wall')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${materialCategory === 'wall'
                    ? 'bg-[var(--success)] text-white'
                    : 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10'
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
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${applicationMode === 'full'
                      ? 'bg-[var(--accent-primary)] text-white'
                      : 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10'
                      }`}
                  >
                    전체 적용
                  </button>
                  <button
                    onClick={() => setApplicationMode('partial')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${applicationMode === 'partial'
                      ? 'bg-[var(--accent-primary)] text-white'
                      : 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10'
                      }`}
                  >
                    부분 적용
                  </button>
                </div>
                {applicationMode !== 'none' && selectedMaterialId && (
                  <div className="mt-2 p-2 bg-[var(--accent-light)] rounded-lg border border-[var(--accent-primary)]">
                    <p className="text-xs text-[var(--accent-primary)] font-medium">
                      {applicationMode === 'full'
                        ? `💡 ${materialCategory === 'floor' ? '바닥' : '벽면'}을 클릭하면 전체에 적용됩니다`
                        : `💡 ${materialCategory === 'floor' ? '바닥' : '벽면'}의 원하는 위치를 클릭하세요`}
                    </p>
                  </div>
                )}
                {applicationMode !== 'none' && !selectedMaterialId && (
                  <p className="text-xs text-[var(--warning)] mt-2">
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
                className={`furniture-card cursor-pointer ${selectedMaterialId === material.id ? 'ring-2 ring-[var(--accent-primary)]' : ''
                  }`}
                style={{
                  background: material.color || '#ccc',
                  border: selectedMaterialId === material.id ? '2px solid var(--accent-primary)' : '1px solid var(--border-color)',
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
    </div>
  );
}

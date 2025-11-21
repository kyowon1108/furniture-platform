'use client';

import { useState, useMemo } from 'react';
import { FURNITURE_CATALOG, type FurnitureCatalogItem } from '@/types/catalog';
import { useEditorStore } from '@/store/editorStore';
import { socketService } from '@/lib/socket';
import type { FurnitureItem } from '@/types/furniture';

export function Sidebar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { addFurniture } = useEditorStore();

  const categories = ['all', 'bedroom', 'living', 'office', 'kitchen', 'decoration'];

  const filteredFurniture = useMemo(() => {
    return FURNITURE_CATALOG.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.tags.some((tag) => tag.includes(searchQuery.toLowerCase()));
      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

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

  return (
    <div className="sidebar-container absolute left-0 top-0 h-screen w-80 z-10 flex flex-col">
      {/* Header */}
      <div className="sidebar-header flex-shrink-0">
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
      </div>

      {/* Furniture List */}
      <div className="furniture-grid overflow-y-auto flex-1">
        {filteredFurniture.length === 0 ? (
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
                  ${item.price}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

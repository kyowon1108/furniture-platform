'use client';

import { useCallback } from 'react';

// Custom event types for camera control
export type CameraAction = 'zoomIn' | 'zoomOut' | 'resetView' | 'viewTop' | 'viewFront' | 'viewSide';

// Dispatch camera control event
export function dispatchCameraAction(action: CameraAction) {
  window.dispatchEvent(new CustomEvent('cameraControl', { detail: { action } }));
}

export function CameraControls() {
  const handleZoomIn = useCallback(() => {
    dispatchCameraAction('zoomIn');
  }, []);

  const handleZoomOut = useCallback(() => {
    dispatchCameraAction('zoomOut');
  }, []);

  const handleResetView = useCallback(() => {
    dispatchCameraAction('resetView');
  }, []);

  const handleViewTop = useCallback(() => {
    dispatchCameraAction('viewTop');
  }, []);

  const handleViewFront = useCallback(() => {
    dispatchCameraAction('viewFront');
  }, []);

  const handleViewSide = useCallback(() => {
    dispatchCameraAction('viewSide');
  }, []);

  return (
    <div className="camera-controls">
      {/* Zoom Controls */}
      <div className="camera-controls-group">
        <button
          onClick={handleZoomIn}
          className="camera-btn"
          title="확대"
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
            <path fillRule="evenodd" d="M6.5 12a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM13 6.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z"/>
            <path d="M10.344 11.742c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1 6.538 6.538 0 0 1-1.398 1.4z"/>
            <path fillRule="evenodd" d="M6.5 3a.5.5 0 0 1 .5.5V6h2.5a.5.5 0 0 1 0 1H7v2.5a.5.5 0 0 1-1 0V7H3.5a.5.5 0 0 1 0-1H6V3.5a.5.5 0 0 1 .5-.5z"/>
          </svg>
        </button>
        <button
          onClick={handleZoomOut}
          className="camera-btn"
          title="축소"
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
            <path fillRule="evenodd" d="M6.5 12a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11zM13 6.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0z"/>
            <path d="M10.344 11.742c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1 6.538 6.538 0 0 1-1.398 1.4z"/>
            <path fillRule="evenodd" d="M3 6.5a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1-.5-.5z"/>
          </svg>
        </button>
      </div>

      {/* View Preset Controls */}
      <div className="camera-controls-group">
        <button
          onClick={handleViewTop}
          className="camera-btn"
          title="상단 뷰 (평면도)"
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a.5.5 0 0 1 .5.5v4.793l2.146-2.147a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 1 1 .708-.708L7.5 6.293V1.5A.5.5 0 0 1 8 1z"/>
            <path d="M2 9.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/>
            <path d="M2 12.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/>
          </svg>
        </button>
        <button
          onClick={handleViewFront}
          className="camera-btn"
          title="정면 뷰"
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
            <path d="M0 2a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm15 0a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V2z"/>
            <path d="M7.5 4.5a.5.5 0 0 1 1 0v7a.5.5 0 0 1-1 0v-7z"/>
            <path d="M4.5 7.5a.5.5 0 0 1 .5-.5h6a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5z"/>
          </svg>
        </button>
        <button
          onClick={handleViewSide}
          className="camera-btn"
          title="측면 뷰"
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
            <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
            <path d="M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8z"/>
          </svg>
        </button>
      </div>

      {/* Reset View */}
      <div className="camera-controls-group">
        <button
          onClick={handleResetView}
          className="camera-btn primary"
          title="뷰 초기화 (3D 뷰)"
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
            <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';

interface ConnectionStatusProps {
  isConnected: boolean;
}

export function ConnectionStatus({ isConnected }: ConnectionStatusProps) {
  return (
    <div className="connection-status absolute top-20 left-4 z-10 flex items-center gap-2">
      <div className={`connection-dot ${isConnected ? 'connected' : 'disconnected'} ${isConnected ? 'animate-pulse' : ''}`} />
      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
        {isConnected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  );
}

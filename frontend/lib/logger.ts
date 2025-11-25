/**
 * Logger utility for collecting and saving logs to backend.
 */

export type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Maximum logs to keep in memory
  private autoSaveInterval: number | null = null;
  private autoSaveDelay = 5000; // Auto-save every 5 seconds
  private isSaving = false;

  constructor() {
    // Only initialize in browser environment
    if (typeof window === 'undefined') {
      return;
    }
    // Override console methods to capture logs
    this.setupConsoleOverrides();
    // Start auto-save
    this.startAutoSave();
  }

  private setupConsoleOverrides() {
    const originalConsole = {
      log: console.log.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      debug: console.debug.bind(console),
    };

    // Override console.log
    console.log = (...args: any[]) => {
      originalConsole.log(...args);
      this.addLog('log', this.formatMessage(args), args.length > 1 ? args.slice(1) : undefined);
    };

    // Override console.info
    console.info = (...args: any[]) => {
      originalConsole.info(...args);
      this.addLog('info', this.formatMessage(args), args.length > 1 ? args.slice(1) : undefined);
    };

    // Override console.warn
    console.warn = (...args: any[]) => {
      originalConsole.warn(...args);
      this.addLog('warn', this.formatMessage(args), args.length > 1 ? args.slice(1) : undefined);
    };

    // Override console.error
    console.error = (...args: any[]) => {
      originalConsole.error(...args);
      this.addLog('error', this.formatMessage(args), args.length > 1 ? args.slice(1) : undefined);
    };

    // Override console.debug
    console.debug = (...args: any[]) => {
      originalConsole.debug(...args);
      this.addLog('debug', this.formatMessage(args), args.length > 1 ? args.slice(1) : undefined);
    };
  }

  private isThreeJsObject(value: any): boolean {
    if (!value || typeof value !== 'object') return false;
    if (!value.constructor || !value.constructor.name) return false;

    const name = value.constructor.name;
    const threeJsPrefixes = [
      'GLTF', 'GLB', 'Loader', 'Parser', 'Extension',
      'Three', 'Mesh', 'Material', 'Geometry', 'Buffer',
      'Texture', 'Scene', 'Object3D', 'Camera', 'Light',
      'Vector', 'Matrix', 'Quaternion', 'Euler', 'Color',
      'WebGL', 'Shader', 'Uniform', 'Attribute'
    ];

    return threeJsPrefixes.some(prefix => name.includes(prefix));
  }

  private safeStringify(value: any, depth: number = 0, maxDepth: number = 3): string {
    // Depth limit to prevent deep recursion
    if (depth > maxDepth) {
      return '[Max Depth Reached]';
    }

    // Handle primitives
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return String(value);
    if (typeof value === 'function') return `[Function: ${value.name || 'anonymous'}]`;

    // Handle Three.js objects - just return type name
    if (this.isThreeJsObject(value)) {
      return `[${value.constructor.name}]`;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      if (value.length === 0) return '[]';
      if (value.length > 10) return `[Array(${value.length})]`;
      try {
        return '[' + value.map(v => this.safeStringify(v, depth + 1, maxDepth)).join(', ') + ']';
      } catch {
        return `[Array(${value.length})]`;
      }
    }

    // Handle objects
    if (typeof value === 'object') {
      try {
        const keys = Object.keys(value);
        if (keys.length === 0) return '{}';
        if (keys.length > 20) return `{${value.constructor?.name || 'Object'} with ${keys.length} keys}`;

        const parts: string[] = [];
        for (const key of keys.slice(0, 20)) {
          try {
            const val = value[key];
            parts.push(`${key}: ${this.safeStringify(val, depth + 1, maxDepth)}`);
          } catch {
            parts.push(`${key}: [Error]`);
          }
        }
        return '{' + parts.join(', ') + '}';
      } catch {
        return `[${value.constructor?.name || 'Object'}]`;
      }
    }

    // Final fallback - try String() with safety catch
    try {
      return String(value);
    } catch (error) {
      // If String() fails (e.g., circular reference), return safe representation
      return '[Unstringifiable Value]';
    }
  }

  private formatMessage(args: any[]): string {
    if (args.length === 0) return '';

    return args.map(arg => {
      try {
        return this.safeStringify(arg);
      } catch (error: any) {
        return `[Error formatting: ${error.message}]`;
      }
    }).join(' ');
  }

  private addLog(level: LogLevel, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data: data ? (Array.isArray(data) && data.length === 1 ? data[0] : data) : undefined,
    };

    this.logs.push(entry);

    // Limit log size
    if (this.logs.length > this.maxLogs) {
      this.logs.shift(); // Remove oldest log
    }
  }

  private startAutoSave() {
    // Only run in browser environment
    if (typeof window === 'undefined') {
      return;
    }

    if (this.autoSaveInterval !== null) {
      return; // Already started
    }

    // Only run in browser environment
    if (typeof window === 'undefined') {
      return;
    }

    this.autoSaveInterval = window.setInterval(() => {
      if (this.logs.length > 0 && !this.isSaving) {
        this.saveLogs();
      }
    }, this.autoSaveDelay);
  }

  private stopAutoSave() {
    if (this.autoSaveInterval !== null) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  async saveLogs(): Promise<void> {
    if (this.isSaving || this.logs.length === 0) {
      return;
    }

    this.isSaving = true;
    let logsToSave: LogEntry[] = [];

    try {
      logsToSave = [...this.logs];
      this.logs = []; // Clear logs after copying

      const token = localStorage.getItem('token');
      if (!token) {
        // If not authenticated, keep logs in memory
        this.logs = logsToSave;
        return;
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8008/api/v1';
      const url = `${apiUrl}/logs/save-logs`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ logs: logsToSave }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save logs: ${response.status}`);
      }
    } catch (error: any) {
      // Put logs back if save failed
      this.logs = [...this.logs, ...logsToSave];
    } finally {
      this.isSaving = false;
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }

  // Manual save (can be called on page unload)
  async flush() {
    this.stopAutoSave();
    await this.saveLogs();
  }
}

// Create singleton instance only in browser
export const logger = typeof window !== 'undefined' ? new Logger() : null as any;

// Expose logger to window for manual testing
if (typeof window !== 'undefined') {
  (window as any).logger = logger;

  // Save logs on page unload
  window.addEventListener('beforeunload', () => {
    logger.flush();
  });

  // Manual save function for testing
  (window as any).saveLogs = () => {
    logger.saveLogs();
  };
}


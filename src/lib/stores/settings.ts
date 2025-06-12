import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface SettingsState {
  // Canvas settings
  canvasQuality: 'low' | 'medium' | 'high';
  gridVisible: boolean;
  gridSize: number;
  snapToGrid: boolean;
  
  // Export settings
  defaultExportFormat: 'png' | 'jpg' | 'webp';
  exportQuality: number;
  includeLayers: boolean;
  
  // Auto-save settings
  autoSave: boolean;
  autoSaveInterval: number; // minutes
  
  // Drawing settings
  defaultBrushSize: number;
  defaultColor: string;
  smoothing: boolean;
  
  // UI settings
  panelPosition: 'left' | 'right';
  showTooltips: boolean;
  showWelcomeScreen: boolean;
  
  // Performance settings
  maxHistorySteps: number;
  memoryOptimization: boolean;
  
  // Logo settings
  defaultLogoOpacity: number;
  defaultLogoScale: number;
  logoSnapToEdges: boolean;
  
  // Recent files
  recentFiles: RecentFile[];
  maxRecentFiles: number;
  
  // Export history
  exportHistory: ExportRecord[];
  maxExportHistory: number;
  trackExports: boolean;
}

export interface RecentFile {
  id: string;
  name: string;
  path?: string;
  thumbnail?: string;
  lastModified: number;
  size: number;
}

export interface ExportRecord {
  id: string;
  filename: string;
  format: 'png' | 'jpg' | 'webp';
  quality: number;
  fileSize: number;
  timestamp: number;
  thumbnail?: string;
  duration: number; // export time in milliseconds
  canvasSize: { width: number; height: number };
  includesLogos: boolean;
  includesMeasurements: boolean;
  includesAnnotations: boolean;
}

const defaultSettings: SettingsState = {
  // Canvas settings
  canvasQuality: 'high',
  gridVisible: true,
  gridSize: 20,
  snapToGrid: false,
  
  // Export settings
  defaultExportFormat: 'png',
  exportQuality: 0.9,
  includeLayers: true,
  
  // Auto-save settings
  autoSave: true,
  autoSaveInterval: 5,
  
  // Drawing settings
  defaultBrushSize: 3,
  defaultColor: '#e4915c',
  smoothing: true,
  
  // UI settings
  panelPosition: 'left',
  showTooltips: true,
  showWelcomeScreen: true,
  
  // Performance settings
  maxHistorySteps: 50,
  memoryOptimization: true,
  
  // Logo settings
  defaultLogoOpacity: 90,
  defaultLogoScale: 100,
  logoSnapToEdges: true,
  
  // Recent files
  recentFiles: [],
  maxRecentFiles: 10,
  
  // Export history
  exportHistory: [],
  maxExportHistory: 50,
  trackExports: true
};

function createSettingsStore() {
  // Load settings from localStorage
  const getInitialSettings = (): SettingsState => {
    if (!browser) return defaultSettings;
    
    try {
      const stored = localStorage.getItem('realtycanvas-settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle new settings
        return { ...defaultSettings, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load settings:', error);
    }
    
    return defaultSettings;
  };

  const { subscribe, set, update } = writable<SettingsState>(getInitialSettings());

  // Auto-save timer
  let autoSaveTimer: number | null = null;

  return {
    subscribe,
    
    // Update individual settings
    updateSetting: <K extends keyof SettingsState>(
      key: K, 
      value: SettingsState[K]
    ) => {
      update(settings => {
        const newSettings = { ...settings, [key]: value };
        saveSettings(newSettings);
        return newSettings;
      });
    },
    
    // Bulk update settings
    updateSettings: (updates: Partial<SettingsState>) => {
      update(settings => {
        const newSettings = { ...settings, ...updates };
        saveSettings(newSettings);
        return newSettings;
      });
    },
    
    // Reset to defaults
    reset: () => {
      set(defaultSettings);
      saveSettings(defaultSettings);
    },
    
    // Export settings
    export: (): string => {
      const settings = getInitialSettings();
      return JSON.stringify(settings, null, 2);
    },
    
    // Import settings
    import: (settingsJson: string): boolean => {
      try {
        const importedSettings = JSON.parse(settingsJson);
        const mergedSettings = { ...defaultSettings, ...importedSettings };
        set(mergedSettings);
        saveSettings(mergedSettings);
        return true;
      } catch (error) {
        console.error('Failed to import settings:', error);
        return false;
      }
    },
    
    // Recent files management
    addRecentFile: (file: Omit<RecentFile, 'id' | 'lastModified'>) => {
      update(settings => {
        const newFile: RecentFile = {
          ...file,
          id: Date.now().toString(),
          lastModified: Date.now()
        };
        
        // Remove existing entry if it exists
        const filtered = settings.recentFiles.filter(f => f.name !== file.name);
        
        // Add to beginning and limit
        const recentFiles = [newFile, ...filtered].slice(0, settings.maxRecentFiles);
        
        const newSettings = { ...settings, recentFiles };
        saveSettings(newSettings);
        return newSettings;
      });
    },
    
    removeRecentFile: (fileId: string) => {
      update(settings => {
        const recentFiles = settings.recentFiles.filter(f => f.id !== fileId);
        const newSettings = { ...settings, recentFiles };
        saveSettings(newSettings);
        return newSettings;
      });
    },
    
    clearRecentFiles: () => {
      update(settings => {
        const newSettings = { ...settings, recentFiles: [] };
        saveSettings(newSettings);
        return newSettings;
      });
    },

    // Export history management
    addExportRecord: (record: Omit<ExportRecord, 'id' | 'timestamp'>) => {
      update(settings => {
        if (!settings.trackExports) return settings;
        
        const newRecord: ExportRecord = {
          ...record,
          id: Date.now().toString(),
          timestamp: Date.now()
        };
        
        // Add to beginning and limit
        const exportHistory = [newRecord, ...settings.exportHistory].slice(0, settings.maxExportHistory);
        
        const newSettings = { ...settings, exportHistory };
        saveSettings(newSettings);
        return newSettings;
      });
    },

    removeExportRecord: (recordId: string) => {
      update(settings => {
        const exportHistory = settings.exportHistory.filter(r => r.id !== recordId);
        const newSettings = { ...settings, exportHistory };
        saveSettings(newSettings);
        return newSettings;
      });
    },

    clearExportHistory: () => {
      update(settings => {
        const newSettings = { ...settings, exportHistory: [] };
        saveSettings(newSettings);
        return newSettings;
      });
    },

    getExportHistory: () => {
      const settings = getInitialSettings();
      return settings.exportHistory;
    },

    getExportStats: () => {
      const settings = getInitialSettings();
      const history = settings.exportHistory;
      
      const stats = {
        totalExports: history.length,
        totalFileSize: history.reduce((sum, record) => sum + record.fileSize, 0),
        averageExportTime: history.length > 0 
          ? history.reduce((sum, record) => sum + record.duration, 0) / history.length 
          : 0,
        formatBreakdown: {
          png: history.filter(r => r.format === 'png').length,
          jpg: history.filter(r => r.format === 'jpg').length,
          webp: history.filter(r => r.format === 'webp').length
        },
        recentExports: history.slice(0, 5)
      };
      
      return stats;
    },
    
    // Auto-save management
    startAutoSave: (callback: () => void) => {
      const settings = getInitialSettings();
      if (!settings.autoSave) return;
      
      if (autoSaveTimer) {
        clearInterval(autoSaveTimer);
      }
      
      autoSaveTimer = setInterval(callback, settings.autoSaveInterval * 60 * 1000);
    },
    
    stopAutoSave: () => {
      if (autoSaveTimer) {
        clearInterval(autoSaveTimer);
        autoSaveTimer = null;
      }
    },
    
    // Keyboard shortcuts (could be expanded)
    getKeyboardShortcuts: () => ({
      'Ctrl+Z': 'Undo',
      'Ctrl+Y': 'Redo', 
      'Ctrl+S': 'Save',
      'Ctrl+E': 'Export',
      'Ctrl+O': 'Open',
      'Ctrl+N': 'New',
      'Del': 'Delete Selected',
      'Esc': 'Deselect',
      '1': 'Pen Tool',
      '2': 'Rectangle Tool',
      '3': 'Circle Tool',
      '4': 'Text Tool',
      'V': 'Move Tool',
      'G': 'Toggle Grid',
      '+': 'Zoom In',
      '-': 'Zoom Out',
      '0': 'Fit to Window'
    })
  };
  
  function saveSettings(settings: SettingsState) {
    if (!browser) return;
    
    try {
      localStorage.setItem('realtycanvas-settings', JSON.stringify(settings));
    } catch (error) {
      console.warn('Failed to save settings:', error);
    }
  }
}

export const settingsStore = createSettingsStore();

// Utility functions for working with settings
export function getStoredSetting<K extends keyof SettingsState>(
  key: K,
  defaultValue: SettingsState[K]
): SettingsState[K] {
  if (!browser) return defaultValue;
  
  try {
    const stored = localStorage.getItem('realtycanvas-settings');
    if (stored) {
      const settings = JSON.parse(stored);
      return settings[key] ?? defaultValue;
    }
  } catch (error) {
    console.warn('Failed to get stored setting:', error);
  }
  
  return defaultValue;
}

export function validateSettings(settings: any): settings is SettingsState {
  return (
    typeof settings === 'object' &&
    settings !== null &&
    typeof settings.canvasQuality === 'string' &&
    ['low', 'medium', 'high'].includes(settings.canvasQuality) &&
    typeof settings.autoSave === 'boolean' &&
    typeof settings.gridVisible === 'boolean'
    // Add more validation as needed
  );
} 
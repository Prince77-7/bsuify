import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface PropertyTemplate {
  id: string;
  name: string;
  category: 'property-lines' | 'features' | 'measurements' | 'labels' | 'custom';
  description: string;
  thumbnail?: string;
  elements: TemplateElement[];
  isCustom: boolean;
  createdAt: number;
  lastUsed?: number;
  useCount: number;
}

export interface TemplateElement {
  type: 'text' | 'measurement' | 'shape' | 'logo';
  id: string;
  x: number;
  y: number;
  properties: {
    // Text properties
    text?: string;
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    backgroundColor?: string;
    hasBackground?: boolean;
    rotation?: number;
    
    // Shape properties
    width?: number;
    height?: number;
    radius?: number;
    strokeColor?: string;
    fillColor?: string;
    strokeWidth?: number;
    shapeType?: 'rectangle' | 'circle' | 'line' | 'polygon';
    points?: { x: number; y: number }[];
    
    // Measurement properties
    measurementType?: 'distance' | 'area';
    unit?: string;
    
    // Logo properties
    logoId?: string;
    scale?: number;
    opacity?: number;
  };
}

export interface TemplateStore {
  templates: PropertyTemplate[];
  categories: string[];
  selectedCategory: string;
  searchQuery: string;
}

// Pre-built real estate templates
const DEFAULT_TEMPLATES: PropertyTemplate[] = [
  {
    id: 'property-boundary-basic',
    name: 'Property Boundary - Basic',
    category: 'property-lines',
    description: 'Basic property line marking with corner labels',
    isCustom: false,
    createdAt: Date.now(),
    useCount: 0,
    elements: [
      {
        type: 'text',
        id: 'corner-1',
        x: 50,
        y: 50,
        properties: {
          text: 'Property Corner',
          fontSize: 12,
          fontFamily: 'Inter',
          color: '#cc0000',
          backgroundColor: '#ffffff',
          hasBackground: true
        }
      },
      {
        type: 'shape',
        id: 'boundary-line',
        x: 50,
        y: 70,
        properties: {
          shapeType: 'line',
          points: [{ x: 0, y: 0 }, { x: 200, y: 0 }],
          strokeColor: '#cc0000',
          strokeWidth: 2
        }
      }
    ]
  },
  {
    id: 'building-outline',
    name: 'Building Outline',
    category: 'features',
    description: 'Standard building outline with square footage label',
    isCustom: false,
    createdAt: Date.now(),
    useCount: 0,
    elements: [
      {
        type: 'shape',
        id: 'building-rect',
        x: 100,
        y: 100,
        properties: {
          shapeType: 'rectangle',
          width: 150,
          height: 100,
          strokeColor: '#0066cc',
          fillColor: '#e6f3ff',
          strokeWidth: 2
        }
      },
      {
        type: 'text',
        id: 'sqft-label',
        x: 175,
        y: 150,
        properties: {
          text: '1,200 sq ft',
          fontSize: 14,
          fontFamily: 'Inter',
          color: '#0066cc',
          backgroundColor: '#ffffff',
          hasBackground: true
        }
      }
    ]
  },
  {
    id: 'landscape-features',
    name: 'Landscape Features',
    category: 'features',
    description: 'Trees, garden areas, and landscape elements',
    isCustom: false,
    createdAt: Date.now(),
    useCount: 0,
    elements: [
      {
        type: 'shape',
        id: 'tree-circle',
        x: 200,
        y: 200,
        properties: {
          shapeType: 'circle',
          radius: 25,
          strokeColor: '#009900',
          fillColor: '#ccffcc',
          strokeWidth: 2
        }
      },
      {
        type: 'text',
        id: 'tree-label',
        x: 185,
        y: 240,
        properties: {
          text: 'Oak Tree',
          fontSize: 11,
          fontFamily: 'Inter',
          color: '#009900',
          backgroundColor: '#ffffff',
          hasBackground: true
        }
      }
    ]
  },
  {
    id: 'driveway-parking',
    name: 'Driveway & Parking',
    category: 'features',
    description: 'Driveway outline with parking spaces',
    isCustom: false,
    createdAt: Date.now(),
    useCount: 0,
    elements: [
      {
        type: 'shape',
        id: 'driveway',
        x: 50,
        y: 300,
        properties: {
          shapeType: 'rectangle',
          width: 20,
          height: 100,
          strokeColor: '#666666',
          fillColor: '#f0f0f0',
          strokeWidth: 2
        }
      },
      {
        type: 'text',
        id: 'driveway-label',
        x: 45,
        y: 410,
        properties: {
          text: 'Driveway',
          fontSize: 12,
          fontFamily: 'Inter',
          color: '#666666',
          backgroundColor: '#ffffff',
          hasBackground: true
        }
      }
    ]
  },
  {
    id: 'measurement-combo',
    name: 'Property Measurements',
    category: 'measurements',
    description: 'Distance and area measurement tools combo',
    isCustom: false,
    createdAt: Date.now(),
    useCount: 0,
    elements: [
      {
        type: 'measurement',
        id: 'front-distance',
        x: 100,
        y: 50,
        properties: {
          measurementType: 'distance',
          unit: 'feet',
          points: [{ x: 0, y: 0 }, { x: 200, y: 0 }]
        }
      },
      {
        type: 'measurement',
        id: 'lot-area',
        x: 150,
        y: 150,
        properties: {
          measurementType: 'area',
          unit: 'sq ft',
          points: [
            { x: 0, y: 0 },
            { x: 200, y: 0 },
            { x: 200, y: 150 },
            { x: 0, y: 150 }
          ]
        }
      }
    ]
  }
];

const initialState: TemplateStore = {
  templates: DEFAULT_TEMPLATES,
  categories: ['property-lines', 'features', 'measurements', 'labels', 'custom'],
  selectedCategory: 'all',
  searchQuery: ''
};

function createTemplateStore() {
  // Load templates from localStorage
  const getInitialTemplates = (): TemplateStore => {
    if (!browser) return initialState;
    
    try {
      const stored = localStorage.getItem('realtycanvas-templates');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with default templates
        const customTemplates = parsed.templates.filter((t: PropertyTemplate) => t.isCustom);
        const allTemplates = [...DEFAULT_TEMPLATES, ...customTemplates];
        
        return {
          ...initialState,
          templates: allTemplates
        };
      }
    } catch (error) {
      console.warn('Failed to load templates:', error);
    }
    
    return initialState;
  };

  const { subscribe, set, update } = writable<TemplateStore>(getInitialTemplates());

  return {
    subscribe,
    
    // Category management
    setCategory: (category: string) => {
      update(state => ({ ...state, selectedCategory: category }));
    },
    
    setSearchQuery: (query: string) => {
      update(state => ({ ...state, searchQuery: query }));
    },
    
    // Template management
    getTemplates: (category?: string, search?: string) => {
      const state = getInitialTemplates();
      let filtered = state.templates;
      
      if (category && category !== 'all') {
        filtered = filtered.filter(t => t.category === category);
      }
      
      if (search) {
        const query = search.toLowerCase();
        filtered = filtered.filter(t => 
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query)
        );
      }
      
      return filtered.sort((a, b) => {
        // Sort by usage count (popular first), then by name
        if (a.useCount !== b.useCount) {
          return b.useCount - a.useCount;
        }
        return a.name.localeCompare(b.name);
      });
    },
    
    addTemplate: (template: Omit<PropertyTemplate, 'id' | 'createdAt' | 'useCount'>) => {
      const newTemplate: PropertyTemplate = {
        ...template,
        id: Date.now().toString(),
        createdAt: Date.now(),
        useCount: 0
      };
      
      update(state => {
        const newState = {
          ...state,
          templates: [...state.templates, newTemplate]
        };
        saveTemplates(newState);
        return newState;
      });
    },
    
    updateTemplate: (id: string, updates: Partial<PropertyTemplate>) => {
      update(state => {
        const newState = {
          ...state,
          templates: state.templates.map(t => 
            t.id === id ? { ...t, ...updates } : t
          )
        };
        saveTemplates(newState);
        return newState;
      });
    },
    
    removeTemplate: (id: string) => {
      update(state => {
        const template = state.templates.find(t => t.id === id);
        
        // Prevent deletion of default templates
        if (template && !template.isCustom) {
          throw new Error('Cannot delete default templates');
        }
        
        const newState = {
          ...state,
          templates: state.templates.filter(t => t.id !== id)
        };
        saveTemplates(newState);
        return newState;
      });
    },
    
    // Template usage
    useTemplate: (id: string) => {
      update(state => {
        const newState = {
          ...state,
          templates: state.templates.map(t => 
            t.id === id ? { 
              ...t, 
              useCount: t.useCount + 1,
              lastUsed: Date.now() 
            } : t
          )
        };
        saveTemplates(newState);
        return newState;
      });
    },
    
    getPopularTemplates: (limit: number = 5) => {
      const state = getInitialTemplates();
      return state.templates
        .filter(t => t.useCount > 0)
        .sort((a, b) => b.useCount - a.useCount)
        .slice(0, limit);
    },
    
    getRecentTemplates: (limit: number = 5) => {
      const state = getInitialTemplates();
      return state.templates
        .filter(t => t.lastUsed)
        .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0))
        .slice(0, limit);
    },
    
    // Template creation helpers
    createTemplateFromCanvas: (name: string, description: string, elements: TemplateElement[]): PropertyTemplate => {
      return {
        id: Date.now().toString(),
        name,
        description,
        category: 'custom',
        elements,
        isCustom: true,
        createdAt: Date.now(),
        useCount: 0
      };
    },
    
    // Export/Import
    exportTemplates: (): string => {
      const state = getInitialTemplates();
      const customTemplates = state.templates.filter(t => t.isCustom);
      return JSON.stringify({ templates: customTemplates }, null, 2);
    },
    
    importTemplates: (templatesJson: string): boolean => {
      try {
        const imported = JSON.parse(templatesJson);
        if (imported.templates && Array.isArray(imported.templates)) {
          update(state => {
            const newTemplates = imported.templates.map((t: any) => ({
              ...t,
              id: `imported-${Date.now()}-${Math.random()}`,
              isCustom: true,
              createdAt: Date.now(),
              useCount: 0
            }));
            
            const newState = {
              ...state,
              templates: [...state.templates, ...newTemplates]
            };
            saveTemplates(newState);
            return newState;
          });
          return true;
        }
      } catch (error) {
        console.error('Failed to import templates:', error);
      }
      return false;
    }
  };
  
  function saveTemplates(state: TemplateStore) {
    if (!browser) return;
    
    try {
      // Only save custom templates
      const customTemplates = state.templates.filter(t => t.isCustom);
      localStorage.setItem('realtycanvas-templates', JSON.stringify({
        templates: customTemplates
      }));
    } catch (error) {
      console.error('Failed to save templates:', error);
    }
  }
}

export const templateStore = createTemplateStore(); 
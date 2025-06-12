import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';

export type DrawingTool = 'move' | 'pen' | 'square' | 'circle' | 'polygon' | 'text' | 'ruler' | 'area';

export interface CanvasState {
  // Canvas properties
  width: number;
  height: number;
  zoom: number;
  
  // Current tool and settings
  activeTool: DrawingTool;
  brushSize: number;
  color: string;
  opacity: number;
  
  // Image
  backgroundImage: HTMLImageElement | null;
  imageLoaded: boolean;
  
  // Drawing state
  isDrawing: boolean;
  startX: number;
  startY: number;
  
  // Vector pen tool state (Inkscape-style)
  pathPoints: PathPoint[];
  isCreatingPath: boolean;
  currentVectorPath: VectorPath | null;
  pathPreview: { startPoint: PathPoint; currentPoint: { x: number; y: number } } | null;
  completedVectorPaths: VectorPath[];
  
  // Shape storage for persistent shapes
  completedShapes: DrawnShape[];
  selectedShapeId: string | null;
  selectedVectorPathId: string | null;
  
  // Logo storage
  logos: Logo[];
  selectedLogoId: number | null;
  
  // Arrow storage
  arrows: Arrow[];
  selectedArrowId: number | null;
  
  // Selection and interaction
  selectedElements: SelectedElement[];
  showSelectionHandles: boolean;
  resizeHandle: ResizeHandle | null;
  isResizing: boolean;
  
  // Text tool settings
  fontSize: number;
  fontFamily: string;
  textColor: string;
  textBackgroundColor: string;
  textBackground: boolean;
  
  // Measurement settings
  pixelsPerFoot: number;
  showMeasurements: boolean;
  measurementUnit: 'feet' | 'meters' | 'yards';
  
  // Measurements storage
  measurements: Measurement[];
  
  // Text annotations
  textAnnotations: TextAnnotation[];
  
  // History for undo/redo
  historyStep: number;
  history: ImageData[];
  
  // Layers
  layers: Layer[];
  activeLayerId: string;
  
  // Performance tracking
  memoryUsage: number;

  textInput: {
    isActive: boolean;
    x: number;
    y: number;
    text: string;
  } | null;
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
}

export interface Logo {
  id: number;
  name: string;
  src: string;
  image: HTMLImageElement | null;
  x: number;
  y: number;
  scale: number;
  opacity: number;
  visible: boolean;
  rotation: number;
  hasBackground: boolean;
  backgroundColor: string;
  backgroundPadding: number;
  backgroundRadius: number;
}

export interface Arrow {
  id: number;
  name: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  width: number;
  visible: boolean;
}

export interface SelectedElement {
  id: string;
  type: 'shape' | 'vectorPath' | 'logo' | 'text' | 'arrow';
  elementId: string | number;
}

export interface ResizeHandle {
  type: 'corner' | 'edge' | 'rotation';
  position: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | 'rotation' | 'start' | 'end';
  elementType: 'shape' | 'logo' | 'text' | 'arrow';
  elementId: string | number;
  x: number;
  y: number;
  size: number;
}

export interface Measurement {
  id: string;
  type: 'distance' | 'area';
  points: { x: number; y: number }[];
  value: number;
  unit: string;
  label: string;
  visible: boolean;
  color: string;
}

export interface TextAnnotation {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor?: string;
  hasBackground: boolean;
  visible: boolean;
  rotation: number;
  selected: boolean;
}

export interface DrawnShape {
  id: string;
  type: 'square' | 'circle';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  brushSize: number;
  opacity: number;
}

export // Vector pen tool interfaces (Inkscape-style)
interface PathPoint {
  x: number;
  y: number;
  id: string;
}

interface VectorPath {
  id: string;
  points: PathPoint[];
  closed: boolean;
  stroke: string;
  strokeWidth: number;
  fill?: string;
}

const initialState: CanvasState = {
  width: 1200,
  height: 800,
  zoom: 100,
  activeTool: 'move',
  brushSize: 3,
  color: '#e4915c',
  opacity: 100,
  backgroundImage: null,
  imageLoaded: false,
  isDrawing: false,
  startX: 0,
  startY: 0,
  pathPoints: [],
  isCreatingPath: false,
  currentVectorPath: null,
  pathPreview: null,
  completedVectorPaths: [],
  completedShapes: [],
  selectedShapeId: null,
  selectedVectorPathId: null,
  logos: [],
  selectedLogoId: null,
  arrows: [],
  selectedArrowId: null,
  selectedElements: [],
  showSelectionHandles: true,
  resizeHandle: null,
  isResizing: false,
  fontSize: 16,
  fontFamily: 'Inter',
  textColor: '#000000',
  textBackgroundColor: '#ffffff',
  textBackground: false,
  pixelsPerFoot: 100,
  showMeasurements: true,
  measurementUnit: 'feet',
  measurements: [],
  textAnnotations: [],
  historyStep: -1,
  history: [],
  layers: [],
  activeLayerId: '',
  memoryUsage: 0,
  textInput: null
};

function createCanvasStore() {
  const { subscribe, set, update } = writable<CanvasState>(initialState);
  
  let mainCanvas: HTMLCanvasElement | null = null;
  let mainContext: CanvasRenderingContext2D | null = null;
  let selectedLogoForMove: Logo | null = null;

  return {
    subscribe,
    
    // Initialize canvas
    init: (canvas: HTMLCanvasElement) => {
      mainCanvas = canvas;
      mainContext = canvas.getContext('2d');
      if (mainContext) {
        mainContext.fillStyle = '#ffffff';
        mainContext.fillRect(0, 0, canvas.width, canvas.height);
        
        // Create initial layers
        update(state => ({
          ...state,
          layers: [
            createLayer('background', 'Background'),
            createLayer('property-lines', 'Property Lines'),
            createLayer('annotations', 'Annotations')
          ],
          activeLayerId: 'property-lines'
        }));
        
        saveState();
        
        // Add a test arrow for debugging
        setTimeout(() => {
          console.log('Adding test arrow');
          canvasStore.addArrow({
            name: 'Test Arrow',
            startX: 100,
            startY: 100,
            endX: 300,
            endY: 200,
            color: '#ff0000',
            width: 3,
            visible: true
          });
        }, 1000);
      }
    },
    
    // Tool management
    setTool: (tool: DrawingTool) => {
      update(state => ({ ...state, activeTool: tool }));
    },
    
    setBrushSize: (size: number) => {
      update(state => ({ ...state, brushSize: size }));
    },
    
    setColor: (color: string) => {
      update(state => ({ ...state, color }));
    },
    
    setOpacity: (opacity: number) => {
      update(state => ({ ...state, opacity }));
    },
    
    // Zoom controls
    setZoom: (zoom: number) => {
      update(state => ({ ...state, zoom: Math.max(25, Math.min(200, zoom)) }));
    },
    
    zoomIn: () => {
      update(state => ({ ...state, zoom: Math.min(200, state.zoom + 25) }));
    },
    
    zoomOut: () => {
      update(state => ({ ...state, zoom: Math.max(25, state.zoom - 25) }));
    },
    
    // Image handling
    loadImage: (file: File): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
          reject(new Error('Invalid file type'));
          return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            update(state => {
              // Use original image dimensions to preserve full resolution
              const { width, height } = img;
              
              // Update canvas dimensions to match the image
              if (mainCanvas) {
                mainCanvas.width = width;
                mainCanvas.height = height;
              }
              
              return {
                ...state,
                backgroundImage: img,
                imageLoaded: true,
                width,
                height
              };
            });
            
            // Draw image on background layer
            drawBackgroundImage();
            saveState();
            resolve();
          };
          
          img.onerror = () => reject(new Error('Failed to load image'));
          img.src = e.target?.result as string;
        };
        
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
    },
    
    // Drawing operations - INKSCAPE-STYLE VECTOR PEN TOOL
    startDrawing: (x: number, y: number, pressure: number = 1) => {
      const state = get(canvasStore);
      if (!mainContext) return;
      
      if (state.activeTool === 'text') {
        // Check if clicking on existing text for editing
        const clickedText = findTextAnnotationAt(x, y);
        if (clickedText) {
          canvasStore.startEditingText(clickedText.id);
          return;
        } else {
          // Create new text
          canvasStore.startTextInput(x, y);
          return;
        }
      } else if (state.activeTool === 'pen') {
        // Vector pen tool - click to place anchor points
        handleVectorPenClick(x, y);
      } else if (state.activeTool === 'move') {
        // Check for text selection first
        const clickedText = findTextAnnotationAt(x, y);
        if (clickedText) {
          canvasStore.selectTextAnnotation(clickedText.id);
          update(s => ({ ...s, isDrawing: true, startX: x, startY: y }));
          return;
        }
        
        // Check for resize handles
        const clickedHandle = findResizeHandleAt(x, y);
        
        if (clickedHandle) {
          // Start resizing
          update(s => ({ 
            ...s, 
            resizeHandle: clickedHandle,
            isResizing: true,
            isDrawing: true,
            startX: x, 
            startY: y 
          }));
        } else {
          // Check for element selection
          const clickedShape = findShapeAt(x, y);
          const clickedVectorPath = findVectorPathAt(x, y);
          const clickedLogo = findLogoAt(x, y);
          
          // Clear previous selections and set new selection
          if (clickedShape) {
            canvasStore.selectElement('shape', clickedShape.id);
            update(s => ({ ...s, isDrawing: true, startX: x, startY: y }));
          } else if (clickedVectorPath) {
            canvasStore.selectElement('vectorPath', clickedVectorPath.id);
            update(s => ({ ...s, isDrawing: true, startX: x, startY: y }));
          } else if (clickedLogo) {
            canvasStore.selectElement('logo', clickedLogo.id.toString());
            update(s => ({ ...s, isDrawing: true, startX: x, startY: y }));
            selectedLogoForMove = clickedLogo;
          } else {
            // Clicked on empty space - clear all selections
            canvasStore.clearAllSelections();
          }
        }
      } else {
        // Other tools - traditional drawing
        update(s => ({ 
          ...s, 
          isDrawing: true, 
          startX: x, 
          startY: y,
          selectedShapeId: null, // Clear selection when starting new shape
          selectedVectorPathId: null
        }));
        
        mainContext.beginPath();
        mainContext.moveTo(x, y);
      }
    },
    
    draw: (x: number, y: number, pressure: number = 1) => {
      const state = get(canvasStore);
      if (!mainContext) return;
      
      if (state.activeTool === 'pen') {
        // Vector pen tool - show preview line
        handleVectorPenPreview(x, y);
      } else if (state.activeTool === 'move' && state.isDrawing) {
        if (state.isResizing && state.resizeHandle) {
          // Handle resizing
          handleResize(x, y);
        } else {
          // Move tool - move selected elements
          const deltaX = x - state.startX;
          const deltaY = y - state.startY;
          
          // Check if we're moving a text annotation
          const selectedText = state.textAnnotations.find(t => t.selected);
          if (selectedText) {
            moveTextAnnotation(selectedText.id, deltaX, deltaY);
            update(s => ({ ...s, startX: x, startY: y }));
            return;
          }
          
          // Move all selected elements
          state.selectedElements.forEach(element => {
            if (element.type === 'shape') {
              moveShape(element.elementId as string, deltaX, deltaY);
            } else if (element.type === 'vectorPath') {
              moveVectorPath(element.elementId as string, deltaX, deltaY);
            } else if (element.type === 'logo') {
              const logo = state.logos.find(l => l.id.toString() === element.elementId);
              if (logo) {
                canvasStore.updateLogo(logo.id, { 
                  x: logo.x + deltaX, 
                  y: logo.y + deltaY 
                });
              }
            }
          });
          
          update(s => ({ ...s, startX: x, startY: y }));
        }
      } else if (state.isDrawing) {
        // Other tools - show preview while drawing
        switch (state.activeTool) {
          case 'square':
          case 'circle':
            redrawCanvas();
            drawShapePreview(state.activeTool, state.startX, state.startY, x, y);
            break;
        }
      }
    },

    stopDrawing: () => {
      const state = get(canvasStore);
      if (!mainContext) return;
      
      if (state.activeTool === 'pen') {
        // Vector pen tool continues until double-click or close path
        return;
      } else if (state.activeTool === 'move') {
        // Finish moving or resizing
        update(s => ({ 
          ...s, 
          isDrawing: false,
          isResizing: false,
          resizeHandle: null
        }));
        selectedLogoForMove = null;
      } else if (state.isDrawing) {
        // Finish drawing shape - commit it permanently
        if (state.activeTool === 'square' || state.activeTool === 'circle') {
          const newShape: DrawnShape = {
            id: Date.now().toString(),
            type: state.activeTool,
            startX: state.startX,
            startY: state.startY,
            endX: state.startX, // Will be updated by mouse position
            endY: state.startY, // Will be updated by mouse position  
            color: state.color,
            brushSize: state.brushSize,
            opacity: state.opacity
          };
          
          // Get the current mouse position for the final shape
          // We'll update this in the Canvas component
          update(s => ({ 
            ...s, 
            isDrawing: false,
            completedShapes: [...s.completedShapes, newShape]
          }));
          
          redrawCanvas();
          saveState();
        } else {
          update(s => ({ ...s, isDrawing: false }));
          saveState();
        }
      }
    },

    // Alias for backwards compatibility
    endDrawing: () => canvasStore.stopDrawing(),

    // Helper to finish drawing a shape with end coordinates
    finishShape: (endX: number, endY: number) => {
      const state = get(canvasStore);
      if (state.isDrawing && (state.activeTool === 'square' || state.activeTool === 'circle')) {
        // Update the last added shape with the correct end coordinates
        update(s => ({
          ...s,
          completedShapes: s.completedShapes.map((shape, index) => 
            index === s.completedShapes.length - 1 
              ? { ...shape, endX, endY }
              : shape
          )
        }));
      }
    },
    
    // Vector pen tool controls
    finishCurrentPath: () => {
      finishVectorPath(false);
    },

    closeCurrentPath: () => {
      finishVectorPath(true);
    },

    cancelCurrentPath: () => {
      update(s => ({
        ...s,
        isCreatingPath: false,
        pathPoints: [],
        currentVectorPath: null,
        pathPreview: null
      }));
      redrawCanvas();
    },

    clearPreview: () => {
      const state = get(canvasStore);
      if (state.pathPreview && !state.isCreatingPath) {
        update(s => ({ ...s, pathPreview: null }));
        redrawCanvas();
      }
    },

    // Selection management
    selectElement: (type: 'shape' | 'vectorPath' | 'logo' | 'text', elementId: string) => {
      const newElement: SelectedElement = {
        id: Date.now().toString(),
        type,
        elementId
      };
      
      update(state => ({
        ...state,
        selectedElements: [newElement], // Single selection for now
        selectedShapeId: type === 'shape' ? elementId : null,
        selectedVectorPathId: type === 'vectorPath' ? elementId : null,
        selectedLogoId: type === 'logo' ? parseInt(elementId) : null
      }));
      
      redrawCanvas();
    },

    addToSelection: (type: 'shape' | 'vectorPath' | 'logo' | 'text', elementId: string) => {
      const newElement: SelectedElement = {
        id: Date.now().toString(),
        type,
        elementId
      };
      
      update(state => ({
        ...state,
        selectedElements: [...state.selectedElements, newElement]
      }));
      
      redrawCanvas();
    },

    clearAllSelections: () => {
      update(state => ({
        ...state,
        selectedElements: [],
        selectedShapeId: null,
        selectedVectorPathId: null,
        selectedLogoId: null
      }));
      
      redrawCanvas();
    },

    deleteSelectedElements: () => {
      const state = get(canvasStore);
      
      state.selectedElements.forEach(element => {
        if (element.type === 'shape') {
          update(s => ({
            ...s,
            completedShapes: s.completedShapes.filter(shape => shape.id !== element.elementId)
          }));
        } else if (element.type === 'vectorPath') {
          update(s => ({
            ...s,
            completedVectorPaths: s.completedVectorPaths.filter(path => path.id !== element.elementId)
          }));
        } else if (element.type === 'logo') {
          update(s => ({
            ...s,
            logos: s.logos.filter(logo => logo.id.toString() !== element.elementId)
          }));
        } else if (element.type === 'text') {
          update(s => ({
            ...s,
            textAnnotations: s.textAnnotations.filter(text => text.id !== element.elementId)
          }));
        }
      });
      
      // Also delete selected text annotations directly
      const selectedTexts = state.textAnnotations.filter(t => t.selected);
      if (selectedTexts.length > 0) {
        update(s => ({
          ...s,
          textAnnotations: s.textAnnotations.filter(text => !text.selected)
        }));
      }
      
      // Clear selections after deleting
      canvasStore.clearAllSelections();
      redrawCanvas();
    },

    duplicateSelectedElements: () => {
      const state = get(canvasStore);
      
      state.selectedElements.forEach(element => {
        if (element.type === 'shape') {
          const shape = state.completedShapes.find(s => s.id === element.elementId);
          if (shape) {
            const duplicatedShape: DrawnShape = {
              ...shape,
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              startX: shape.startX + 20,
              startY: shape.startY + 20,
              endX: shape.endX + 20,
              endY: shape.endY + 20
            };
            
            update(s => ({
              ...s,
              completedShapes: [...s.completedShapes, duplicatedShape]
            }));
          }
        } else if (element.type === 'vectorPath') {
          const path = state.completedVectorPaths.find(p => p.id === element.elementId);
          if (path) {
            const duplicatedPath: VectorPath = {
              ...path,
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              points: path.points.map(point => ({
                ...point,
                id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                x: point.x + 20,
                y: point.y + 20
              }))
            };
            
            update(s => ({
              ...s,
              completedVectorPaths: [...s.completedVectorPaths, duplicatedPath]
            }));
          }
        } else if (element.type === 'logo') {
          const logo = state.logos.find(l => l.id.toString() === element.elementId);
          if (logo) {
            const duplicatedLogo: Logo = {
              ...logo,
              id: Date.now() + Math.random(),
              x: logo.x + 20,
              y: logo.y + 20,
              hasBackground: logo.hasBackground ?? false,
              backgroundColor: logo.backgroundColor ?? '#ffffff',
              backgroundPadding: logo.backgroundPadding ?? 10,
              backgroundRadius: logo.backgroundRadius ?? 8
            };
            
            update(s => ({
              ...s,
              logos: [...s.logos, duplicatedLogo]
            }));
          }
        } else if (element.type === 'text') {
          const text = state.textAnnotations.find(t => t.id === element.elementId);
          if (text) {
            const duplicatedText: TextAnnotation = {
              ...text,
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
              x: text.x + 20,
              y: text.y + 20,
              selected: false
            };
            
            update(s => ({
              ...s,
              textAnnotations: [...s.textAnnotations, duplicatedText]
            }));
          }
        }
      });

      // Also duplicate selected text annotations directly
      const selectedTexts = state.textAnnotations.filter(t => t.selected);
      selectedTexts.forEach(text => {
        const duplicatedText: TextAnnotation = {
          ...text,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          x: text.x + 20,
          y: text.y + 20,
          selected: false
        };
        
        update(s => ({
          ...s,
          textAnnotations: [...s.textAnnotations, duplicatedText]
        }));
      });
      
      redrawCanvas();
    },
    
    // Layer management
    createLayer: (id: string, name: string) => {
      const layer = createLayer(id, name);
      update(state => ({
        ...state,
        layers: [...state.layers, layer]
      }));
    },
    
    toggleLayerVisibility: (layerId: string) => {
      update(state => ({
        ...state,
        layers: state.layers.map(layer =>
          layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
        )
      }));
      redrawCanvas();
    },
    
    deleteLayer: (layerId: string) => {
      update(state => ({
        ...state,
        layers: state.layers.filter(layer => layer.id !== layerId),
        activeLayerId: state.activeLayerId === layerId ? 
          state.layers.find(l => l.id !== layerId)?.id || '' : 
          state.activeLayerId
      }));
      redrawCanvas();
    },
    
    setActiveLayer: (layerId: string) => {
      update(state => ({ ...state, activeLayerId: layerId }));
    },
    
    // Logo management
    addLogo: (logo: Omit<Logo, 'id'>) => {
      const newLogo: Logo = {
        ...logo,
        id: Date.now(),
        image: null,
        hasBackground: logo.hasBackground ?? false,
        backgroundColor: logo.backgroundColor ?? '#ffffff',
        backgroundPadding: logo.backgroundPadding ?? 10,
        backgroundRadius: logo.backgroundRadius ?? 8
      };
      
      // Load the logo image
      if (logo.src) {
        const img = new Image();
        img.onload = () => {
          newLogo.image = img;
          update(state => ({
            ...state,
            logos: [...state.logos, newLogo]
          }));
          redrawCanvas();
        };
        img.src = logo.src;
      } else {
        update(state => ({
          ...state,
          logos: [...state.logos, newLogo]
        }));
      }
    },
    
    updateLogo: (id: number, updates: Partial<Logo>) => {
      update(state => ({
        ...state,
        logos: state.logos.map(logo => 
          logo.id === id ? { ...logo, ...updates } : logo
        )
      }));
      redrawCanvas();
    },
    
    removeLogo: (id: number) => {
      update(state => ({
        ...state,
        logos: state.logos.filter(logo => logo.id !== id)
      }));
      redrawCanvas();
    },
    
    getLogos: () => {
      const state = get(canvasStore);
      return state.logos;
    },

    // Arrow management
    addArrow: (arrowData: Omit<Arrow, 'id'>) => {
      update(state => {
        const newArrow: Arrow = {
          ...arrowData,
          id: Date.now() + Math.random()
        };
        return {
          ...state,
          arrows: [...state.arrows, newArrow]
        };
      });
      redrawCanvas();
    },

    updateArrow: (arrowId: number, updates: Partial<Arrow>) => {
      update(state => ({
        ...state,
        arrows: state.arrows.map(arrow => 
          arrow.id === arrowId ? { ...arrow, ...updates } : arrow
        )
      }));
      redrawCanvas();
    },

    removeArrow: (arrowId: number) => {
      update(state => ({
        ...state,
        arrows: state.arrows.filter(arrow => arrow.id !== arrowId)
      }));
      redrawCanvas();
    },

    // Expose redraw function
    redrawCanvas: () => {
      redrawCanvas();
    },

    // Selection management
    setSelectedElements: (elements: SelectedElement[]) => {
      update(state => ({
        ...state,
        selectedElements: elements
      }));
      redrawCanvas();
    },

    // Arrow preview for creation
    // Arrow hit detection
    findArrowAt: (x: number, y: number): Arrow | null => {
      const state = get(canvasStore);
      const tolerance = 25; // Increased tolerance even more
      
      console.log('Checking arrow hit at:', x, y, 'Total arrows:', state.arrows.length);
      
      for (const arrow of state.arrows) {
        if (!arrow.visible) continue;
        
        console.log('Checking arrow:', arrow.id, 'from', arrow.startX, arrow.startY, 'to', arrow.endX, arrow.endY);
        
        // Check if point is near the arrow line
        const distance = pointToLineDistance(x, y, arrow.startX, arrow.startY, arrow.endX, arrow.endY);
        console.log('Distance to arrow', arrow.id, ':', distance);
        
        if (distance <= tolerance) {
          console.log('Arrow hit!', arrow.id);
          // Flash the arrow to show it was detected
          canvasStore.updateArrow(arrow.id, { color: '#00ff00' });
          setTimeout(() => {
            canvasStore.updateArrow(arrow.id, { color: '#ff0000' });
          }, 200);
          return arrow;
        }
        
        // Also check if we're near the start or end points
        const startDistance = Math.sqrt(Math.pow(x - arrow.startX, 2) + Math.pow(y - arrow.startY, 2));
        const endDistance = Math.sqrt(Math.pow(x - arrow.endX, 2) + Math.pow(y - arrow.endY, 2));
        
        if (startDistance <= tolerance || endDistance <= tolerance) {
          console.log('Arrow endpoint hit!', arrow.id);
          // Flash the arrow to show it was detected
          canvasStore.updateArrow(arrow.id, { color: '#00ff00' });
          setTimeout(() => {
            canvasStore.updateArrow(arrow.id, { color: '#ff0000' });
          }, 200);
          return arrow;
        }
      }
      
      console.log('No arrow hit');
      return null;
    },

    drawArrowPreview: (startX: number, startY: number, endX: number, endY: number) => {
      if (!mainContext) return;
      
      mainContext.save();
      mainContext.strokeStyle = '#007ACC';
      mainContext.fillStyle = '#007ACC';
      mainContext.lineWidth = 2;
      mainContext.lineCap = 'round';
      mainContext.lineJoin = 'round';
      mainContext.setLineDash([5, 5]);
      
      // Draw preview line
      mainContext.beginPath();
      mainContext.moveTo(startX, startY);
      mainContext.lineTo(endX, endY);
      mainContext.stroke();
      
      // Draw preview arrowhead
      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const angle = Math.atan2(deltaY, deltaX);
      const headLength = 12;
      
      const headAngle1 = angle - Math.PI / 6;
      const headAngle2 = angle + Math.PI / 6;
      
      const head1X = endX - headLength * Math.cos(headAngle1);
      const head1Y = endY - headLength * Math.sin(headAngle1);
      const head2X = endX - headLength * Math.cos(headAngle2);
      const head2Y = endY - headLength * Math.sin(headAngle2);
      
      mainContext.setLineDash([]);
      mainContext.beginPath();
      mainContext.moveTo(endX, endY);
      mainContext.lineTo(head1X, head1Y);
      mainContext.lineTo(head2X, head2Y);
      mainContext.closePath();
      mainContext.fill();
      
      mainContext.restore();
    },

    // Expose resize handle functions for Canvas component
    findResizeHandleAt: (x: number, y: number) => findResizeHandleAt(x, y),
    
    startResize: (handle: ResizeHandle, startX: number, startY: number) => {
      update(state => ({
        ...state,
        resizeHandle: handle,
        isResizing: true,
        startX,
        startY
      }));
    },
    
    stopResize: () => {
      update(state => ({
        ...state,
        resizeHandle: null,
        isResizing: false
      }));
    },
    
    performResize: (currentX: number, currentY: number) => {
      handleResize(currentX, currentY);
    },

    // Vector path management
    updateVectorPath: (id: string, updates: Partial<VectorPath>) => {
      update(state => ({
        ...state,
        completedVectorPaths: state.completedVectorPaths.map(path => 
          path.id === id ? { ...path, ...updates } : path
        )
      }));
      redrawCanvas();
    },

    updateSelectedVectorPath: (updates: Partial<VectorPath>) => {
      const state = get(canvasStore);
      if (state.selectedVectorPathId) {
        canvasStore.updateVectorPath(state.selectedVectorPathId, updates);
      }
    },
    
    // History management
    undo: () => {
      const state = get(canvasStore);
      if (state.historyStep > 0) {
        update(s => ({ ...s, historyStep: s.historyStep - 1 }));
        restoreCanvasState(state.historyStep - 1);
      }
    },
    
    redo: () => {
      const state = get(canvasStore);
      if (state.historyStep < state.history.length - 1) {
        update(s => ({ ...s, historyStep: s.historyStep + 1 }));
        restoreCanvasState(state.historyStep + 1);
      }
    },
    
    // Canvas operations
    clear: () => {
      if (!mainContext || !mainCanvas) return;
      
      // Clear all drawn elements
      update(state => ({
        ...state,
        completedShapes: [],
        completedVectorPaths: [],
        selectedShapeId: null,
        selectedVectorPathId: null,
        measurements: [],
        textAnnotations: []
      }));
      
      mainContext.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
      mainContext.fillStyle = '#ffffff';
      mainContext.fillRect(0, 0, mainCanvas.width, mainCanvas.height);
      
      // Redraw background image if exists
      drawBackgroundImage();
      saveState();
    },
    
    // Export functionality
    exportCanvas: (format: 'png' | 'jpg' = 'png', quality: number = 1): string => {
      if (!mainCanvas) return '';
      
      // Create a temporary canvas for export
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = mainCanvas.width;
      exportCanvas.height = mainCanvas.height;
      const exportCtx = exportCanvas.getContext('2d');
      
      if (!exportCtx) return '';
      
      const state = get(canvasStore);
      
      // Draw layers in order based on visibility (same as redrawCanvas)
      const backgroundLayer = state.layers.find(l => l.id === 'background');
      const propertyLinesLayer = state.layers.find(l => l.id === 'property-lines');
      const annotationsLayer = state.layers.find(l => l.id === 'annotations');
      
      // 1. Background layer - main image
      if (backgroundLayer?.visible && state.backgroundImage) {
        exportCtx.drawImage(state.backgroundImage, 0, 0);
      }
      
      // 2. Property Lines layer - shapes, vector paths, measurements, and text
      if (propertyLinesLayer?.visible) {
        // Copy the main canvas content (which has all the drawing tools content)
        exportCtx.drawImage(mainCanvas, 0, 0);
      }

      // 3. Annotations layer - logos from the right panel
      if (annotationsLayer?.visible) {
        state.logos.filter(logo => logo.visible && logo.image).forEach(logo => {
          if (!logo.image) return;
          
          exportCtx.save();
          exportCtx.globalAlpha = logo.opacity / 100;
          
          const scaledWidth = logo.image.width * (logo.scale / 100);
          const scaledHeight = logo.image.height * (logo.scale / 100);
          
          exportCtx.translate(logo.x + scaledWidth / 2, logo.y + scaledHeight / 2);
          exportCtx.rotate((logo.rotation * Math.PI) / 180);
          exportCtx.drawImage(
            logo.image,
            -scaledWidth / 2,
            -scaledHeight / 2,
            scaledWidth,
            scaledHeight
          );
          exportCtx.restore();
        });
      }
      
      return exportCanvas.toDataURL(`image/${format}`, quality);
    },
    
    // Save/Load project
    saveProject: () => {
      const state = get(canvasStore);
      const projectData = {
        canvasState: state,
        timestamp: Date.now()
      };
      
      if (browser) {
        localStorage.setItem('realtycanvas-project', JSON.stringify(projectData));
      }
    },
    
    loadProject: () => {
      if (!browser) return;
      
      const saved = localStorage.getItem('realtycanvas-project');
      if (saved) {
        try {
          const projectData = JSON.parse(saved);
          // Restore state logic here
          console.log('Project loaded:', projectData);
        } catch (error) {
          console.error('Failed to load project:', error);
        }
      }
    },
    
    // Memory monitoring
    updateMemoryUsage: () => {
      if (!mainCanvas) return;
      
      const pixels = mainCanvas.width * mainCanvas.height;
      const bytesPerPixel = 4; // RGBA
      const canvasMemory = pixels * bytesPerPixel;
      const state = get(canvasStore);
      const logoMemory = state.logos.reduce((total, logo) => {
        if (logo.image) {
          return total + (logo.image.width * logo.image.height * 4);
        }
        return total;
      }, 0);
      
      const totalMemory = canvasMemory + logoMemory;
      
      update(state => ({
        ...state,
        memoryUsage: Math.round(totalMemory / (1024 * 1024) * 10) / 10 // MB
      }));
    },

    // Measurement functionality
    setPixelsPerFoot: (pixels: number) => {
      update(state => ({ ...state, pixelsPerFoot: pixels }));
    },

    setMeasurementUnit: (unit: 'feet' | 'meters' | 'yards') => {
      update(state => ({ ...state, measurementUnit: unit }));
    },

    toggleMeasurements: () => {
      update(state => ({ ...state, showMeasurements: !state.showMeasurements }));
      redrawCanvas();
    },

    addMeasurement: (measurement: Omit<Measurement, 'id'>) => {
      const newMeasurement: Measurement = {
        ...measurement,
        id: Date.now().toString()
      };

      update(state => ({
        ...state,
        measurements: [...state.measurements, newMeasurement]
      }));
      
      redrawCanvas();
    },

    updateMeasurement: (id: string, updates: Partial<Measurement>) => {
      update(state => ({
        ...state,
        measurements: state.measurements.map(m => 
          m.id === id ? { ...m, ...updates } : m
        )
      }));
      
      redrawCanvas();
    },

    removeMeasurement: (id: string) => {
      update(state => ({
        ...state,
        measurements: state.measurements.filter(m => m.id !== id)
      }));
      
      redrawCanvas();
    },

    getMeasurements: () => {
      const state = get(canvasStore);
      return state.measurements;
    },

    calculateDistance: (x1: number, y1: number, x2: number, y2: number): { pixels: number, realWorld: number, unit: string } => {
      const state = get(canvasStore);
      const pixelDistance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
      
      let realWorldDistance = pixelDistance / state.pixelsPerFoot;
      let unit = state.measurementUnit;
      
      // Convert to appropriate unit
      switch (state.measurementUnit) {
        case 'meters':
          realWorldDistance = realWorldDistance * 0.3048; // feet to meters
          break;
        case 'yards':
          realWorldDistance = realWorldDistance / 3; // feet to yards
          break;
      }
      
      return {
        pixels: pixelDistance,
        realWorld: Math.round(realWorldDistance * 100) / 100,
        unit
      };
    },

    calculateArea: (points: { x: number; y: number }[]): { pixels: number, realWorld: number, unit: string } => {
      const state = get(canvasStore);
      
      if (points.length < 3) return { pixels: 0, realWorld: 0, unit: state.measurementUnit };
      
      // Shoelace formula for polygon area
      let pixelArea = 0;
      for (let i = 0; i < points.length; i++) {
        const j = (i + 1) % points.length;
        pixelArea += points[i].x * points[j].y;
        pixelArea -= points[j].x * points[i].y;
      }
      pixelArea = Math.abs(pixelArea) / 2;
      
      // Convert to real world area
      const pixelsPerFootSquared = state.pixelsPerFoot * state.pixelsPerFoot;
      let realWorldArea = pixelArea / pixelsPerFootSquared;
      let unit = `sq ${state.measurementUnit}`;
      
      // Convert to appropriate unit
      switch (state.measurementUnit) {
        case 'meters':
          realWorldArea = realWorldArea * 0.092903; // sq ft to sq meters
          break;
        case 'yards':
          realWorldArea = realWorldArea / 9; // sq ft to sq yards
          break;
      }
      
      // Convert to acres if area is large (for feet)
      if (state.measurementUnit === 'feet' && realWorldArea > 4000) {
        realWorldArea = realWorldArea / 43560; // sq ft to acres
        unit = 'acres';
      }
      
      return {
        pixels: pixelArea,
        realWorld: Math.round(realWorldArea * 100) / 100,
        unit
      };
    },

    // Text annotation functionality
    setFontSize: (size: number) => {
      update(state => ({ ...state, fontSize: size }));
    },

    setFontFamily: (family: string) => {
      update(state => ({ ...state, fontFamily: family }));
    },

    setTextColor: (color: string) => {
      update(state => ({ ...state, textColor: color }));
    },

    setTextBackground: (enabled: boolean) => {
      update(state => ({ ...state, textBackground: enabled }));
    },

    setTextBackgroundColor: (color: string) => {
      update(state => ({ ...state, textBackgroundColor: color }));
    },

    addTextAnnotation: (annotation: Omit<TextAnnotation, 'id'>) => {
      const newAnnotation: TextAnnotation = {
        ...annotation,
        id: Date.now().toString()
      };

      update(state => ({
        ...state,
        textAnnotations: [...state.textAnnotations, newAnnotation]
      }));
      
      redrawCanvas();
    },

    updateTextAnnotation: (id: string, updates: Partial<TextAnnotation>) => {
      update(state => ({
        ...state,
        textAnnotations: state.textAnnotations.map(t => 
          t.id === id ? { ...t, ...updates } : t
        )
      }));
      
      redrawCanvas();
    },

    removeTextAnnotation: (id: string) => {
      update(state => ({
        ...state,
        textAnnotations: state.textAnnotations.filter(t => t.id !== id)
      }));
      
      redrawCanvas();
    },

    getTextAnnotations: () => {
      const state = get(canvasStore);
      return state.textAnnotations;
    },

    // Property-specific text templates
    addPropertyTemplate: (type: 'squareFootage' | 'propertyLine' | 'feature', x: number, y: number, value?: string) => {
      const templates = {
        squareFootage: { text: value || '1,200 sq ft', fontSize: 14, color: '#0066cc' },
        propertyLine: { text: value || 'Property Line', fontSize: 12, color: '#cc0000' },
        feature: { text: value || 'Feature', fontSize: 13, color: '#009900' }
      };

      const template = templates[type];
      const annotation: Omit<TextAnnotation, 'id'> = {
        text: template.text,
        x,
        y,
        fontSize: template.fontSize,
        fontFamily: 'Inter',
        color: template.color,
        hasBackground: true,
        backgroundColor: '#ffffff',
        visible: true,
        rotation: 0
      };

      canvasStore.addTextAnnotation(annotation);
    },

    startTextInput: (x: number, y: number) => {
      update(state => ({
        ...state,
        textInput: {
          isActive: true,
          x,
          y,
          text: ''
        }
      }));
    },

    updateTextInput: (text: string) => {
      update(state => ({
        ...state,
        textInput: state.textInput ? {
          ...state.textInput,
          text
        } : null
      }));
    },

    finishTextInput: () => {
      const state = get(canvasStore);
      if (state.textInput && state.textInput.text.trim()) {
        const textMetrics = mainContext?.measureText(state.textInput.text);
        const textWidth = textMetrics?.width || 100;
        const textHeight = state.fontSize;

        const newAnnotation: TextAnnotation = {
          id: Date.now().toString(),
          text: state.textInput.text,
          x: state.textInput.x,
          y: state.textInput.y,
          width: textWidth + 8,
          height: textHeight + 6,
          fontSize: state.fontSize,
          fontFamily: state.fontFamily,
          color: state.textColor,
          backgroundColor: state.textBackgroundColor,
          hasBackground: state.textBackground,
          visible: true,
          rotation: 0,
          selected: false
        };

        update(s => ({
          ...s,
          textAnnotations: [...s.textAnnotations, newAnnotation],
          textInput: null
        }));

        // Auto-select the newly created text
        canvasStore.selectElement('text', newAnnotation.id);
      } else {
        update(state => ({ ...state, textInput: null }));
      }
      redrawCanvas();
    },

    cancelTextInput: () => {
      update(state => ({ ...state, textInput: null }));
      redrawCanvas();
    },

    // Add text selection methods
    selectTextAnnotation: (id: string) => {
      update(state => ({
        ...state,
        textAnnotations: state.textAnnotations.map(t => ({
          ...t,
          selected: t.id === id
        }))
      }));
      canvasStore.selectElement('text', id);
      redrawCanvas();
    },

    updateSelectedTextAnnotation: (updates: Partial<TextAnnotation>) => {
      const state = get(canvasStore);
      const selectedText = state.textAnnotations.find(t => t.selected);
      if (selectedText) {
        canvasStore.updateTextAnnotation(selectedText.id, updates);
      }
    },

    startEditingText: (id: string) => {
      const state = get(canvasStore);
      const textAnnotation = state.textAnnotations.find(t => t.id === id);
      if (textAnnotation) {
        update(s => ({
          ...s,
          textInput: {
            isActive: true,
            x: textAnnotation.x,
            y: textAnnotation.y,
            text: textAnnotation.text
          }
        }));
        // Remove the old annotation temporarily while editing
        canvasStore.removeTextAnnotation(id);
      }
    }
  };
  
  // Helper functions
  function createLayer(id: string, name: string): Layer {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const context = canvas.getContext('2d')!;
    
    return {
      id,
      name,
      visible: true,
      opacity: 100,
      canvas,
      context
    };
  }
  
  function saveState() {
    if (!mainContext || !mainCanvas) return;
    
    const imageData = mainContext.getImageData(0, 0, mainCanvas.width, mainCanvas.height);
    
    update(state => {
      const newHistory = state.history.slice(0, state.historyStep + 1);
      newHistory.push(imageData);
      
      // Limit history to prevent memory issues
      if (newHistory.length > 50) {
        newHistory.shift();
      }
      
      return {
        ...state,
        history: newHistory,
        historyStep: newHistory.length - 1
      };
    });
  }
  
  function restoreCanvasState(step: number) {
    const state = get(canvasStore);
    if (!mainContext || !mainCanvas || !state.history[step]) return;
    
    mainContext.putImageData(state.history[step], 0, 0);
  }
  
  function drawBackgroundImage() {
    const state = get(canvasStore);
    if (!state.backgroundImage || !mainContext || !mainCanvas) return;
    
    mainContext.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
    mainContext.fillStyle = '#ffffff';
    mainContext.fillRect(0, 0, mainCanvas.width, mainCanvas.height);
    
    // Draw image at original resolution (1:1 pixel mapping)
    mainContext.drawImage(
      state.backgroundImage,
      0, 0,
      state.backgroundImage.width,
      state.backgroundImage.height
    );
  }
  
  function redrawCanvas() {
    if (!mainContext || !mainCanvas) return;
    
    // Clear canvas
    mainContext.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
    
    const state = get(canvasStore);
    
    // Draw layers in order based on visibility
    const backgroundLayer = state.layers.find(l => l.id === 'background');
    const propertyLinesLayer = state.layers.find(l => l.id === 'property-lines');
    const annotationsLayer = state.layers.find(l => l.id === 'annotations');
    
    // 1. Background layer - main image
    if (backgroundLayer?.visible && state.backgroundImage) {
      mainContext.drawImage(state.backgroundImage, 0, 0);
    }
    
    // 2. Property Lines layer - shapes, vector paths, measurements, and text from drawing tools
    if (propertyLinesLayer?.visible) {
      // Draw completed shapes (rectangles, circles)
      state.completedShapes.forEach(shape => {
        drawCompletedShape(shape);
      });

      // Draw vector paths (pen tool drawings)
      drawAllVectorPaths();
      
      // Draw measurements (ruler and area tools)
      if (state.showMeasurements) {
        drawMeasurements();
      }
      
      // Draw text annotations from drawing tools (not logos)
      state.textAnnotations.forEach(annotation => {
        if (annotation.visible) {
          drawSingleTextAnnotation(annotation);
        }
      });
    }

    // 3. Annotations layer - logos and arrows from the right panel
    if (annotationsLayer?.visible) {
      drawAllLogos();
      drawAllArrows();
    }

    // Always draw selection indicators on top
    drawAllSelections();
  }

  function drawMeasurements() {
    if (!mainContext) return;
    
    const state = get(canvasStore);
    
    state.measurements.forEach(measurement => {
      if (!measurement.visible || !mainContext) return;
      
      mainContext.save();
      mainContext.strokeStyle = measurement.color;
      mainContext.fillStyle = measurement.color;
      mainContext.lineWidth = 2;
      mainContext.font = '12px Inter, sans-serif';
      
      if (measurement.type === 'distance' && measurement.points.length >= 2) {
        // Draw distance line
        const start = measurement.points[0];
        const end = measurement.points[1];
        
        mainContext.beginPath();
        mainContext.moveTo(start.x, start.y);
        mainContext.lineTo(end.x, end.y);
        mainContext.stroke();
        
        // Draw endpoints
        mainContext.beginPath();
        mainContext.arc(start.x, start.y, 4, 0, 2 * Math.PI);
        mainContext.fill();
        
        mainContext.beginPath();
        mainContext.arc(end.x, end.y, 4, 0, 2 * Math.PI);
        mainContext.fill();
        
        // Draw label
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;
        
        if (mainContext) {
          mainContext.fillStyle = 'white';
          mainContext.fillRect(midX - 30, midY - 12, 60, 20);
          mainContext.fillStyle = measurement.color;
          mainContext.fillText(measurement.label, midX - 25, midY + 2);
        }
        
      } else if (measurement.type === 'area' && measurement.points.length >= 3) {
        // Draw area polygon
        mainContext.beginPath();
        mainContext.moveTo(measurement.points[0].x, measurement.points[0].y);
        
        measurement.points.forEach((point, index) => {
          if (index > 0) {
            mainContext.lineTo(point.x, point.y);
          }
        });
        
        mainContext.closePath();
        mainContext.stroke();
        
        // Fill with semi-transparent color
        mainContext.fillStyle = hexToRgba(measurement.color, 0.1);
        mainContext.fill();
        
        // Draw vertices
        measurement.points.forEach(point => {
          if (!mainContext) return;
          mainContext.beginPath();
          mainContext.arc(point.x, point.y, 4, 0, 2 * Math.PI);
          mainContext.fillStyle = measurement.color;
          mainContext.fill();
        });
        
        // Draw label at centroid
        const centroid = calculateCentroid(measurement.points);
        if (mainContext) {
          mainContext.fillStyle = 'white';
          mainContext.fillRect(centroid.x - 35, centroid.y - 12, 70, 20);
          mainContext.fillStyle = measurement.color;
          mainContext.fillText(measurement.label, centroid.x - 30, centroid.y + 2);
        }
      }
      
      mainContext.restore();
    });
  }

  function calculateCentroid(points: { x: number; y: number }[]): { x: number; y: number } {
    let x = 0, y = 0;
    points.forEach(point => {
      x += point.x;
      y += point.y;
    });
    return { x: x / points.length, y: y / points.length };
  }

  function drawSingleTextAnnotation(annotation: TextAnnotation) {
    if (!mainContext || !annotation.visible) return;
    
    mainContext.save();
    
    // Set font
    mainContext.font = `${annotation.fontSize}px ${annotation.fontFamily}`;
    mainContext.fillStyle = annotation.color;
    mainContext.textAlign = 'left';
    mainContext.textBaseline = 'top';
    
    // Calculate text dimensions
    const textMetrics = mainContext.measureText(annotation.text);
    const textWidth = textMetrics.width;
    const textHeight = annotation.fontSize;
    
    // Update annotation dimensions if they've changed
    if (annotation.width !== textWidth + 8 || annotation.height !== textHeight + 6) {
      canvasStore.updateTextAnnotation(annotation.id, {
        width: textWidth + 8,
        height: textHeight + 6
      });
    }
    
    // Calculate center point for rotation
    const centerX = annotation.x + textWidth / 2;
    const centerY = annotation.y + textHeight / 2;
    
    // Apply rotation if needed
    if (annotation.rotation !== 0) {
      mainContext.translate(centerX, centerY);
      mainContext.rotate((annotation.rotation * Math.PI) / 180);
      mainContext.translate(-centerX, -centerY);
    }
    
    // Draw background if enabled
    if (annotation.hasBackground && annotation.backgroundColor) {
      mainContext.fillStyle = annotation.backgroundColor;
      mainContext.fillRect(
        annotation.x - 4,
        annotation.y - 2,
        textWidth + 8,
        textHeight + 6
      );
      
      // Draw border
      mainContext.strokeStyle = annotation.color;
      mainContext.lineWidth = 1;
      mainContext.strokeRect(
        annotation.x - 4,
        annotation.y - 2,
        textWidth + 8,
        textHeight + 6
      );
    }
    
    // Draw text
    mainContext.fillStyle = annotation.color;
    mainContext.fillText(annotation.text, annotation.x, annotation.y);
    
    mainContext.restore();
  }

  function drawTextAnnotations() {
    if (!mainContext) return;
    
    const state = get(canvasStore);
    
    state.textAnnotations.forEach(annotation => {
      drawSingleTextAnnotation(annotation);
    });
  }

  function drawCompletedShape(shape: DrawnShape) {
    if (!mainContext) return;
    
    mainContext.save();
    mainContext.strokeStyle = hexToRgba(shape.color, shape.opacity / 100);
    mainContext.lineWidth = shape.brushSize;
    
    switch (shape.type) {
      case 'square':
        const width = shape.endX - shape.startX;
        const height = shape.endY - shape.startY;
        mainContext.strokeRect(shape.startX, shape.startY, width, height);
        break;
        
      case 'circle':
        const radius = Math.sqrt(Math.pow(shape.endX - shape.startX, 2) + Math.pow(shape.endY - shape.startY, 2));
        mainContext.beginPath();
        mainContext.arc(shape.startX, shape.startY, radius, 0, 2 * Math.PI);
        mainContext.stroke();
        break;
    }
    mainContext.restore();
  }

  function findShapeAt(x: number, y: number): DrawnShape | null {
    const state = get(canvasStore);
    
    // Check shapes in reverse order (top to bottom)
    for (let i = state.completedShapes.length - 1; i >= 0; i--) {
      const shape = state.completedShapes[i];
      
      if (shape.type === 'square') {
        const minX = Math.min(shape.startX, shape.endX);
        const maxX = Math.max(shape.startX, shape.endX);
        const minY = Math.min(shape.startY, shape.endY);
        const maxY = Math.max(shape.startY, shape.endY);
        
        if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
          return shape;
        }
      } else if (shape.type === 'circle') {
        const radius = Math.sqrt(Math.pow(shape.endX - shape.startX, 2) + Math.pow(shape.endY - shape.startY, 2));
        const distance = Math.sqrt(Math.pow(x - shape.startX, 2) + Math.pow(y - shape.startY, 2));
        
        if (distance <= radius) {
          return shape;
        }
      }
    }
    
    return null;
  }

  function findVectorPathAt(x: number, y: number): VectorPath | null {
    const state = get(canvasStore);
    
    // Check vector paths in reverse order (top to bottom)
    for (let i = state.completedVectorPaths.length - 1; i >= 0; i--) {
      const path = state.completedVectorPaths[i];
      
      // Check if point is near any line segment of the path
      for (let j = 0; j < path.points.length - 1; j++) {
        const p1 = path.points[j];
        const p2 = path.points[j + 1];
        
        const distance = pointToLineDistance(x, y, p1.x, p1.y, p2.x, p2.y);
        if (distance <= path.strokeWidth + 5) { // 5px tolerance
          return path;
        }
      }
      
      // If it's a closed path, check the closing line
      if (path.closed && path.points.length > 2) {
        const p1 = path.points[path.points.length - 1];
        const p2 = path.points[0];
        
        const distance = pointToLineDistance(x, y, p1.x, p1.y, p2.x, p2.y);
        if (distance <= path.strokeWidth + 5) {
          return path;
        }
      }
    }
    
    return null;
  }

  function pointToLineDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    
    if (lenSq === 0) return Math.sqrt(A * A + B * B);
    
    let param = dot / lenSq;
    
    let xx, yy;
    
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function findLogoAt(x: number, y: number): Logo | null {
    const state = get(canvasStore);
    
    // Check logos in reverse order (top to bottom)
    for (let i = state.logos.length - 1; i >= 0; i--) {
      const logo = state.logos[i];
      if (!logo.visible || !logo.image) continue;
      
      const scaledWidth = logo.image.width * (logo.scale / 100);
      const scaledHeight = logo.image.height * (logo.scale / 100);
      
      if (x >= logo.x && x <= logo.x + scaledWidth && 
          y >= logo.y && y <= logo.y + scaledHeight) {
        return logo;
      }
    }
    
    return null;
  }

  function moveShape(shapeId: string, deltaX: number, deltaY: number) {
    update(state => ({
      ...state,
      completedShapes: state.completedShapes.map(shape => 
        shape.id === shapeId 
          ? {
              ...shape,
              startX: shape.startX + deltaX,
              startY: shape.startY + deltaY,
              endX: shape.endX + deltaX,
              endY: shape.endY + deltaY
            }
          : shape
      )
    }));
    redrawCanvas();
  }

  function moveVectorPath(pathId: string, deltaX: number, deltaY: number) {
    update(state => ({
      ...state,
      completedVectorPaths: state.completedVectorPaths.map(path => 
        path.id === pathId 
          ? {
              ...path,
              points: path.points.map(point => ({
                ...point,
                x: point.x + deltaX,
                y: point.y + deltaY
              }))
            }
          : path
      )
    }));
    redrawCanvas();
  }

  function drawShapeSelection(shapeId: string) {
    if (!mainContext) return;
    
    const state = get(canvasStore);
    const shape = state.completedShapes.find(s => s.id === shapeId);
    if (!shape) return;
    
    mainContext.save();
    mainContext.strokeStyle = '#0066ff';
    mainContext.lineWidth = 2;
    mainContext.setLineDash([5, 5]);
    
    if (shape.type === 'square') {
      const width = shape.endX - shape.startX;
      const height = shape.endY - shape.startY;
      mainContext.strokeRect(shape.startX - 5, shape.startY - 5, width + 10, height + 10);
    } else if (shape.type === 'circle') {
      const radius = Math.sqrt(Math.pow(shape.endX - shape.startX, 2) + Math.pow(shape.endY - shape.startY, 2));
      mainContext.beginPath();
      mainContext.arc(shape.startX, shape.startY, radius + 5, 0, 2 * Math.PI);
      mainContext.stroke();
    }
    
    mainContext.restore();
  }

  function drawVectorPathSelection(pathId: string) {
    if (!mainContext) return;
    
    const state = get(canvasStore);
    const path = state.completedVectorPaths.find(p => p.id === pathId);
    if (!path || path.points.length === 0) return;
    
    mainContext.save();
    mainContext.strokeStyle = '#0066ff';
    mainContext.lineWidth = 3;
    mainContext.setLineDash([8, 4]);
    
    // Draw the path with selection style
    mainContext.beginPath();
    mainContext.moveTo(path.points[0].x, path.points[0].y);
    
    for (let i = 1; i < path.points.length; i++) {
      mainContext.lineTo(path.points[i].x, path.points[i].y);
    }
    
    if (path.closed) {
      mainContext.closePath();
    }
    
    mainContext.stroke();
    
    // Draw selection handles on path points
    mainContext.fillStyle = '#0066ff';
    mainContext.strokeStyle = '#ffffff';
    mainContext.lineWidth = 1;
    mainContext.setLineDash([]);
    
    path.points.forEach(point => {
      mainContext.beginPath();
      mainContext.arc(point.x, point.y, 4, 0, 2 * Math.PI);
      mainContext.fill();
      mainContext.stroke();
    });
    
    mainContext.restore();
  }
  
  function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // Vector pen tool functions
  function handleVectorPenClick(x: number, y: number) {
    const state = get(canvasStore);
    
    if (!state.isCreatingPath) {
      // Start new path
      const firstPoint: PathPoint = {
        x, y, 
        id: Date.now().toString()
      };
      
      update(s => ({
        ...s,
        isCreatingPath: true,
        pathPoints: [firstPoint],
        currentVectorPath: {
          id: Date.now().toString(),
          points: [firstPoint],
          closed: false,
          stroke: state.color,
          strokeWidth: state.brushSize
        }
      }));
    } else {
      // Add point to existing path or close path
      const firstPoint = state.pathPoints[0];
      const distanceToFirst = Math.sqrt(
        Math.pow(x - firstPoint.x, 2) + Math.pow(y - firstPoint.y, 2)
      );
      
      if (distanceToFirst < 10 && state.pathPoints.length > 2) {
        // Close the path
        finishVectorPath(true);
      } else {
        // Add new point
        const newPoint: PathPoint = {
          x, y,
          id: Date.now().toString()
        };
        
        update(s => ({
          ...s,
          pathPoints: [...s.pathPoints, newPoint],
          currentVectorPath: s.currentVectorPath ? {
            ...s.currentVectorPath,
            points: [...s.currentVectorPath.points, newPoint]
          } : null
        }));
      }
    }
    
    redrawCanvas();
    drawCurrentVectorPath();
  }
  
  function handleVectorPenPreview(x: number, y: number) {
    const state = get(canvasStore);
    
    if (state.isCreatingPath && state.pathPoints.length > 0) {
      const lastPoint = state.pathPoints[state.pathPoints.length - 1];
      update(s => ({
        ...s,
        pathPreview: {
          startPoint: lastPoint,
          currentPoint: { x, y }
        }
      }));
      
      redrawCanvas();
      drawCurrentVectorPath();
      drawPreviewLine();
    } else if (state.activeTool === 'pen' && !state.isCreatingPath) {
      // Show preview for starting a new path - just a dot where you'll start
      redrawCanvas();
      drawStartPreview(x, y);
    }
  }
  
  function finishVectorPath(closed: boolean = false) {
    const state = get(canvasStore);
    
    if (state.currentVectorPath && state.pathPoints.length > 1) {
      const completedPath: VectorPath = {
        ...state.currentVectorPath,
        closed,
        points: [...state.pathPoints]
      };
      
      update(s => ({
        ...s,
        isCreatingPath: false,
        pathPoints: [],
        currentVectorPath: null,
        pathPreview: null,
        completedVectorPaths: [...s.completedVectorPaths, completedPath]
      }));
      
      redrawCanvas();
      drawAllVectorPaths();
      saveState(); // Save to make paths persistent
    }
  }
  
  function drawCurrentVectorPath() {
    const state = get(canvasStore);
    if (!mainContext || !state.currentVectorPath) return;
    
    const points = state.currentVectorPath.points;
    if (points.length < 1) return;
    
    mainContext.save();
    mainContext.strokeStyle = state.currentVectorPath.stroke;
    mainContext.lineWidth = state.currentVectorPath.strokeWidth;
    mainContext.lineCap = 'round';
    mainContext.lineJoin = 'round';
    
    // Draw path
    mainContext.beginPath();
    mainContext.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
      mainContext.lineTo(points[i].x, points[i].y);
    }
    
    mainContext.stroke();
    
    // Draw anchor points
    mainContext.fillStyle = '#ffffff';
    mainContext.strokeStyle = '#000000';
    mainContext.lineWidth = 1;
    
    points.forEach(point => {
      mainContext.beginPath();
      mainContext.arc(point.x, point.y, 4, 0, 2 * Math.PI);
      mainContext.fill();
      mainContext.stroke();
    });
    
    // Highlight first point for closing
    if (points.length > 2) {
      mainContext.fillStyle = '#00ff00';
      mainContext.beginPath();
      mainContext.arc(points[0].x, points[0].y, 6, 0, 2 * Math.PI);
      mainContext.fill();
    }
    
    mainContext.restore();
  }
  
  function drawPreviewLine() {
    const state = get(canvasStore);
    if (!mainContext || !state.pathPreview) return;
    
    mainContext.save();
    
    // Enhanced preview line with better styling
    mainContext.strokeStyle = state.color;
    mainContext.lineWidth = Math.max(1, state.brushSize * 0.7); // Slightly thinner than actual stroke
    mainContext.globalAlpha = 0.8; // Semi-transparent
    mainContext.setLineDash([6, 4]); // Dotted line pattern
    mainContext.lineCap = 'round';
    
    mainContext.beginPath();
    mainContext.moveTo(state.pathPreview.startPoint.x, state.pathPreview.startPoint.y);
    mainContext.lineTo(state.pathPreview.currentPoint.x, state.pathPreview.currentPoint.y);
    mainContext.stroke();
    
    // Draw a small preview circle at the end point to show where you'll click
    mainContext.setLineDash([]); // Reset dash
    mainContext.fillStyle = state.color;
    mainContext.globalAlpha = 0.6;
    mainContext.beginPath();
    mainContext.arc(state.pathPreview.currentPoint.x, state.pathPreview.currentPoint.y, 3, 0, 2 * Math.PI);
    mainContext.fill();
    
    // Show distance info
    const distance = Math.sqrt(
      Math.pow(state.pathPreview.currentPoint.x - state.pathPreview.startPoint.x, 2) + 
      Math.pow(state.pathPreview.currentPoint.y - state.pathPreview.startPoint.y, 2)
    );
    
    // Draw distance label
    if (distance > 20) { // Only show if line is long enough
      const midX = (state.pathPreview.startPoint.x + state.pathPreview.currentPoint.x) / 2;
      const midY = (state.pathPreview.startPoint.y + state.pathPreview.currentPoint.y) / 2;
      
      mainContext.fillStyle = 'rgba(0, 0, 0, 0.8)';
      mainContext.font = '11px Inter, sans-serif';
      mainContext.textAlign = 'center';
      mainContext.textBaseline = 'middle';
      
      const distanceText = `${Math.round(distance)}px`;
      const textWidth = mainContext.measureText(distanceText).width;
      
      // Background for text
      mainContext.fillStyle = 'rgba(255, 255, 255, 0.9)';
      mainContext.fillRect(midX - textWidth/2 - 4, midY - 7, textWidth + 8, 14);
      
      // Text
      mainContext.fillStyle = 'rgba(0, 0, 0, 0.8)';
      mainContext.fillText(distanceText, midX, midY);
    }
    
    mainContext.restore();
  }

  function drawStartPreview(x: number, y: number) {
    if (!mainContext) return;
    
    const state = get(canvasStore);
    
    mainContext.save();
    
    // Draw a preview dot showing where the first point will be placed
    mainContext.fillStyle = state.color;
    mainContext.globalAlpha = 0.7;
    mainContext.beginPath();
    mainContext.arc(x, y, 4, 0, 2 * Math.PI);
    mainContext.fill();
    
    // Draw a ring around it
    mainContext.strokeStyle = state.color;
    mainContext.lineWidth = 1;
    mainContext.globalAlpha = 0.5;
    mainContext.beginPath();
    mainContext.arc(x, y, 8, 0, 2 * Math.PI);
    mainContext.stroke();
    
    mainContext.restore();
  }
  
  function drawAllVectorPaths() {
    const state = get(canvasStore);
    if (!mainContext) return;
    
    state.completedVectorPaths.forEach(path => {
      if (path.points.length < 2) return;
      
      mainContext.save();
      mainContext.strokeStyle = path.stroke;
      mainContext.lineWidth = path.strokeWidth;
      mainContext.lineCap = 'round';
      mainContext.lineJoin = 'round';
      
      mainContext.beginPath();
      mainContext.moveTo(path.points[0].x, path.points[0].y);
      
      for (let i = 1; i < path.points.length; i++) {
        mainContext.lineTo(path.points[i].x, path.points[i].y);
      }
      
      if (path.closed) {
        mainContext.closePath();
      }
      
      mainContext.stroke();
      
      // Fill if closed and has fill color
      if (path.closed && path.fill) {
        mainContext.fillStyle = path.fill;
        mainContext.fill();
      }
      
      mainContext.restore();
    });
  }

  function drawArrow(arrow: Arrow) {
    if (!mainContext) return;
    
    console.log('Drawing arrow:', arrow.id, 'from', arrow.startX, arrow.startY, 'to', arrow.endX, arrow.endY);
    
    mainContext.save();
    
    // Set arrow style - make it very visible for testing
    mainContext.strokeStyle = arrow.color;
    mainContext.fillStyle = arrow.color;
    mainContext.lineWidth = arrow.width;
    mainContext.lineCap = 'round';
    mainContext.lineJoin = 'round';
    
    // Draw arrow shaft
    mainContext.beginPath();
    mainContext.moveTo(arrow.startX, arrow.startY);
    mainContext.lineTo(arrow.endX, arrow.endY);
    mainContext.stroke();
    
    // Draw simple arrowhead
    const deltaX = arrow.endX - arrow.startX;
    const deltaY = arrow.endY - arrow.startY;
    const angle = Math.atan2(deltaY, deltaX);
    const headLength = 20;
    
    // Calculate arrowhead points
    const headAngle1 = angle - Math.PI / 6; // 30 degrees
    const headAngle2 = angle + Math.PI / 6;
    
    const head1X = arrow.endX - headLength * Math.cos(headAngle1);
    const head1Y = arrow.endY - headLength * Math.sin(headAngle1);
    const head2X = arrow.endX - headLength * Math.cos(headAngle2);
    const head2Y = arrow.endY - headLength * Math.sin(headAngle2);
    
    // Draw filled arrowhead
    mainContext.beginPath();
    mainContext.moveTo(arrow.endX, arrow.endY);
    mainContext.lineTo(head1X, head1Y);
    mainContext.lineTo(head2X, head2Y);
    mainContext.closePath();
    mainContext.fill();
    
    mainContext.restore();
  }

  function drawAllArrows() {
    const state = get(canvasStore);
    if (!mainContext) return;
    
    console.log('Drawing arrows:', state.arrows.length);
    
    state.arrows.forEach(arrow => {
      if (arrow.visible) {
        console.log('Drawing arrow:', arrow);
        drawArrow(arrow);
      }
    });
  }

  function drawAllLogos() {
    const state = get(canvasStore);
    if (!mainContext) return;
    
    state.logos.forEach(logo => {
      if (!logo.visible || !logo.image) return;
      
      mainContext.save();
      
      // Set opacity
      mainContext.globalAlpha = logo.opacity / 100;
      
      // Calculate scaled dimensions
      const scaledWidth = logo.image.width * (logo.scale / 100);
      const scaledHeight = logo.image.height * (logo.scale / 100);
      
      // Calculate background dimensions with padding
      const padding = logo.backgroundPadding || 0;
      const bgWidth = scaledWidth + (padding * 2);
      const bgHeight = scaledHeight + (padding * 2);
      const bgX = logo.x - padding;
      const bgY = logo.y - padding;
      
      // Apply rotation if needed
      if (logo.rotation !== 0) {
        const centerX = logo.x + scaledWidth / 2;
        const centerY = logo.y + scaledHeight / 2;
        
        mainContext.translate(centerX, centerY);
        mainContext.rotate((logo.rotation * Math.PI) / 180);
        mainContext.translate(-centerX, -centerY);
      }
      
      // Draw background if enabled
      if (logo.hasBackground) {
        mainContext.fillStyle = logo.backgroundColor || '#ffffff';
        
        // Draw rounded rectangle background
        const radius = logo.backgroundRadius || 8;
        mainContext.beginPath();
        mainContext.roundRect(bgX, bgY, bgWidth, bgHeight, radius);
        mainContext.fill();
      }
      
      // Draw the logo
      mainContext.drawImage(
        logo.image,
        logo.x,
        logo.y,
        scaledWidth,
        scaledHeight
      );
      
      mainContext.restore();
    });
  }

  function drawAllSelections() {
    const state = get(canvasStore);
    if (!mainContext || state.selectedElements.length === 0) return;
    
    state.selectedElements.forEach(element => {
      if (element.type === 'shape') {
        drawShapeSelection(element.elementId as string);
      } else if (element.type === 'vectorPath') {
        drawVectorPathSelection(element.elementId as string);
      } else if (element.type === 'logo') {
        drawLogoSelection(parseInt(element.elementId as string));
      } else if (element.type === 'arrow') {
        drawArrowSelection(parseInt(element.elementId as string));
      }
    });

    // Also draw text selections
    state.textAnnotations.forEach(text => {
      if (text.selected) {
        drawTextSelection(text.id);
      }
    });
  }

  function drawArrowSelection(arrowId: number) {
    const state = get(canvasStore);
    const arrow = state.arrows.find(a => a.id === arrowId);
    if (!arrow || !mainContext) return;
    
    mainContext.save();
    mainContext.strokeStyle = '#007ACC';
    mainContext.lineWidth = 3;
    mainContext.setLineDash([5, 5]);
    
    // Draw selection outline around arrow
    mainContext.beginPath();
    mainContext.moveTo(arrow.startX, arrow.startY);
    mainContext.lineTo(arrow.endX, arrow.endY);
    mainContext.stroke();
    
    // Draw control handles
    const handleSize = 8;
    mainContext.fillStyle = '#007ACC';
    mainContext.setLineDash([]);
    
    // Start handle
    mainContext.fillRect(arrow.startX - handleSize/2, arrow.startY - handleSize/2, handleSize, handleSize);
    // End handle
    mainContext.fillRect(arrow.endX - handleSize/2, arrow.endY - handleSize/2, handleSize, handleSize);
    
    mainContext.restore();
  }

  function drawLogoSelection(logoId: number) {
    const state = get(canvasStore);
    const logo = state.logos.find(l => l.id === logoId);
    if (!logo || !logo.image || !mainContext) return;
    
    const scaledWidth = logo.image.width * (logo.scale / 100);
    const scaledHeight = logo.image.height * (logo.scale / 100);
    
    mainContext.save();
    mainContext.strokeStyle = '#007ACC';
    mainContext.lineWidth = 2;
    mainContext.setLineDash([5, 5]);
    
    // Draw selection box
    mainContext.strokeRect(logo.x, logo.y, scaledWidth, scaledHeight);
    
    // Draw resize handles (corners)
    const handleSize = 8;
    mainContext.fillStyle = '#007ACC';
    mainContext.setLineDash([]);
    
    // Top-left handle
    mainContext.fillRect(logo.x - handleSize/2, logo.y - handleSize/2, handleSize, handleSize);
    // Top-right handle
    mainContext.fillRect(logo.x + scaledWidth - handleSize/2, logo.y - handleSize/2, handleSize, handleSize);
    // Bottom-left handle
    mainContext.fillRect(logo.x - handleSize/2, logo.y + scaledHeight - handleSize/2, handleSize, handleSize);
    // Bottom-right handle
    mainContext.fillRect(logo.x + scaledWidth - handleSize/2, logo.y + scaledHeight - handleSize/2, handleSize, handleSize);
    
    mainContext.restore();
  }

  function findResizeHandleAt(x: number, y: number): ResizeHandle | null {
    const state = get(canvasStore);
    const handleSize = 8;
    const tolerance = 4;
    
    // Check text annotations first
    for (const text of state.textAnnotations) {
      if (!text.selected) continue;
      
      // Check rotation handle first
      const rotationHandleDistance = 30;
      const rotationHandleX = text.x + text.width / 2;
      const rotationHandleY = text.y - rotationHandleDistance;
      
      if (Math.abs(x - rotationHandleX) <= 6 + tolerance && 
          Math.abs(y - rotationHandleY) <= 6 + tolerance) {
        return {
          type: 'rotation',
          position: 'rotation',
          elementType: 'text',
          elementId: text.id,
          x: rotationHandleX,
          y: rotationHandleY,
          size: 12
        };
      }
      
      // Check resize handles
      const handles = [
        { pos: 'nw', x: text.x - 4, y: text.y - 2 },
        { pos: 'ne', x: text.x + text.width - 4, y: text.y - 2 },
        { pos: 'sw', x: text.x - 4, y: text.y + text.height - 2 },
        { pos: 'se', x: text.x + text.width - 4, y: text.y + text.height - 2 }
      ];
      
      for (const handle of handles) {
        if (Math.abs(x - handle.x) <= handleSize/2 + tolerance && 
            Math.abs(y - handle.y) <= handleSize/2 + tolerance) {
          return {
            type: 'corner',
            position: handle.pos as 'nw' | 'ne' | 'sw' | 'se',
            elementType: 'text',
            elementId: text.id,
            x: handle.x,
            y: handle.y,
            size: handleSize
          };
        }
      }
    }
    
    // Check other elements
    for (const element of state.selectedElements) {
      if (element.type === 'arrow') {
        const arrow = state.arrows.find(a => a.id.toString() === element.elementId);
        if (!arrow) continue;
        
        const handles = [
          { pos: 'start', x: arrow.startX, y: arrow.startY },
          { pos: 'end', x: arrow.endX, y: arrow.endY }
        ];
        
        for (const handle of handles) {
          if (Math.abs(x - handle.x) <= handleSize/2 + tolerance && 
              Math.abs(y - handle.y) <= handleSize/2 + tolerance) {
            return {
              type: 'corner',
              position: handle.pos as 'start' | 'end',
              elementType: 'arrow',
              elementId: arrow.id.toString(),
              x: handle.x,
              y: handle.y,
              size: handleSize
            };
          }
        }
      } else if (element.type === 'logo') {
        const logo = state.logos.find(l => l.id.toString() === element.elementId);
        if (!logo || !logo.image) continue;
        
        const scaledWidth = logo.image.width * (logo.scale / 100);
        const scaledHeight = logo.image.height * (logo.scale / 100);
        
        const handles = [
          { pos: 'nw', x: logo.x, y: logo.y },
          { pos: 'ne', x: logo.x + scaledWidth, y: logo.y },
          { pos: 'sw', x: logo.x, y: logo.y + scaledHeight },
          { pos: 'se', x: logo.x + scaledWidth, y: logo.y + scaledHeight }
        ];
        
        for (const handle of handles) {
          if (Math.abs(x - handle.x) <= handleSize/2 + tolerance && 
              Math.abs(y - handle.y) <= handleSize/2 + tolerance) {
            return {
              type: 'corner',
              position: handle.pos as 'nw' | 'ne' | 'sw' | 'se',
              elementType: 'logo',
              elementId: logo.id.toString(),
              x: handle.x,
              y: handle.y,
              size: handleSize
            };
          }
        }
      } else if (element.type === 'shape') {
        const shape = state.completedShapes.find(s => s.id === element.elementId);
        if (!shape) continue;
        
        const minX = Math.min(shape.startX, shape.endX);
        const maxX = Math.max(shape.startX, shape.endX);
        const minY = Math.min(shape.startY, shape.endY);
        const maxY = Math.max(shape.startY, shape.endY);
        
        const handles = [
          { pos: 'nw', x: minX, y: minY },
          { pos: 'ne', x: maxX, y: minY },
          { pos: 'sw', x: minX, y: maxY },
          { pos: 'se', x: maxX, y: maxY }
        ];
        
        for (const handle of handles) {
          if (Math.abs(x - handle.x) <= handleSize/2 + tolerance && 
              Math.abs(y - handle.y) <= handleSize/2 + tolerance) {
            return {
              type: 'corner',
              position: handle.pos as 'nw' | 'ne' | 'sw' | 'se',
              elementType: 'shape',
              elementId: shape.id,
              x: handle.x,
              y: handle.y,
              size: handleSize
            };
          }
        }
      }
    }
    
    return null;
  }

  function handleResize(currentX: number, currentY: number) {
    const state = get(canvasStore);
    const handle = state.resizeHandle;
    if (!handle) return;
    
    const deltaX = currentX - state.startX;
    const deltaY = currentY - state.startY;
    
    if (handle.elementType === 'text') {
      const text = state.textAnnotations.find(t => t.id === handle.elementId);
      if (!text) return;
      
      if (handle.type === 'rotation') {
        // Handle rotation
        const centerX = text.x + text.width / 2;
        const centerY = text.y + text.height / 2;
        
        // Calculate angle from center to current mouse position
        const angle = Math.atan2(currentY - centerY, currentX - centerX);
        const degrees = (angle * 180 / Math.PI + 90) % 360;
        
        canvasStore.updateTextAnnotation(text.id, {
          rotation: Math.round(degrees)
        });
      } else {
        // Handle resizing (existing code)
        let newFontSize = text.fontSize;
        let newX = text.x;
        let newY = text.y;
        
        switch (handle.position) {
          case 'se':
            const scaleFactor = Math.max(0.1, 1 + (deltaX + deltaY) / 200);
            newFontSize = Math.max(8, Math.min(72, text.fontSize * scaleFactor));
            break;
          case 'nw':
            const scaleFactorNW = Math.max(0.1, 1 - (deltaX + deltaY) / 200);
            newFontSize = Math.max(8, Math.min(72, text.fontSize * scaleFactorNW));
            newX = text.x + deltaX;
            newY = text.y + deltaY;
            break;
          case 'ne':
            const scaleFactorNE = Math.max(0.1, 1 + (deltaX - deltaY) / 200);
            newFontSize = Math.max(8, Math.min(72, text.fontSize * scaleFactorNE));
            newY = text.y + deltaY;
            break;
          case 'sw':
            const scaleFactorSW = Math.max(0.1, 1 + (-deltaX + deltaY) / 200);
            newFontSize = Math.max(8, Math.min(72, text.fontSize * scaleFactorSW));
            newX = text.x + deltaX;
            break;
        }
        
        canvasStore.updateTextAnnotation(text.id, {
          fontSize: Math.round(newFontSize),
          x: newX,
          y: newY
        });
      }
    } else if (handle.elementType === 'arrow') {
      const arrow = state.arrows.find(a => a.id.toString() === handle.elementId);
      if (!arrow) return;
      
      if (handle.position === 'start') {
        canvasStore.updateArrow(arrow.id, {
          startX: currentX,
          startY: currentY
        });
      } else if (handle.position === 'end') {
        canvasStore.updateArrow(arrow.id, {
          endX: currentX,
          endY: currentY
        });
      }
    } else if (handle.elementType === 'logo') {
      // Existing logo resize logic
      const logo = state.logos.find(l => l.id.toString() === handle.elementId);
      if (!logo || !logo.image) return;
      
      const originalWidth = logo.image.width * (logo.scale / 100);
      const originalHeight = logo.image.height * (logo.scale / 100);
      
      let newScale = logo.scale;
      let newX = logo.x;
      let newY = logo.y;
      
      switch (handle.position) {
        case 'se':
          const scaleFactorSE = Math.max(0.1, 1 + deltaX / originalWidth);
          newScale = logo.scale * scaleFactorSE;
          break;
        case 'nw':
          const scaleFactorNW = Math.max(0.1, 1 - deltaX / originalWidth);
          newScale = logo.scale * scaleFactorNW;
          newX = logo.x + deltaX;
          newY = logo.y + deltaY;
          break;
        case 'ne':
          const scaleFactorNE = Math.max(0.1, 1 + deltaX / originalWidth);
          newScale = logo.scale * scaleFactorNE;
          newY = logo.y + deltaY;
          break;
        case 'sw':
          const scaleFactorSW = Math.max(0.1, 1 - deltaX / originalWidth);
          newScale = logo.scale * scaleFactorSW;
          newX = logo.x + deltaX;
          break;
      }
      
      canvasStore.updateLogo(logo.id, { 
        scale: Math.min(500, newScale),
        x: newX,
        y: newY
      });
      
    } else if (handle.elementType === 'shape') {
      // Existing shape resize logic
      const shape = state.completedShapes.find(s => s.id === handle.elementId);
      if (!shape) return;
      
      let newStartX = shape.startX;
      let newStartY = shape.startY;
      let newEndX = shape.endX;
      let newEndY = shape.endY;
      
      switch (handle.position) {
        case 'se':
          newEndX = shape.endX + deltaX;
          newEndY = shape.endY + deltaY;
          break;
        case 'nw':
          newStartX = shape.startX + deltaX;
          newStartY = shape.startY + deltaY;
          break;
        case 'ne':
          newEndX = shape.endX + deltaX;
          newStartY = shape.startY + deltaY;
          break;
        case 'sw':
          newStartX = shape.startX + deltaX;
          newEndY = shape.endY + deltaY;
          break;
      }
      
      update(s => ({
        ...s,
        completedShapes: s.completedShapes.map(sh => 
          sh.id === shape.id 
            ? { ...sh, startX: newStartX, startY: newStartY, endX: newEndX, endY: newEndY }
            : sh
        )
      }));
    }
    
    // Update start position for next frame
    update(s => ({ ...s, startX: currentX, startY: currentY }));
    redrawCanvas();
  }

  function findTextAnnotationAt(x: number, y: number): TextAnnotation | null {
    const state = get(canvasStore);
    
    // Check text annotations in reverse order (top to bottom)
    for (let i = state.textAnnotations.length - 1; i >= 0; i--) {
      const text = state.textAnnotations[i];
      if (!text.visible) continue;
      
      // If text is rotated, we need to transform the click coordinates
      if (text.rotation !== 0) {
        const centerX = text.x + text.width / 2;
        const centerY = text.y + text.height / 2;
        
        // Rotate the click point in the opposite direction
        const angle = -text.rotation * Math.PI / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        
        // Translate to origin, rotate, translate back
        const translatedX = x - centerX;
        const translatedY = y - centerY;
        
        const rotatedX = translatedX * cos - translatedY * sin + centerX;
        const rotatedY = translatedX * sin + translatedY * cos + centerY;
        
        // Check if the rotated point is within the text bounds
        if (rotatedX >= text.x && rotatedX <= text.x + text.width && 
            rotatedY >= text.y && rotatedY <= text.y + text.height) {
          return text;
        }
      } else {
        // Simple bounds check for non-rotated text
        if (x >= text.x && x <= text.x + text.width && 
            y >= text.y && y <= text.y + text.height) {
          return text;
        }
      }
    }
    
    return null;
  }

  function moveTextAnnotation(textId: string, deltaX: number, deltaY: number) {
    update(state => ({
      ...state,
      textAnnotations: state.textAnnotations.map(text => 
        text.id === textId 
          ? {
              ...text,
              x: text.x + deltaX,
              y: text.y + deltaY
            }
          : text
      )
    }));
    redrawCanvas();
  }

  function drawTextSelection(textId: string) {
    if (!mainContext) return;
    
    const state = get(canvasStore);
    const text = state.textAnnotations.find(t => t.id === textId);
    if (!text) return;
    
    mainContext.save();
    
    // Calculate center point for rotation
    const centerX = text.x + text.width / 2;
    const centerY = text.y + text.height / 2;
    
    // Apply rotation if needed
    if (text.rotation !== 0) {
      mainContext.translate(centerX, centerY);
      mainContext.rotate((text.rotation * Math.PI) / 180);
      mainContext.translate(-centerX, -centerY);
    }
    
    mainContext.strokeStyle = '#0066ff';
    mainContext.lineWidth = 2;
    mainContext.setLineDash([5, 5]);
    
    // Draw selection box
    mainContext.strokeRect(text.x - 4, text.y - 2, text.width, text.height);
    
    // Draw resize handles
    const handleSize = 8;
    mainContext.fillStyle = '#0066ff';
    mainContext.setLineDash([]);
    
    // Corner handles
    const handles = [
      { x: text.x - 4, y: text.y - 2 }, // top-left
      { x: text.x + text.width - 4, y: text.y - 2 }, // top-right
      { x: text.x - 4, y: text.y + text.height - 2 }, // bottom-left
      { x: text.x + text.width - 4, y: text.y + text.height - 2 } // bottom-right
    ];
    
    handles.forEach(handle => {
      mainContext.fillRect(
        handle.x - handleSize/2, 
        handle.y - handleSize/2, 
        handleSize, 
        handleSize
      );
    });

    // Draw rotation handle
    const rotationHandleDistance = 30;
    const rotationHandleX = text.x + text.width / 2;
    const rotationHandleY = text.y - rotationHandleDistance;
    
    // Draw line from top center to rotation handle
    mainContext.strokeStyle = '#0066ff';
    mainContext.lineWidth = 1;
    mainContext.setLineDash([]);
    mainContext.beginPath();
    mainContext.moveTo(text.x + text.width / 2, text.y - 2);
    mainContext.lineTo(rotationHandleX, rotationHandleY);
    mainContext.stroke();
    
    // Draw rotation handle circle
    mainContext.fillStyle = '#0066ff';
    mainContext.strokeStyle = '#ffffff';
    mainContext.lineWidth = 2;
    mainContext.beginPath();
    mainContext.arc(rotationHandleX, rotationHandleY, 6, 0, 2 * Math.PI);
    mainContext.fill();
    mainContext.stroke();
    
    mainContext.restore();
  }

  function drawShapePreview(tool: string, startX: number, startY: number, endX: number, endY: number) {
    if (!mainContext) return;
    
    const state = get(canvasStore);
    mainContext.strokeStyle = hexToRgba(state.color, state.opacity / 100);
    mainContext.lineWidth = state.brushSize;
    
    switch (tool) {
      case 'square':
        const width = endX - startX;
        const height = endY - startY;
        mainContext.strokeRect(startX, startY, width, height);
        break;
        
      case 'circle':
        const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
        mainContext.beginPath();
        mainContext.arc(startX, startY, radius, 0, 2 * Math.PI);
        mainContext.stroke();
        break;
    }
  }
}

export const canvasStore = createCanvasStore(); 
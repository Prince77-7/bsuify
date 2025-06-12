<script lang="ts">
  import { 
    Pen, 
    Square, 
    Circle, 
    Pentagon, 
    Type, 
    Palette, 
    Layers, 
    Move,
    RotateCcw,
    Trash2,
    Eye,
    EyeOff,
    Plus,
    Ruler,
    Shapes
  } from 'lucide-svelte';
  import { canvasStore, type DrawingTool } from '../stores/canvas';
  import { settingsStore } from '../stores/settings';

  interface Tool {
    id: DrawingTool;
    icon: any;
    label: string;
    shortcut?: string;
  }

  // Reactive variables from stores
  $: activeTool = $canvasStore.activeTool;
  $: brushSize = $canvasStore.brushSize;
  $: selectedColor = $canvasStore.color;
  $: opacity = $canvasStore.opacity;
  $: layers = $canvasStore.layers;
  $: activeLayerId = $canvasStore.activeLayerId;
  $: historyStep = $canvasStore.historyStep;
  $: history = $canvasStore.history;
  $: selectedTextAnnotation = $canvasStore.textAnnotations.find(t => t.selected);

  const tools: Tool[] = [
    { id: 'move', icon: Move, label: 'Move Tool', shortcut: 'V' },
    { id: 'pen', icon: Pen, label: 'Draw Lines', shortcut: '1' },
    { id: 'square', icon: Square, label: 'Rectangle', shortcut: '2' },
    { id: 'circle', icon: Circle, label: 'Circle', shortcut: '3' },
    { id: 'polygon', icon: Pentagon, label: 'Polygon', shortcut: '4' },
    { id: 'text', icon: Type, label: 'Text Tool', shortcut: 'T' },
    { id: 'ruler', icon: Ruler, label: 'Measure Distance', shortcut: 'R' },
    { id: 'area', icon: Shapes, label: 'Measure Area', shortcut: 'A' },
  ];

  const colors = [
    '#e4915c', // Earth
    '#22c55e', // Forest green
    '#0ea5e9', // Primary blue
    '#ef4444', // Red
    '#f59e0b', // Amber
    '#8b5cf6', // Purple
    '#64748b', // Slate
    '#000000', // Black
    '#ffffff', // White
    '#fbbf24', // Yellow
    '#f97316', // Orange
    '#10b981', // Emerald
  ];

  function handleToolSelect(tool: DrawingTool) {
    canvasStore.setTool(tool);
  }

  function handleBrushSizeChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const newSize = parseInt(target.value);
    canvasStore.setBrushSize(newSize);
    
    // Also update selected vector path if one is selected
    if ($canvasStore.selectedVectorPathId) {
      canvasStore.updateSelectedVectorPath({ strokeWidth: newSize });
    }
  }

  function handleColorSelect(color: string) {
    canvasStore.setColor(color);
    
    // Also update selected vector path if one is selected
    if ($canvasStore.selectedVectorPathId) {
      canvasStore.updateSelectedVectorPath({ stroke: color });
    }
  }

  function handleCustomColorChange(event: Event) {
    const target = event.target as HTMLInputElement;
    canvasStore.setColor(target.value);
    
    // Also update selected vector path if one is selected
    if ($canvasStore.selectedVectorPathId) {
      canvasStore.updateSelectedVectorPath({ stroke: target.value });
    }
  }

  function handleOpacityChange(event: Event) {
    const target = event.target as HTMLInputElement;
    canvasStore.setOpacity(parseInt(target.value));
    
    // Note: Vector paths don't currently support opacity as a separate property
    // They use the stroke color with alpha. We could extend this in the future.
  }

  function handleLayerToggle(layerId: string) {
    canvasStore.toggleLayerVisibility(layerId);
  }

  function handleLayerDelete(layerId: string) {
    if (confirm('Are you sure you want to delete this layer?')) {
      canvasStore.deleteLayer(layerId);
    }
  }

  function handleLayerSelect(layerId: string) {
    canvasStore.setActiveLayer(layerId);
  }

  function handleUndo() {
    canvasStore.undo();
  }

  function handleClearCanvas() {
    if (confirm('Are you sure you want to clear the canvas? This action cannot be undone.')) {
      canvasStore.clear();
    }
  }

  function createNewLayer() {
    const layerName = prompt('Enter layer name:');
    if (layerName) {
      const layerId = layerName.toLowerCase().replace(/\s+/g, '-');
      canvasStore.createLayer(layerId, layerName);
    }
  }

  function handleSelectedTextUpdate(updates: any) {
    canvasStore.updateSelectedTextAnnotation(updates);
  }

  function deleteSelectedText() {
    if (selectedTextAnnotation) {
      canvasStore.removeTextAnnotation(selectedTextAnnotation.id);
    }
  }

  // Keyboard shortcuts
  function handleKeydown(event: KeyboardEvent) {
    if (event.target instanceof HTMLInputElement) return;
    
    switch (event.key) {
      case '1':
        handleToolSelect('pen');
        break;
      case '2':
        handleToolSelect('square');
        break;
      case '3':
        handleToolSelect('circle');
        break;
      case '4':
        handleToolSelect('polygon');
        break;
      case 'v':
      case 'V':
        handleToolSelect('move');
        break;
      case 't':
      case 'T':
        handleToolSelect('text');
        break;
      case 'r':
      case 'R':
        handleToolSelect('ruler');
        break;
      case 'a':
      case 'A':
        handleToolSelect('area');
        break;
      case 'z':
      case 'Z':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          handleUndo();
        }
        break;
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="sidebar-panel w-full h-full">
  <div class="space-y-4 lg:space-y-6 px-2 lg:px-0">
    <!-- Tools Section -->
    <div>
      <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <Palette class="w-5 h-5 mr-2 text-primary-500" />
        Drawing Tools
      </h3>
      
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 lg:gap-3">
        {#each tools as tool}
          <button 
            class="tool-button group relative {activeTool === tool.id ? 'active' : ''}"
            on:click={() => handleToolSelect(tool.id)}
            title="{tool.label} {tool.shortcut ? `(${tool.shortcut})` : ''}"
          >
            <svelte:component this={tool.icon} class="w-5 h-5" />
            {#if tool.shortcut}
              <span class="absolute -top-1 -right-1 bg-gray-600 text-white text-xs rounded px-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {tool.shortcut}
              </span>
            {/if}
          </button>
        {/each}
      </div>
    </div>

    <!-- Tool-specific Settings -->
    {#if activeTool === 'pen'}
      <div class="space-y-4">
        <h4 class="font-medium text-gray-700">Professional Pen Settings</h4>
        
        <div>
          <label class="block text-sm font-medium text-gray-600 mb-2">
            Brush Size: {brushSize}px
          </label>
          <input 
            type="range" 
            min="1" 
            max="50" 
            value={brushSize}
            on:input={handleBrushSizeChange}
            class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
          <div class="flex justify-between text-xs text-gray-400 mt-1">
            <span>1px</span>
            <span>50px</span>
          </div>
        </div>

        <!-- Vector Pen Tool Status -->
        {#if $canvasStore.isCreatingPath}
          <div class="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h5 class="text-sm font-medium text-green-800 mb-2">🎯 Creating Vector Path</h5>
            <p class="text-sm text-green-700 mb-3">
              Points: {$canvasStore.pathPoints.length}
            </p>
            <div class="space-y-2">
              <button
                on:click={() => canvasStore.finishCurrentPath?.()}
                class="w-full px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
              >
                Finish Path
              </button>
              <button
                on:click={() => canvasStore.closeCurrentPath?.()}
                class="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={$canvasStore.pathPoints.length < 3}
              >
                Close Shape
              </button>
              <button
                on:click={() => canvasStore.cancelCurrentPath?.()}
                class="w-full px-3 py-2 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        {:else}
          <div class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h5 class="text-sm font-medium text-blue-800 mb-2">🖊️ Vector Pen Tool</h5>
            <div class="text-xs text-blue-700 space-y-1">
              <p>• <strong>Click</strong> to place anchor points</p>
              <p>• Build shapes with straight lines</p>
              <p>• <strong>Click near start</strong> to close shape</p>
              <p>• Shapes <strong>persist</strong> on canvas</p>
              <p>• Like Inkscape's pen tool!</p>
            </div>
          </div>
        {/if}

        <div class="text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
          <strong>Path count:</strong> {$canvasStore.completedVectorPaths?.length || 0}
        </div>
      </div>
    
    {:else if activeTool === 'square' || activeTool === 'circle'}
      <div class="space-y-4">
        <h4 class="font-medium text-gray-700">Stroke Settings</h4>
        
        <div>
          <label class="block text-sm font-medium text-gray-600 mb-2">
            Size: {brushSize}px
          </label>
          <input 
            type="range" 
            min="1" 
            max="50" 
            value={brushSize}
            on:input={handleBrushSizeChange}
            class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
          <div class="flex justify-between text-xs text-gray-400 mt-1">
            <span>1px</span>
            <span>50px</span>
          </div>
        </div>
      </div>
    {/if}

    {#if activeTool === 'text'}
      <div class="space-y-4">
        <h4 class="font-medium text-gray-700">Text Settings</h4>
        
        <div>
          <label class="block text-sm font-medium text-gray-600 mb-2">
            Font Size: {$canvasStore.fontSize}px
          </label>
          <input 
            type="range" 
            min="8" 
            max="72" 
            value={$canvasStore.fontSize}
            on:input={(e) => canvasStore.setFontSize(parseInt(e.target.value))}
            class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-600 mb-2">Font Family</label>
          <select 
            value={$canvasStore.fontFamily}
            on:change={(e) => canvasStore.setFontFamily(e.target.value)}
            class="w-full p-2 border border-gray-300 rounded-lg"
          >
            <option value="Inter">Inter</option>
            <option value="Arial">Arial</option>
            <option value="Helvetica">Helvetica</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Georgia">Georgia</option>
          </select>
        </div>

        <div>
          <label class="flex items-center space-x-2">
            <input 
              type="checkbox" 
              checked={$canvasStore.textBackground}
              on:change={(e) => canvasStore.setTextBackground(e.target.checked)}
              class="rounded"
            />
            <span class="text-sm font-medium text-gray-600">Background</span>
          </label>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-600 mb-2">Text Color</label>
          <input 
            type="color" 
            value={$canvasStore.textColor}
            on:input={(e) => canvasStore.setTextColor(e.target.value)}
            class="w-full h-10 rounded-lg border border-gray-200 cursor-pointer"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-600 mb-2">Background Color</label>
          <input 
            type="color" 
            value={$canvasStore.textBackgroundColor}
            on:input={(e) => canvasStore.setTextBackgroundColor(e.target.value)}
            class="w-full h-10 rounded-lg border border-gray-200 cursor-pointer"
          />
        </div>

        <!-- Property Templates -->
        <div>
          <label class="block text-sm font-medium text-gray-600 mb-2">Quick Templates</label>
          <div class="grid grid-cols-1 gap-2">
            <button 
              class="text-left p-2 bg-blue-50 text-blue-700 rounded text-sm hover:bg-blue-100"
              on:click={() => alert('Click on canvas to add square footage label')}
            >
              📐 Square Footage
            </button>
            <button 
              class="text-left p-2 bg-red-50 text-red-700 rounded text-sm hover:bg-red-100"
              on:click={() => alert('Click on canvas to add property line label')}
            >
              🏠 Property Line
            </button>
            <button 
              class="text-left p-2 bg-green-50 text-green-700 rounded text-sm hover:bg-green-100"
              on:click={() => alert('Click on canvas to add feature label')}
            >
              🌳 Feature Label
            </button>
          </div>
        </div>
      </div>
    {:else if selectedTextAnnotation}
      <div class="space-y-4">
        <h4 class="font-medium text-gray-700">Selected Text Properties</h4>
        
        <div>
          <label class="block text-sm font-medium text-gray-600 mb-2">Text Content</label>
          <textarea
            value={selectedTextAnnotation.text}
            on:input={(e) => handleSelectedTextUpdate({ text: e.target.value })}
            class="w-full p-2 border border-gray-300 rounded-lg resize-none"
            rows="2"
            placeholder="Enter text..."
          ></textarea>
        </div>
        
                 <div>
           <label class="block text-sm font-medium text-gray-600 mb-2">
             Font Size: {selectedTextAnnotation.fontSize}px
           </label>
           <input 
             type="range" 
             min="8" 
             max="72" 
             value={selectedTextAnnotation.fontSize}
             on:input={(e) => handleSelectedTextUpdate({ fontSize: parseInt(e.target.value) })}
             class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
           />
         </div>

         <div>
           <label class="block text-sm font-medium text-gray-600 mb-2">Font Family</label>
           <select 
             value={selectedTextAnnotation.fontFamily}
             on:change={(e) => handleSelectedTextUpdate({ fontFamily: e.target.value })}
             class="w-full p-2 border border-gray-300 rounded-lg"
           >
             <option value="Inter">Inter</option>
             <option value="Arial">Arial</option>
             <option value="Helvetica">Helvetica</option>
             <option value="Times New Roman">Times New Roman</option>
             <option value="Georgia">Georgia</option>
             <option value="Courier New">Courier New</option>
             <option value="Verdana">Verdana</option>
           </select>
         </div>

         <div>
           <label class="block text-sm font-medium text-gray-600 mb-2">Text Color</label>
           <input 
             type="color" 
             value={selectedTextAnnotation.color}
             on:input={(e) => handleSelectedTextUpdate({ color: e.target.value })}
             class="w-full h-10 rounded-lg border border-gray-200 cursor-pointer"
           />
         </div>

         <div>
           <label class="flex items-center space-x-2">
             <input 
               type="checkbox" 
               checked={selectedTextAnnotation.hasBackground}
               on:change={(e) => handleSelectedTextUpdate({ hasBackground: e.target.checked })}
               class="rounded"
             />
             <span class="text-sm font-medium text-gray-600">Background</span>
           </label>
         </div>

         {#if selectedTextAnnotation.hasBackground}
           <div>
             <label class="block text-sm font-medium text-gray-600 mb-2">Background Color</label>
             <input 
               type="color" 
               value={selectedTextAnnotation.backgroundColor || '#ffffff'}
               on:input={(e) => handleSelectedTextUpdate({ backgroundColor: e.target.value })}
               class="w-full h-10 rounded-lg border border-gray-200 cursor-pointer"
             />
           </div>
         {/if}

         <div>
           <label class="block text-sm font-medium text-gray-600 mb-2">
             Rotation: {selectedTextAnnotation.rotation}°
           </label>
           <input 
             type="range" 
             min="0" 
             max="360" 
             value={selectedTextAnnotation.rotation}
             on:input={(e) => handleSelectedTextUpdate({ rotation: parseInt(e.target.value) })}
             class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
           />
         </div>

         <div class="space-y-2">
           <button
             class="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
             on:click={() => canvasStore.startEditingText(selectedTextAnnotation.id)}
           >
             Edit Text
           </button>
           <button
             class="w-full px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
             on:click={deleteSelectedText}
           >
             Delete Text
           </button>
         </div>
       </div>
     {:else if activeTool === 'pen' || $canvasStore.selectedVectorPathId}
       <div class="space-y-4">
         <h4 class="font-medium text-gray-700">Pen Settings</h4>
         
         <div>
           <label class="block text-sm font-medium text-gray-600 mb-2">
             Line Thickness: {$canvasStore.brushSize}px
           </label>
           <input 
             type="range" 
             min="1" 
             max="50" 
             value={$canvasStore.brushSize}
             on:input={handleBrushSizeChange}
             class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
           />
           <div class="flex justify-between text-xs text-gray-400 mt-1">
             <span>1px</span>
             <span>50px</span>
           </div>
         </div>

         <div>
           <label class="block text-sm font-medium text-gray-600 mb-2">Line Color</label>
           <input 
             type="color" 
             value={selectedColor}
             on:input={handleCustomColorChange}
             class="w-full h-10 rounded-lg border border-gray-200 cursor-pointer"
           />
         </div>

         <div>
           <label class="block text-sm font-medium text-gray-600 mb-2">
             Opacity: {opacity}%
           </label>
           <input 
             type="range" 
             min="10" 
             max="100" 
             value={opacity}
             on:input={handleOpacityChange}
             class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
           />
           <div class="flex justify-between text-xs text-gray-400 mt-1">
             <span>10%</span>
             <span>100%</span>
           </div>
         </div>

         {#if $canvasStore.selectedVectorPathId}
           <div class="space-y-2">
             <button
               class="w-full px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
               on:click={() => canvasStore.deleteSelectedElements()}
             >
               Delete Selected Path
             </button>
           </div>
         {/if}
      </div>
    {/if}

    {#if activeTool === 'ruler'}
      <div class="space-y-4">
        <h4 class="font-medium text-gray-700">Distance Measurement</h4>
        
        <div>
          <label class="block text-sm font-medium text-gray-600 mb-2">Scale</label>
          <div class="space-y-2">
            <input 
              type="number" 
              value={$canvasStore.pixelsPerFoot}
              on:input={(e) => canvasStore.setPixelsPerFoot(parseInt(e.target.value))}
              class="w-full p-2 border border-gray-300 rounded"
              placeholder="Pixels per foot"
            />
            <select 
              value={$canvasStore.measurementUnit}
              on:change={(e) => canvasStore.setMeasurementUnit(e.target.value)}
              class="w-full p-2 border border-gray-300 rounded"
            >
              <option value="feet">Feet</option>
              <option value="meters">Meters</option>
              <option value="yards">Yards</option>
            </select>
          </div>
        </div>

        <div class="text-sm text-blue-600 p-3 bg-blue-50 rounded-lg">
          💡 Click two points to measure distance
        </div>
      </div>
    {/if}

    {#if activeTool === 'area'}
      <div class="space-y-4">
        <h4 class="font-medium text-gray-700">Area Measurement</h4>
        
        <div>
          <label class="block text-sm font-medium text-gray-600 mb-2">Units</label>
          <select 
            value={$canvasStore.measurementUnit}
            on:change={(e) => canvasStore.setMeasurementUnit(e.target.value)}
            class="w-full p-2 border border-gray-300 rounded"
          >
            <option value="feet">Square Feet</option>
            <option value="meters">Square Meters</option>
            <option value="yards">Square Yards</option>
          </select>
        </div>

        <div>
          <label class="flex items-center space-x-2">
            <input 
              type="checkbox" 
              checked={$canvasStore.showMeasurements}
              on:change={() => canvasStore.toggleMeasurements()}
              class="rounded"
            />
            <span class="text-sm font-medium text-gray-600">Show Measurements</span>
          </label>
        </div>

        <div class="text-sm text-green-600 p-3 bg-green-50 rounded-lg">
          💡 Click points to create polygon area
        </div>
      </div>
    {/if}

    <!-- Color Palette -->
    <div>
      <h4 class="font-medium text-gray-700 mb-3">Colors</h4>
      <div class="grid grid-cols-4 gap-2">
        {#each colors as color}
          <button
            class="w-12 h-12 rounded-xl border-2 transition-all duration-200 hover:scale-110 shadow-sm hover:shadow-md {selectedColor === color ? 'border-gray-400 ring-2 ring-primary-500 ring-offset-2' : 'border-gray-200'}"
            style="background-color: {color}"
            on:click={() => handleColorSelect(color)}
            title="Select color: {color}"
          ></button>
        {/each}
      </div>
      
      <!-- Custom Color Input -->
      <div class="mt-3">
        <label class="block text-sm font-medium text-gray-600 mb-2">Custom Color</label>
        <input 
          type="color" 
          value={selectedColor}
          on:input={handleCustomColorChange}
          class="w-full h-10 rounded-lg border border-gray-200 cursor-pointer"
        />
      </div>
    </div>

    <!-- Opacity -->
    <div>
      <label class="block text-sm font-medium text-gray-600 mb-2">
        Opacity: {opacity}%
      </label>
      <input 
        type="range" 
        min="10" 
        max="100" 
        value={opacity}
        on:input={handleOpacityChange}
        class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
      />
      <div class="flex justify-between text-xs text-gray-400 mt-1">
        <span>10%</span>
        <span>100%</span>
      </div>
    </div>

    <!-- Layer Controls -->
    <div class="border-t border-gray-200 pt-6">
      <div class="flex items-center justify-between mb-3">
        <h4 class="font-medium text-gray-700 flex items-center">
          <Layers class="w-4 h-4 mr-2" />
          Layers ({layers.length})
        </h4>
        <button 
          class="text-xs bg-primary-500 text-white px-2 py-1 rounded-md hover:bg-primary-600 transition-colors flex items-center"
          on:click={createNewLayer}
          title="Create New Layer"
        >
          <Plus class="w-3 h-3 mr-1" />
          New
        </button>
      </div>
      
      <!-- Layer Description -->
      <div class="mb-3 text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
        <p class="font-medium mb-1">Layer Organization:</p>
        <ul class="space-y-1">
          <li>• <strong>Background:</strong> Main property photo</li>
          <li>• <strong>Property Lines:</strong> Drawing tools (pen, shapes, text, measurements)</li>
          <li>• <strong>Annotations:</strong> Logos from right panel</li>
        </ul>
      </div>
      
      <div class="space-y-2 max-h-48 overflow-y-auto">
        {#each layers as layer (layer.id)}
          {@const layerDescription = layer.id === 'background' ? 'Main property photo' : 
                                   layer.id === 'property-lines' ? 'Drawing tools, shapes, measurements' :
                                   layer.id === 'annotations' ? 'Logos and branding elements' :
                                   'Custom layer'}
          <div class="flex items-center justify-between p-3 rounded-lg border transition-all duration-200 cursor-pointer
            {activeLayerId === layer.id ? 'border-primary-300 bg-primary-50' : 'border-gray-200 hover:border-gray-300 bg-white'}
            {!layer.visible ? 'opacity-50' : ''}"
            on:click={() => handleLayerSelect(layer.id)}
            title={layerDescription}
          >
            <div class="flex items-center space-x-3 flex-1 min-w-0">
              <div class="w-3 h-3 rounded-full {activeLayerId === layer.id ? 'bg-primary-500' : 'bg-gray-300'}"></div>
              <div class="flex-1 min-w-0">
                <span class="text-sm font-medium text-gray-700 truncate block">{layer.name}</span>
                <span class="text-xs text-gray-500 truncate block">{layerDescription}</span>
              </div>
            </div>
            
            <div class="flex items-center space-x-1">
              <button 
                class="p-1 rounded hover:bg-gray-100 transition-colors"
                on:click|stopPropagation={() => handleLayerToggle(layer.id)}
                title={layer.visible ? 'Hide Layer' : 'Show Layer'}
              >
                {#if layer.visible}
                  <Eye class="w-4 h-4 text-gray-600" />
                {:else}
                  <EyeOff class="w-4 h-4 text-gray-400" />
                {/if}
              </button>
              
              {#if layer.id !== 'background'}
                <button 
                  class="p-1 rounded hover:bg-red-50 text-red-500 transition-colors"
                  on:click|stopPropagation={() => handleLayerDelete(layer.id)}
                  title="Delete Layer"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              {/if}
            </div>
          </div>
        {/each}
        
        {#if layers.length === 0}
          <div class="text-center py-4 text-gray-500">
            <Layers class="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p class="text-sm">No layers yet</p>
            <p class="text-xs">Upload an image to start</p>
          </div>
        {/if}
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="border-t border-gray-200 pt-6 space-y-3">
      <div class="flex space-x-2">
        <button 
          class="flex-1 btn-secondary flex items-center justify-center space-x-2"
          on:click={handleUndo}
          disabled={historyStep <= 0}
          title="Undo (Ctrl+Z)"
        >
          <RotateCcw class="w-4 h-4" />
          <span>Undo</span>
        </button>
        
        <span class="text-xs text-gray-400 self-center px-2">
          {historyStep + 1}/{history.length}
        </span>
      </div>
      
      <button 
        class="w-full btn-secondary flex items-center justify-center space-x-2 text-red-600 hover:text-red-700 hover:bg-red-50"
        on:click={handleClearCanvas}
      >
        <Trash2 class="w-4 h-4" />
        <span>Clear Canvas</span>
      </button>
    </div>

    <!-- Help Text -->
    <div class="text-xs text-gray-400 border-t border-gray-200 pt-4">
      <p class="font-medium mb-2">Keyboard Shortcuts:</p>
      <div class="space-y-1">
        <div class="flex justify-between">
          <span>Pen Tool:</span>
          <kbd class="bg-gray-100 px-1 rounded">1</kbd>
        </div>
        <div class="flex justify-between">
          <span>Rectangle:</span>
          <kbd class="bg-gray-100 px-1 rounded">2</kbd>
        </div>
        <div class="flex justify-between">
          <span>Circle:</span>
          <kbd class="bg-gray-100 px-1 rounded">3</kbd>
        </div>
        <div class="flex justify-between">
          <span>Move Tool:</span>
          <kbd class="bg-gray-100 px-1 rounded">V</kbd>
        </div>
        <div class="flex justify-between">
          <span>Undo:</span>
          <kbd class="bg-gray-100 px-1 rounded">Ctrl+Z</kbd>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .slider::-webkit-slider-thumb {
    appearance: none;
    height: 16px;
    width: 16px;
    border-radius: 50%;
    background: #0ea5e9;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .slider::-moz-range-thumb {
    height: 16px;
    width: 16px;
    border-radius: 50%;
    background: #0ea5e9;
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }

  .tool-button {
    @apply p-3 rounded-xl border-2 border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 flex items-center justify-center relative;
  }

  .tool-button.active {
    @apply border-primary-500 bg-primary-50 text-primary-700;
  }

  .tool-button:hover .tooltip {
    @apply opacity-100;
  }

  kbd {
    font-family: ui-monospace, SFMono-Regular, "SF Mono", monospace;
    font-size: 0.75rem;
  }
</style> 
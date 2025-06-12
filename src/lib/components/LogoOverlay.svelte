<script lang="ts">
  import { Upload, Plus, Trash2, Eye, EyeOff, RotateCw, Move, X } from 'lucide-svelte';
  import { canvasStore, type Logo } from '../stores/canvas';
  import { settingsStore } from '../stores/settings';
  import { validateImageFile, createThumbnail } from '../utils/fileUtils';

  let showUploadModal = false;
  let selectedLogo: Logo | null = null;
  let isDragging = false;
  let uploadError = '';
  let logoInputElement: HTMLInputElement;

  // Get logos from canvas store reactively
  $: logos = $canvasStore.logos;
  $: defaultOpacity = $settingsStore?.defaultLogoOpacity || 90;
  $: defaultScale = $settingsStore?.defaultLogoScale || 100;
  $: snapToEdges = $settingsStore?.logoSnapToEdges || true;

  function selectLogo(logo: Logo) {
    selectedLogo = selectedLogo?.id === logo.id ? null : logo;
  }

  function toggleLogoVisibility(logo: Logo) {
    canvasStore.updateLogo(logo.id, { visible: !logo.visible });
  }

  function removeLogo(logoId: number) {
    if (confirm('Remove this logo? This action cannot be undone.')) {
      canvasStore.removeLogo(logoId);
      if (selectedLogo?.id === logoId) {
        selectedLogo = null;
      }
    }
  }

  function duplicateLogo(logo: Logo) {
    const duplicate = {
      name: `${logo.name} Copy`,
      src: logo.src,
      image: logo.image,
      x: logo.x + 20,
      y: logo.y + 20,
      scale: logo.scale,
      opacity: logo.opacity,
      visible: logo.visible,
      rotation: logo.rotation,
      hasBackground: logo.hasBackground,
      backgroundColor: logo.backgroundColor,
      backgroundPadding: logo.backgroundPadding,
      backgroundRadius: logo.backgroundRadius
    };
    canvasStore.addLogo(duplicate);
  }

  async function handleLogoUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    await processLogoFile(file);
  }

  async function handleLogoDrop(event: DragEvent) {
    event.preventDefault();
    isDragging = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      await processLogoFile(files[0]);
    }
  }

  async function processLogoFile(file: File) {
    uploadError = '';
    
    try {
      // Validate file
      const validation = validateImageFile(file);
      if (!validation.valid) {
        uploadError = validation.error || 'Invalid file';
        return;
      }

      // Create thumbnail for preview
      const thumbnail = await createThumbnail(file, 100);
      
      // Create data URL for the logo
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        
        const newLogo = {
          name: file.name.split('.')[0],
          src: dataUrl,
          image: null,
          x: 50,
          y: 50,
          scale: defaultScale,
          opacity: defaultOpacity,
          visible: true,
          rotation: 0,
          hasBackground: false,
          backgroundColor: '#ffffff',
          backgroundPadding: 10,
          backgroundRadius: 8
        };
        
        canvasStore.addLogo(newLogo);
        showUploadModal = false;
      };
      
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Failed to process logo file:', error);
      uploadError = error instanceof Error ? error.message : 'Failed to process logo';
    }
  }

  function handlePositionChange(property: 'x' | 'y', value: number) {
    if (!selectedLogo) return;
    
    let newValue = value;
    
    // Snap to edges if enabled
    if (snapToEdges) {
      const snapThreshold = 10;
      const canvasWidth = $canvasStore?.width || 1200;
      const canvasHeight = $canvasStore?.height || 800;
      
      if (property === 'x') {
        if (Math.abs(newValue) < snapThreshold) newValue = 0;
        if (Math.abs(newValue - canvasWidth) < snapThreshold) newValue = canvasWidth;
      } else {
        if (Math.abs(newValue) < snapThreshold) newValue = 0;
        if (Math.abs(newValue - canvasHeight) < snapThreshold) newValue = canvasHeight;
      }
    }
    
    canvasStore.updateLogo(selectedLogo.id, { [property]: newValue });
  }

  function handleScaleChange(scale: number) {
    if (!selectedLogo) return;
    canvasStore.updateLogo(selectedLogo.id, { scale });
  }

  function handleOpacityChange(opacity: number) {
    if (!selectedLogo) return;
    canvasStore.updateLogo(selectedLogo.id, { opacity });
  }

  function handleRotationChange(rotation: number) {
    if (!selectedLogo) return;
    canvasStore.updateLogo(selectedLogo.id, { rotation });
  }

  function rotateLogo(degrees: number) {
    if (!selectedLogo) return;
    const newRotation = (selectedLogo.rotation + degrees) % 360;
    canvasStore.updateLogo(selectedLogo.id, { rotation: newRotation });
  }

  function handleBackgroundToggle(hasBackground: boolean) {
    if (!selectedLogo) return;
    canvasStore.updateLogo(selectedLogo.id, { 
      hasBackground,
      backgroundColor: selectedLogo.backgroundColor || '#ffffff',
      backgroundPadding: selectedLogo.backgroundPadding || 10,
      backgroundRadius: selectedLogo.backgroundRadius || 8
    });
  }

  function handleBackgroundColorChange(backgroundColor: string) {
    if (!selectedLogo) return;
    canvasStore.updateLogo(selectedLogo.id, { 
      backgroundColor,
      hasBackground: selectedLogo.hasBackground || false,
      backgroundPadding: selectedLogo.backgroundPadding || 10,
      backgroundRadius: selectedLogo.backgroundRadius || 8
    });
  }

  function handleBackgroundPaddingChange(backgroundPadding: number) {
    if (!selectedLogo) return;
    canvasStore.updateLogo(selectedLogo.id, { 
      backgroundPadding,
      hasBackground: selectedLogo.hasBackground || false,
      backgroundColor: selectedLogo.backgroundColor || '#ffffff',
      backgroundRadius: selectedLogo.backgroundRadius || 8
    });
  }

  function handleBackgroundRadiusChange(backgroundRadius: number) {
    if (!selectedLogo) return;
    canvasStore.updateLogo(selectedLogo.id, { 
      backgroundRadius,
      hasBackground: selectedLogo.hasBackground || false,
      backgroundColor: selectedLogo.backgroundColor || '#ffffff',
      backgroundPadding: selectedLogo.backgroundPadding || 10
    });
  }

  // Arrow management
  let selectedArrow: any = null;
  let isCreatingArrow = false;
  let arrowStartX = 0;
  let arrowStartY = 0;
  let currentMouseX = 0;
  let currentMouseY = 0;
  let isDraggingArrow = false;
  let dragOffset = { x: 0, y: 0 };

  $: arrows = $canvasStore.arrows;
  $: selectedElements = $canvasStore.selectedElements;

  // Sync arrow selection with canvas selection
  $: {
    const arrowSelection = selectedElements.find(el => el.type === 'arrow');
    if (arrowSelection) {
      const arrowId = parseInt(arrowSelection.elementId as string);
      const arrow = arrows.find(a => a.id === arrowId);
      if (arrow && selectedArrow?.id !== arrow.id) {
        selectedArrow = arrow;
      }
    } else if (selectedArrow) {
      // Clear selection if no arrow is selected on canvas
      selectedArrow = null;
    }
  }

  function startCreatingArrow() {
    // Create a simple test arrow first
    const testArrow = {
      name: `Test Arrow ${arrows.length + 1}`,
      startX: 100,
      startY: 100,
      endX: 300,
      endY: 200,
      color: '#ff0000',
      width: 6,
      visible: true
    };
    
    console.log('Creating test arrow:', testArrow);
    canvasStore.addArrow(testArrow);
    
    // Also start interactive creation
    isCreatingArrow = true;
    arrowStartX = 0;
    arrowStartY = 0;
    
    // Add event listeners to the canvas specifically
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('click', handleArrowClick);
      canvas.addEventListener('mousemove', handleArrowMouseMove);
      canvas.style.cursor = 'crosshair';
    }
  }

  function handleArrowClick(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    
    const canvas = event.target as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const zoom = $canvasStore.zoom / 100;
    
    // Convert screen coordinates to canvas coordinates
    const x = (event.clientX - rect.left) / zoom;
    const y = (event.clientY - rect.top) / zoom;
    
    if (!arrowStartX && !arrowStartY) {
      // First click - set start point
      arrowStartX = x;
      arrowStartY = y;
      console.log('Arrow start set:', arrowStartX, arrowStartY);
    } else {
      // Second click - create arrow
      const newArrow = {
        name: `Arrow ${arrows.length + 1}`,
        startX: arrowStartX,
        startY: arrowStartY,
        endX: x,
        endY: y,
        color: '#000000',
        width: 4,
        visible: true
      };
      
      console.log('Creating arrow:', newArrow);
      canvasStore.addArrow(newArrow);
      finishCreatingArrow();
    }
  }

  function handleArrowMouseMove(event: MouseEvent) {
    if (!isCreatingArrow) return;
    
    const canvas = event.target as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    const zoom = $canvasStore.zoom / 100;
    
    currentMouseX = (event.clientX - rect.left) / zoom;
    currentMouseY = (event.clientY - rect.top) / zoom;
    
    // Trigger canvas redraw to show preview
    if (arrowStartX && arrowStartY) {
      canvasStore.redrawCanvas();
      // Draw preview arrow
      canvasStore.drawArrowPreview(arrowStartX, arrowStartY, currentMouseX, currentMouseY);
    }
  }

  function finishCreatingArrow() {
    isCreatingArrow = false;
    arrowStartX = 0;
    arrowStartY = 0;
    
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.removeEventListener('click', handleArrowClick);
      canvas.removeEventListener('mousemove', handleArrowMouseMove);
      canvas.style.cursor = 'default';
    }
  }

  function selectArrow(arrow: any) {
    selectedArrow = selectedArrow?.id === arrow.id ? null : arrow;
    
    // Update canvas selection
    if (selectedArrow) {
      canvasStore.setSelectedElements([{
        id: `arrow-${arrow.id}`,
        type: 'arrow',
        elementId: arrow.id
      }]);
    } else {
      canvasStore.setSelectedElements([]);
    }
  }

  function removeArrow(arrowId: number) {
    if (confirm('Remove this arrow? This action cannot be undone.')) {
      canvasStore.removeArrow(arrowId);
      if (selectedArrow?.id === arrowId) {
        selectedArrow = null;
      }
    }
  }

  function toggleArrowVisibility(arrow: any) {
    canvasStore.updateArrow(arrow.id, { visible: !arrow.visible });
  }

  function handleArrowColorChange(color: string) {
    if (!selectedArrow) return;
    canvasStore.updateArrow(selectedArrow.id, { color });
  }

  function handleArrowWidthChange(width: number) {
    if (!selectedArrow) return;
    canvasStore.updateArrow(selectedArrow.id, { width });
  }

  function centerLogo() {
    if (!selectedLogo) return;
    
    const canvasWidth = $canvasStore?.width || 1200;
    const canvasHeight = $canvasStore?.height || 800;
    
    canvasStore.updateLogo(selectedLogo.id, {
      x: canvasWidth / 2,
      y: canvasHeight / 2
    });
  }

  function resetLogoTransform() {
    if (!selectedLogo) return;
    
    canvasStore.updateLogo(selectedLogo.id, {
      scale: 100,
      rotation: 0,
      opacity: 100
    });
  }

  // Preset positions
  const logoPresets = [
    { name: 'Top Left', x: 20, y: 20 },
    { name: 'Top Right', x: -20, y: 20, align: 'right' },
    { name: 'Bottom Left', x: 20, y: -20, align: 'bottom' },
    { name: 'Bottom Right', x: -20, y: -20, align: 'right bottom' },
    { name: 'Center', x: 0, y: 0, align: 'center' }
  ];

  function applyPresetPosition(preset: any) {
    if (!selectedLogo) return;
    
    const canvasWidth = $canvasStore?.width || 1200;
    const canvasHeight = $canvasStore?.height || 800;
    
    let x = preset.x;
    let y = preset.y;
    
    if (preset.align?.includes('right')) {
      x = canvasWidth + preset.x;
    } else if (preset.align?.includes('center')) {
      x = canvasWidth / 2;
    }
    
    if (preset.align?.includes('bottom')) {
      y = canvasHeight + preset.y;
    } else if (preset.align?.includes('center')) {
      y = canvasHeight / 2;
    }
    
    canvasStore.updateLogo(selectedLogo.id, { x, y });
  }

  function openLogoUpload() {
    logoInputElement?.click();
  }

  // Drag and drop handlers
  function handleDragEnter(event: DragEvent) {
    event.preventDefault();
    isDragging = true;
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    if (event.currentTarget === event.target) {
      isDragging = false;
    }
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
  }
</script>

<div class="sidebar-panel w-full h-full">
  <div class="space-y-4 lg:space-y-6 px-2 lg:px-0">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold text-gray-800 flex items-center">
        <div class="w-6 h-6 mr-2 bg-gradient-to-br from-earth-400 to-earth-500 rounded-lg flex items-center justify-center">
          <span class="text-white text-xs font-bold">L</span>
        </div>
        Logo Overlay
      </h3>
      
      <button 
        class="btn-secondary text-sm py-2 px-3"
        on:click={() => showUploadModal = true}
      >
        <Plus class="w-4 h-4 mr-1" />
        Add Logo
      </button>
    </div>

    <!-- Logo List -->
    <div 
      class="space-y-3 max-h-96 overflow-y-auto"
      class:border-2={isDragging}
      class:border-dashed={isDragging}
      class:border-primary-400={isDragging}
      class:bg-primary-50={isDragging}
      on:dragenter={handleDragEnter}
      on:dragleave={handleDragLeave}
      on:dragover={handleDragOver}
      on:drop={handleLogoDrop}
    >
      {#each logos as logo (logo.id)}
        <div 
          class="border rounded-xl p-4 transition-all duration-200 cursor-pointer {selectedLogo?.id === logo.id ? 'border-primary-300 bg-primary-50' : 'border-gray-200 hover:border-gray-300 bg-white'}"
          on:click={() => selectLogo(logo)}
        >
          <div class="flex items-center space-x-3">
            <!-- Logo Preview -->
            <div class="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative">
              {#if logo.src}
                <img 
                  src={logo.src} 
                  alt={logo.name}
                  class="w-full h-full object-contain"
                  style="opacity: {logo.opacity / 100}; transform: scale({logo.scale / 100}) rotate({logo.rotation}deg)"
                />
              {:else}
                <div class="w-full h-full flex items-center justify-center text-gray-400">
                  <Upload class="w-6 h-6" />
                </div>
              {/if}
              
              {#if !logo.visible}
                <div class="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <EyeOff class="w-4 h-4 text-white" />
                </div>
              {/if}
            </div>
            
            <!-- Logo Info -->
            <div class="flex-1 min-w-0">
              <h4 class="font-medium text-gray-800 truncate">{logo.name}</h4>
              <p class="text-sm text-gray-500">
                Scale: {logo.scale}% • Opacity: {logo.opacity}%
              </p>
              <p class="text-xs text-gray-400">
                Position: {Math.round(logo.x)}, {Math.round(logo.y)}
                {#if logo.rotation !== 0}
                  • Rotation: {logo.rotation}°
                {/if}
              </p>
            </div>
            
            <!-- Controls -->
            <div class="flex items-center space-x-1">
              <button 
                class="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                on:click|stopPropagation={() => toggleLogoVisibility(logo)}
                title={logo.visible ? 'Hide Logo' : 'Show Logo'}
              >
                {#if logo.visible}
                  <Eye class="w-4 h-4 text-gray-600" />
                {:else}
                  <EyeOff class="w-4 h-4 text-gray-400" />
                {/if}
              </button>
              
              <button 
                class="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                on:click|stopPropagation={() => duplicateLogo(logo)}
                title="Duplicate Logo"
              >
                <Plus class="w-4 h-4 text-gray-600" />
              </button>
              
              <button 
                class="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                on:click|stopPropagation={() => removeLogo(logo.id)}
                title="Remove Logo"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      {/each}
      
      {#if logos.length === 0}
        <div class="text-center py-8 text-gray-500 {isDragging ? 'text-primary-600' : ''}">
          <div class="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center {isDragging ? 'bg-primary-100' : ''}">
            <Upload class="w-8 h-8 text-gray-400 {isDragging ? 'text-primary-500' : ''}" />
          </div>
          <p>{isDragging ? 'Drop logo here!' : 'No logos added yet'}</p>
          <p class="text-sm">{isDragging ? 'Release to upload' : 'Click "Add Logo" or drag & drop'}</p>
        </div>
      {/if}
    </div>

    <!-- Selected Logo Controls -->
    {#if selectedLogo}
      <div class="border-t border-gray-200 pt-6 space-y-4">
        <div class="flex items-center justify-between">
          <h4 class="font-medium text-gray-700 flex items-center">
            <Move class="w-4 h-4 mr-2" />
            Adjust "{selectedLogo.name}"
          </h4>
          <button 
            class="text-xs text-gray-500 hover:text-gray-700"
            on:click={() => selectedLogo = null}
          >
            <X class="w-4 h-4" />
          </button>
        </div>
        
        <!-- Position Controls -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 lg:gap-3">
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-1">X Position</label>
            <input 
              type="number" 
              value={Math.round(selectedLogo.x)}
              on:input={(e) => handlePositionChange('x', parseInt(e.target.value) || 0)}
              min="0" 
              max={$canvasStore?.width || 1200}
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-1">Y Position</label>
            <input 
              type="number" 
              value={Math.round(selectedLogo.y)}
              on:input={(e) => handlePositionChange('y', parseInt(e.target.value) || 0)}
              min="0" 
              max={$canvasStore?.height || 800}
              class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>

        <!-- Quick Position Presets -->
        <div>
          <label class="block text-sm font-medium text-gray-600 mb-2">Quick Positions</label>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-1 text-xs">
            {#each logoPresets as preset}
              <button 
                class="p-2 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                on:click={() => applyPresetPosition(preset)}
              >
                {preset.name}
              </button>
            {/each}
          </div>
        </div>
        
        <!-- Scale Slider -->
        <div>
          <label class="block text-sm font-medium text-gray-600 mb-2">
            Scale: {selectedLogo.scale}%
          </label>
          <input 
            type="range" 
            min="10" 
            max="200" 
            value={selectedLogo.scale}
            on:input={(e) => handleScaleChange(parseInt(e.target.value))}
            class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
          <div class="flex justify-between text-xs text-gray-400 mt-1">
            <span>10%</span>
            <span>200%</span>
          </div>
        </div>
        
        <!-- Opacity Slider -->
        <div>
          <label class="block text-sm font-medium text-gray-600 mb-2">
            Opacity: {selectedLogo.opacity}%
          </label>
          <input 
            type="range" 
            min="10" 
            max="100" 
            value={selectedLogo.opacity}
            on:input={(e) => handleOpacityChange(parseInt(e.target.value))}
            class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
          <div class="flex justify-between text-xs text-gray-400 mt-1">
            <span>10%</span>
            <span>100%</span>
          </div>
        </div>

        <!-- Rotation Controls -->
        <div>
          <label class="block text-sm font-medium text-gray-600 mb-2">
            Rotation: {selectedLogo.rotation}°
          </label>
          <input 
            type="range" 
            min="0" 
            max="360" 
            value={selectedLogo.rotation}
            on:input={(e) => handleRotationChange(parseInt(e.target.value))}
            class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
          <div class="flex justify-between text-xs text-gray-400 mt-1">
            <span>0°</span>
            <span>360°</span>
          </div>
        </div>
        
        <!-- Background Controls -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-gray-600">Background</label>
            <!-- Toggle Switch -->
            <label class="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={selectedLogo.hasBackground || false}
                on:change={(e) => handleBackgroundToggle(e.target.checked)}
                class="sr-only peer"
              />
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
          
          {#if selectedLogo.hasBackground}
            <div class="space-y-3 pl-4 border-l-2 border-gray-200">
              <!-- Popular Color Presets -->
              <div>
                <label class="block text-sm font-medium text-gray-600 mb-2">Popular Colors</label>
                <div class="grid grid-cols-4 gap-2 mb-3">
                  {#each [
                    { color: '#ffffff', name: 'White' },
                    { color: '#000000', name: 'Black' },
                    { color: '#1f2937', name: 'Dark Gray' },
                    { color: '#065f46', name: 'Dark Green' },
                    { color: '#1e40af', name: 'Blue' },
                    { color: '#dc2626', name: 'Red' },
                    { color: '#d97706', name: 'Orange' },
                    { color: '#7c3aed', name: 'Purple' }
                  ] as preset}
                    <button
                      class="flex flex-col items-center p-2 rounded-lg border-2 transition-all hover:scale-105 {(selectedLogo.backgroundColor || '#ffffff') === preset.color ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'}"
                      on:click={() => handleBackgroundColorChange(preset.color)}
                      title="Set background to {preset.name}"
                    >
                      <div 
                        class="w-6 h-6 rounded-full border border-gray-300 mb-1"
                        style="background-color: {preset.color}"
                      ></div>
                      <span class="text-xs text-gray-600 text-center leading-tight">{preset.name}</span>
                    </button>
                  {/each}
                </div>
              </div>
              
              <!-- Custom Color Picker -->
              <div>
                <label class="block text-sm font-medium text-gray-600 mb-2">Custom Color</label>
                <div class="flex space-x-2">
                  <input 
                    type="color" 
                    value={selectedLogo.backgroundColor || '#ffffff'}
                    on:input={(e) => handleBackgroundColorChange(e.target.value)}
                    class="w-12 h-8 rounded border border-gray-200 cursor-pointer"
                  />
                  <input 
                    type="text" 
                    value={selectedLogo.backgroundColor || '#ffffff'}
                    on:input={(e) => handleBackgroundColorChange(e.target.value)}
                    placeholder="#ffffff"
                    class="flex-1 px-3 py-1 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-600 mb-2">
                  Padding: {selectedLogo.backgroundPadding || 10}px
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="50" 
                  value={selectedLogo.backgroundPadding || 10}
                  on:input={(e) => handleBackgroundPaddingChange(parseInt(e.target.value))}
                  class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div class="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0px</span>
                  <span>50px</span>
                </div>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-600 mb-2">
                  Corner Radius: {selectedLogo.backgroundRadius || 8}px
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="30" 
                  value={selectedLogo.backgroundRadius || 8}
                  on:input={(e) => handleBackgroundRadiusChange(parseInt(e.target.value))}
                  class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div class="flex justify-between text-xs text-gray-400 mt-1">
                  <span>0px (Square)</span>
                  <span>30px (Rounded)</span>
                </div>
              </div>
            </div>
          {/if}
        </div>

    <!-- Arrows Section -->
    <div class="border-t border-gray-200 pt-6">
      <div class="flex items-center justify-between mb-4">
        <h4 class="font-medium text-gray-700 flex items-center">
          <div class="w-4 h-4 mr-2 bg-gradient-to-br from-red-400 to-red-500 rounded-sm flex items-center justify-center">
            <span class="text-white text-xs">→</span>
          </div>
          Arrows
        </h4>
        <div class="flex space-x-2">
          <button 
            class="btn-secondary text-sm py-2 px-3"
            on:click={() => {
              const simpleArrow = {
                name: `Simple Arrow ${arrows.length + 1}`,
                startX: 50 + (arrows.length * 20),
                startY: 50 + (arrows.length * 20),
                endX: 200 + (arrows.length * 20),
                endY: 150 + (arrows.length * 20),
                color: '#000000',
                width: 4,
                visible: true
              };
              canvasStore.addArrow(simpleArrow);
            }}
          >
            + Quick Arrow
          </button>
          <button 
            class="btn-secondary text-sm py-2 px-3 {isCreatingArrow ? 'bg-primary-100 border-primary-300' : ''}"
            on:click={isCreatingArrow ? finishCreatingArrow : startCreatingArrow}
          >
            {isCreatingArrow ? 'Cancel' : 'Draw Arrow'}
          </button>
        </div>
      </div>

      {#if isCreatingArrow}
        <div class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p class="text-sm text-blue-700 font-medium mb-1">Creating Arrow</p>
          <p class="text-xs text-blue-600">Click once to set start point, then click again to set end point.</p>
        </div>
      {/if}

      <!-- Arrow List -->
      <div class="space-y-2 max-h-48 overflow-y-auto">
        {#each arrows as arrow (arrow.id)}
          <div 
            class="border rounded-lg p-3 transition-all duration-200 cursor-pointer {selectedArrow?.id === arrow.id ? 'border-primary-300 bg-primary-50' : 'border-gray-200 hover:border-gray-300 bg-white'}"
            on:click={() => selectArrow(arrow)}
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3">
                <div 
                  class="w-6 h-6 rounded border-2 flex items-center justify-center text-xs font-bold"
                  style="background-color: {arrow.color}; color: {arrow.color === '#ffffff' ? '#000' : '#fff'}"
                >
                  →
                </div>
                <span class="text-sm font-medium text-gray-700">{arrow.name}</span>
              </div>
              
              <div class="flex items-center space-x-2">
                <button 
                  class="text-gray-400 hover:text-gray-600 transition-colors"
                  on:click|stopPropagation={() => toggleArrowVisibility(arrow)}
                  title={arrow.visible ? 'Hide arrow' : 'Show arrow'}
                >
                  {#if arrow.visible}
                    <Eye class="w-4 h-4" />
                  {:else}
                    <EyeOff class="w-4 h-4" />
                  {/if}
                </button>
                <button 
                  class="text-red-400 hover:text-red-600 transition-colors"
                  on:click|stopPropagation={() => removeArrow(arrow.id)}
                  title="Remove arrow"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        {/each}
        
        {#if arrows.length === 0}
          <div class="text-center py-8 text-gray-500">
            <div class="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
              <span class="text-gray-400 text-xl">→</span>
            </div>
            <p class="text-sm">No arrows yet</p>
            <p class="text-xs">Click "Add Arrow" to create your first arrow</p>
          </div>
        {/if}
      </div>

      <!-- Arrow Properties -->
      {#if selectedArrow}
        <div class="border-t border-gray-200 pt-4 mt-4 space-y-4">
          <h5 class="font-medium text-gray-700">Arrow Properties</h5>
          
          <!-- Color -->
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-2">Color</label>
            <div class="flex space-x-2">
              <input 
                type="color" 
                value={selectedArrow.color}
                on:input={(e) => handleArrowColorChange(e.target.value)}
                class="w-12 h-8 rounded border border-gray-200 cursor-pointer"
              />
              <div class="flex space-x-1">
                {#each ['#000000', '#ffffff', '#dc2626', '#1e40af', '#065f46', '#d97706', '#7c3aed', '#f59e0b'] as color}
                  <button
                    class="w-6 h-6 rounded border-2 {selectedArrow.color === color ? 'border-primary-500' : 'border-gray-200'} transition-all hover:scale-110"
                    style="background-color: {color}"
                    on:click={() => handleArrowColorChange(color)}
                    title="Set arrow color"
                  ></button>
                {/each}
              </div>
            </div>
          </div>
          
          <!-- Width -->
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-2">
              Width: {selectedArrow.width}px
            </label>
            <input 
              type="range" 
              min="1" 
              max="12" 
              value={selectedArrow.width}
              on:input={(e) => handleArrowWidthChange(parseInt(e.target.value))}
              class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div class="flex justify-between text-xs text-gray-400 mt-1">
              <span>1px</span>
              <span>12px</span>
            </div>
          </div>

          <!-- Length Control -->
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-2">
              Length: {Math.round(Math.sqrt(Math.pow(selectedArrow.endX - selectedArrow.startX, 2) + Math.pow(selectedArrow.endY - selectedArrow.startY, 2)))}px
            </label>
            <input 
              type="range" 
              min="50" 
              max="300" 
              value={Math.sqrt(Math.pow(selectedArrow.endX - selectedArrow.startX, 2) + Math.pow(selectedArrow.endY - selectedArrow.startY, 2))}
              on:input={(e) => {
                const newLength = parseInt(e.target.value);
                const currentAngle = Math.atan2(selectedArrow.endY - selectedArrow.startY, selectedArrow.endX - selectedArrow.startX);
                const newEndX = selectedArrow.startX + Math.cos(currentAngle) * newLength;
                const newEndY = selectedArrow.startY + Math.sin(currentAngle) * newLength;
                canvasStore.updateArrow(selectedArrow.id, { endX: newEndX, endY: newEndY });
              }}
              class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div class="flex justify-between text-xs text-gray-400 mt-1">
              <span>50px</span>
              <span>300px</span>
            </div>
          </div>

          <!-- Rotation Control -->
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-2">
              Rotation: {Math.round(Math.atan2(selectedArrow.endY - selectedArrow.startY, selectedArrow.endX - selectedArrow.startX) * 180 / Math.PI)}°
            </label>
            <input 
              type="range" 
              min="-180" 
              max="180" 
              value={Math.atan2(selectedArrow.endY - selectedArrow.startY, selectedArrow.endX - selectedArrow.startX) * 180 / Math.PI}
              on:input={(e) => {
                const newAngle = parseInt(e.target.value) * Math.PI / 180;
                const currentLength = Math.sqrt(Math.pow(selectedArrow.endX - selectedArrow.startX, 2) + Math.pow(selectedArrow.endY - selectedArrow.startY, 2));
                const newEndX = selectedArrow.startX + Math.cos(newAngle) * currentLength;
                const newEndY = selectedArrow.startY + Math.sin(newAngle) * currentLength;
                canvasStore.updateArrow(selectedArrow.id, { endX: newEndX, endY: newEndY });
              }}
              class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div class="flex justify-between text-xs text-gray-400 mt-1">
              <span>-180°</span>
              <span>180°</span>
            </div>
          </div>

          <!-- Position Controls -->
        <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="block text-sm font-medium text-gray-600 mb-1">Start X</label>
              <input 
                type="number" 
                value={Math.round(selectedArrow.startX)}
                on:input={(e) => canvasStore.updateArrow(selectedArrow.id, { startX: parseInt(e.target.value) || 0 })}
                class="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-600 mb-1">Start Y</label>
              <input 
                type="number" 
                value={Math.round(selectedArrow.startY)}
                on:input={(e) => canvasStore.updateArrow(selectedArrow.id, { startY: parseInt(e.target.value) || 0 })}
                class="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </div>
      {/if}
    </div>
        
        <!-- Quick Actions -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button 
            class="btn-secondary text-sm py-2 flex items-center justify-center space-x-1"
            on:click={() => rotateLogo(90)}
          >
            <RotateCw class="w-4 h-4" />
            <span>Rotate 90°</span>
          </button>
          <button 
            class="btn-secondary text-sm py-2 flex items-center justify-center space-x-1"
            on:click={centerLogo}
          >
            <Move class="w-4 h-4" />
            <span>Center</span>
          </button>
          <button 
            class="btn-secondary text-sm py-2 flex items-center justify-center space-x-1 col-span-2"
            on:click={resetLogoTransform}
          >
            <RotateCw class="w-4 h-4" />
            <span>Reset Transform</span>
          </button>
        </div>
      </div>
    {/if}

    <!-- Settings -->
    <div class="border-t border-gray-200 pt-4">
      <h4 class="text-sm font-medium text-gray-700 mb-3">Logo Settings</h4>
      <div class="space-y-2">
        <label class="flex items-center justify-between text-sm">
          <span class="text-gray-600">Snap to Edges</span>
          <input 
            type="checkbox" 
            checked={snapToEdges}
            on:change={(e) => settingsStore.updateSetting('logoSnapToEdges', e.target.checked)}
            class="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500 focus:ring-2"
          />
        </label>
      </div>
    </div>
  </div>
</div>

<!-- Upload Modal -->
{#if showUploadModal}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-2xl p-6 w-96 mx-4">
      <h3 class="text-lg font-semibold text-gray-800 mb-4">Add New Logo</h3>
      
      <div 
        class="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center transition-colors {isDragging ? 'border-primary-400 bg-primary-50' : ''}"
        on:dragenter={handleDragEnter}
        on:dragleave={handleDragLeave}
        on:dragover={handleDragOver}
        on:drop={handleLogoDrop}
      >
        <Upload class="w-12 h-12 mx-auto mb-4 text-gray-400 {isDragging ? 'text-primary-500' : ''}" />
        <p class="text-gray-600 mb-4">
          {isDragging ? 'Drop your logo here!' : 'Drop your logo file here or click to browse'}
        </p>
        
        {#if uploadError}
          <div class="mb-4 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            {uploadError}
          </div>
        {/if}
        
        <button 
          class="btn-primary"
          on:click={openLogoUpload}
        >
          Choose File
        </button>
      </div>
      
      <div class="flex justify-end space-x-2 mt-4">
        <button 
          class="btn-secondary"
          on:click={() => showUploadModal = false}
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Hidden file input -->
<input 
  bind:this={logoInputElement}
  type="file" 
  accept="image/*" 
  class="hidden"
  on:change={handleLogoUpload}
/>

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

  .toggle-small {
    @apply w-8 h-4 bg-gray-200 rounded-full relative cursor-pointer transition-colors;
    -webkit-appearance: none;
    appearance: none;
  }

  .toggle-small:checked {
    @apply bg-primary-500;
  }

  .toggle-small::after {
    content: '';
    @apply absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform;
  }

  .toggle-small:checked::after {
    transform: translateX(1rem);
  }
</style> 
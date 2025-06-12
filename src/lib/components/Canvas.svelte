<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Image, ZoomIn, ZoomOut, RotateCw, Maximize2, Upload } from 'lucide-svelte';
  import { canvasStore } from '../stores/canvas';
  import { settingsStore } from '../stores/settings';
  import { validateImageFile, processImageFile, setupDragAndDrop, formatFileSize } from '../utils/fileUtils';

  let canvasElement: HTMLCanvasElement;
  let containerElement: HTMLDivElement;
  let fileInputElement: HTMLInputElement;
  let dragCleanup: (() => void) | null = null;
  let isDragging = false;
  let uploadError = '';
  let isProcessing = false;

  // Add text input related variables
  let textInputElement: HTMLInputElement;

  // Reactive variables instead of destructuring
  $: zoom = $canvasStore.zoom;
  $: imageLoaded = $canvasStore.imageLoaded;
  $: width = $canvasStore.width;
  $: height = $canvasStore.height;
  $: memoryUsage = $canvasStore.memoryUsage;
  $: activeTool = $canvasStore.activeTool;
  $: isDrawing = $canvasStore.isDrawing;
  $: gridVisible = $settingsStore.gridVisible;
  $: textInput = $canvasStore.textInput;

  onMount(() => {
    if (canvasElement) {
      canvasStore.init(canvasElement);
      setupCanvasEvents();
      
      // Setup drag and drop
      if (containerElement) {
        dragCleanup = setupDragAndDrop(
          containerElement,
          handleFilesDrop,
          (dragging) => isDragging = dragging
        );
      }
      
      // Update memory usage periodically
      const memoryInterval = setInterval(() => {
        canvasStore.updateMemoryUsage();
      }, 5000);
      
      return () => {
        clearInterval(memoryInterval);
        if (dragCleanup) dragCleanup();
      };
    }
  });
  
  onDestroy(() => {
    if (dragCleanup) dragCleanup();
  });

  function setupCanvasEvents() {
    if (!canvasElement) return;

    let isMouseDown = false;
    let lastX = 0;
    let lastY = 0;

    const getCanvasCoordinates = (e: MouseEvent | TouchEvent): { x: number; y: number } => {
      const rect = canvasElement.getBoundingClientRect();
      const scaleX = canvasElement.width / rect.width;
      const scaleY = canvasElement.height / rect.height;
      
      let clientX: number, clientY: number;
      
      if (e instanceof MouseEvent) {
        clientX = e.clientX;
        clientY = e.clientY;
      } else {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }
      
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    };

    // Mouse events
    canvasElement.addEventListener('mousedown', (e) => {
      if (!imageLoaded) return;
      
      isMouseDown = true;
      const coords = getCanvasCoordinates(e);
      lastX = coords.x;
      lastY = coords.y;
      
      if (activeTool === 'text') {
        canvasStore.startTextInput(coords.x, coords.y);
        // Focus the text input after a short delay to ensure it's rendered
        setTimeout(() => {
          if (textInputElement) {
            textInputElement.focus();
          }
        }, 10);
      } else if (activeTool === 'move') {
        console.log('Move tool click at:', coords.x, coords.y);
        console.log('Canvas rect:', canvasElement.getBoundingClientRect());
        console.log('Canvas dimensions:', canvasElement.width, canvasElement.height);
        console.log('Mouse event:', e.clientX, e.clientY);
        
        // Check for resize handles first
        const resizeHandle = canvasStore.findResizeHandleAt(coords.x, coords.y);
        if (resizeHandle) {
          console.log('Resize handle clicked:', resizeHandle);
          canvasStore.startResize(resizeHandle, coords.x, coords.y);
          e.preventDefault();
          return;
        }
        
        // Check for arrow selection
        const clickedArrow = canvasStore.findArrowAt(coords.x, coords.y);
        if (clickedArrow) {
          console.log('Arrow clicked:', clickedArrow);
          canvasStore.setSelectedElements([{
            id: `arrow-${clickedArrow.id}`,
            type: 'arrow',
            elementId: clickedArrow.id.toString()
          }]);
          e.preventDefault();
          return;
        }
        
        console.log('No arrow clicked, proceeding with normal drawing');
        canvasStore.startDrawing(coords.x, coords.y);
      } else {
        canvasStore.startDrawing(coords.x, coords.y);
      }
      e.preventDefault();
    });

    canvasElement.addEventListener('mousemove', (e) => {
      if (!imageLoaded) return;
      
      const coords = getCanvasCoordinates(e);
      
      if (isMouseDown) {
        if (activeTool === 'move') {
          // Check if we're resizing
          if ($canvasStore.isResizing) {
            canvasStore.performResize(coords.x, coords.y);
          } else {
            // Check if we're dragging an arrow
            const selectedElements = $canvasStore.selectedElements;
            const arrowSelection = selectedElements.find(el => el.type === 'arrow');
            if (arrowSelection) {
              const deltaX = coords.x - lastX;
              const deltaY = coords.y - lastY;
              const arrowId = parseInt(arrowSelection.elementId as string);
              const arrow = $canvasStore.arrows.find(a => a.id === arrowId);
              if (arrow) {
                canvasStore.updateArrow(arrowId, {
                  startX: arrow.startX + deltaX,
                  startY: arrow.startY + deltaY,
                  endX: arrow.endX + deltaX,
                  endY: arrow.endY + deltaY
                });
              }
            } else {
              canvasStore.draw(coords.x, coords.y);
            }
          }
        } else {
          canvasStore.draw(coords.x, coords.y);
        }
      } else if (activeTool === 'pen') {
        // Show preview for pen tool even when not drawing
        canvasStore.draw(coords.x, coords.y);
      } else if (activeTool === 'move') {
        // Check for resize handles and update cursor
        updateCursorForResizeHandles(coords.x, coords.y);
        
        // Update cursor for arrows
        const arrow = canvasStore.findArrowAt(coords.x, coords.y);
        if (arrow) {
          canvasElement.style.cursor = 'move';
        } else if (canvasElement.style.cursor === 'move') {
          canvasElement.style.cursor = 'default';
        }
      }
      
      lastX = coords.x;
      lastY = coords.y;
      e.preventDefault();
    });

    canvasElement.addEventListener('mouseup', (e) => {
      if (isMouseDown) {
        isMouseDown = false;
        
        // Stop resizing if we were resizing
        if ($canvasStore.isResizing) {
          canvasStore.stopResize();
        }
        
        // For shape tools, pass the final coordinates
        if ((activeTool === 'square' || activeTool === 'circle') && imageLoaded) {
          const coords = getCanvasCoordinates(e);
          canvasStore.finishShape(coords.x, coords.y);
        }
        
        canvasStore.stopDrawing();
      }
    });

    canvasElement.addEventListener('mouseleave', () => {
      if (isMouseDown) {
        isMouseDown = false;
        
        // Stop resizing if we were resizing
        if ($canvasStore.isResizing) {
          canvasStore.stopResize();
        }
        
        canvasStore.stopDrawing();
      }
      // Clear pen tool preview when mouse leaves canvas
      if (activeTool === 'pen') {
        canvasStore.clearPreview();
      }
    });

    // Touch events for mobile
    canvasElement.addEventListener('touchstart', (e) => {
      if (!imageLoaded || e.touches.length !== 1) return;
      
      isMouseDown = true;
      const coords = getCanvasCoordinates(e);
      lastX = coords.x;
      lastY = coords.y;
      
      canvasStore.startDrawing(coords.x, coords.y);
      e.preventDefault();
    }, { passive: false });

    canvasElement.addEventListener('touchmove', (e) => {
      if (!imageLoaded || e.touches.length !== 1) return;
      
      const coords = getCanvasCoordinates(e);
      
      if (isMouseDown) {
        canvasStore.draw(coords.x, coords.y);
      } else if (activeTool === 'pen') {
        // Show preview for pen tool even when not touching
        canvasStore.draw(coords.x, coords.y);
      }
      
      lastX = coords.x;
      lastY = coords.y;
      e.preventDefault();
    }, { passive: false });

    canvasElement.addEventListener('touchend', (e) => {
      if (isMouseDown) {
        isMouseDown = false;
        
        // For shape tools, pass the final coordinates
        if ((activeTool === 'square' || activeTool === 'circle') && imageLoaded && e.changedTouches.length > 0) {
          const touch = e.changedTouches[0];
          const coords = getCanvasCoordinates(touch as any);
          canvasStore.finishShape(coords.x, coords.y);
        }
        
        canvasStore.stopDrawing();
      }
    });
  }

  function handleZoomIn() {
    canvasStore.zoomIn();
  }

  function handleZoomOut() {
    canvasStore.zoomOut();
  }

  function handleRotate() {
    // TODO: Implement rotation
    console.log('Rotate functionality to be implemented');
  }

  function handleFitToWindow() {
    canvasStore.setZoom(100);
  }

  function updateCursorForResizeHandles(x: number, y: number) {
    if (!canvasElement) return;
    
    // Check for resize handles using the exposed function
    const resizeHandle = canvasStore.findResizeHandleAt(x, y);
    if (resizeHandle) {
      // Set appropriate cursor based on handle type and position
      if (resizeHandle.elementType === 'arrow') {
        if (resizeHandle.position === 'start' || resizeHandle.position === 'end') {
          canvasElement.style.cursor = 'crosshair';
        }
      } else if (resizeHandle.type === 'corner') {
        switch (resizeHandle.position) {
          case 'nw':
          case 'se':
            canvasElement.style.cursor = 'nw-resize';
            break;
          case 'ne':
          case 'sw':
            canvasElement.style.cursor = 'ne-resize';
            break;
        }
      } else if (resizeHandle.type === 'rotation') {
        canvasElement.style.cursor = 'crosshair';
      }
      return;
    }
    
    // Default cursor
    canvasElement.style.cursor = 'default';
  }

  async function handleFileUpload(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    await processFile(file);
  }

  async function handleFilesDrop(files: FileList) {
    const file = files[0];
    if (!file) return;

    await processFile(file);
  }

  async function processFile(file: File) {
    uploadError = '';
    isProcessing = true;

    try {
      // Validate file
      const validation = validateImageFile(file);
      if (!validation.valid) {
        uploadError = validation.error || 'Invalid file';
        return;
      }

      // Process image while preserving original size for high-resolution photos
      const result = await processImageFile(file, {
        quality: 0.95,
        format: 'png',
        preserveOriginalSize: true
      });

      // Load into canvas
      await canvasStore.loadImage(result.processedFile);
      
      // Add to recent files
      settingsStore.addRecentFile({
        name: file.name,
        size: file.size,
        // thumbnail: await createThumbnail(file)
      });

    } catch (error) {
      console.error('Failed to process file:', error);
      uploadError = error instanceof Error ? error.message : 'Failed to process image';
    } finally {
      isProcessing = false;
    }
  }

  function triggerFileUpload() {
    fileInputElement?.click();
  }

  function getCursorStyle() {
    if (!imageLoaded) return 'default';
    
    switch (activeTool) {
      case 'pen':
        return 'crosshair';
      case 'move':
        return isDrawing ? 'grabbing' : 'grab';
      case 'text':
        return 'text';
      default:
        return 'crosshair';
    }
  }

  function handleTextInputKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      canvasStore.finishTextInput();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      canvasStore.cancelTextInput();
    }
  }

  function handleTextInputChange(e: Event) {
    const target = e.target as HTMLInputElement;
    canvasStore.updateTextInput(target.value);
  }

  function handleTextInputBlur() {
    // Finish text input when clicking outside
    canvasStore.finishTextInput();
  }

  function handleKeydown(e: KeyboardEvent) {
    const state = $canvasStore;
    
    if (state.textInput?.isActive) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        canvasStore.finishTextInput();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        canvasStore.cancelTextInput();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        canvasStore.updateTextInput(state.textInput.text.slice(0, -1));
      } else if (e.key.length === 1) {
        e.preventDefault();
        canvasStore.updateTextInput(state.textInput.text + e.key);
      }
    } else {
      // Handle global shortcuts when not editing text
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        canvasStore.deleteSelectedElements();
      } else if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        canvasStore.duplicateSelectedElements();
      }
    }
  }

  function redrawCanvas() {
    // Implement the logic to redraw the canvas
    console.log('Redrawing canvas');
  }
</script>

<div class="flex-1 flex flex-col" bind:this={containerElement}>
  <!-- Canvas Controls -->
  <div class="floating-panel mb-4 flex items-center justify-between">
    <div class="flex items-center space-x-4">
      <span class="text-sm font-medium text-gray-700">Zoom: {zoom}%</span>
      <div class="flex items-center space-x-2">
        <button 
          class="tool-button group" 
          on:click={handleZoomOut}
          disabled={zoom <= 25}
          title="Zoom Out"
        >
          <ZoomOut class="w-4 h-4" />
        </button>
        <button 
          class="tool-button group" 
          on:click={handleZoomIn}
          disabled={zoom >= 200}
          title="Zoom In"
        >
          <ZoomIn class="w-4 h-4" />
        </button>
        <button 
          class="tool-button group"
          on:click={handleRotate}
          title="Rotate (Coming Soon)"
        >
          <RotateCw class="w-4 h-4" />
        </button>
        <button 
          class="tool-button group"
          on:click={handleFitToWindow}
          title="Fit to Window"
        >
          <Maximize2 class="w-4 h-4" />
        </button>
      </div>
    </div>
    
    <div class="flex items-center space-x-4 text-sm text-gray-500">
      <span>Canvas: {width} × {height}px</span>
      {#if memoryUsage > 0}
        <span>Memory: {memoryUsage}MB</span>
      {/if}
    </div>
  </div>

  <!-- Main Canvas Area -->
  <div 
    class="canvas-container flex-1 relative overflow-hidden {isDragging ? 'drag-over' : ''}" 
    style="transform: scale({zoom / 100}); transform-origin: center;"
  >
    <canvas
      bind:this={canvasElement}
      width={width}
      height={height}
      class="block w-full h-full object-contain"
      style="cursor: {getCursorStyle()}"
    ></canvas>
    
    <!-- Text Input Overlay -->
    {#if textInput && textInput.isActive}
      <div 
        class="absolute pointer-events-none"
        style="
          left: {textInput.x}px;
          top: {textInput.y}px;
          z-index: 10;
        "
      >
        <input
          bind:this={textInputElement}
          type="text"
          value={textInput.text}
          placeholder="Type here..."
          class="pointer-events-auto bg-white border-2 border-blue-500 rounded px-2 py-1 text-black shadow-lg min-w-32 focus:outline-none focus:ring-2 focus:ring-blue-300"
          style="
            font-size: {$canvasStore.fontSize}px;
            font-family: {$canvasStore.fontFamily};
            color: {$canvasStore.textColor};
            background-color: {$canvasStore.textBackground ? $canvasStore.textBackgroundColor : 'white'};
          "
          on:input={handleTextInputChange}
          on:keydown={handleTextInputKeydown}
          on:blur={handleTextInputBlur}
          autocomplete="off"
        />
      </div>
    {/if}
    
    <!-- Upload Overlay (when no image is loaded) -->
    {#if !imageLoaded}
      <div class="absolute inset-0 flex items-center justify-center bg-gray-50/80 backdrop-blur-sm {isDragging ? 'border-2 border-dashed border-primary-400 bg-primary-50/80' : ''}">
        <div class="text-center p-8">
          {#if isProcessing}
            <div class="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-primary-100 to-forest-100 rounded-full flex items-center justify-center">
              <div class="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full"></div>
            </div>
            <h3 class="text-xl font-semibold text-gray-800 mb-2">Processing Image...</h3>
            <p class="text-gray-600">Please wait while we optimize your photo</p>
          {:else}
            <div class="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-primary-100 to-forest-100 rounded-full flex items-center justify-center animate-bounce-soft">
              {#if isDragging}
                <Upload class="w-12 h-12 text-primary-500" />
              {:else}
                <Image class="w-12 h-12 text-primary-500" />
              {/if}
            </div>
            
            <h3 class="text-xl font-semibold text-gray-800 mb-2">
              {isDragging ? 'Drop Your Photo Here!' : 'Upload Your Property Photo'}
            </h3>
            <p class="text-gray-600 mb-6 max-w-md">
              {isDragging 
                ? 'Release to upload your real estate photo' 
                : 'Drop your real estate photo here or click to browse. Supported formats: JPG, PNG, WebP, HEIC, TIFF'}
            </p>
            
                         {#if uploadError}
               <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
                 <span class="text-sm">{uploadError}</span>
               </div>
             {/if}
            
            <button 
              class="btn-primary cursor-pointer inline-flex items-center space-x-2"
              on:click={triggerFileUpload}
              disabled={isProcessing}
            >
              <Image class="w-4 h-4" />
              <span>Choose Photo</span>
            </button>
          {/if}
        </div>
      </div>
    {/if}
    
    <!-- Grid Overlay -->
    {#if gridVisible && imageLoaded}
      <div class="absolute inset-0 pointer-events-none opacity-20">
        <svg class="w-full h-full">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#94a3b8" stroke-width="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
    {/if}
  </div>

  <!-- Canvas Info Panel -->
  <div class="floating-panel mt-4 flex items-center justify-between text-sm">
    <div class="flex items-center space-x-6">
      <span class="text-gray-600">
        <span class="font-medium text-gray-800">Tool:</span> 
        {activeTool === 'pen' ? 'Drawing' : 
         activeTool === 'move' ? 'Move' : 
         activeTool === 'square' ? 'Rectangle' : 
         activeTool === 'circle' ? 'Circle' : 
         activeTool === 'text' ? 'Text' : 'Polygon'}
      </span>
      <span class="text-gray-600">
        <span class="font-medium text-gray-800">Status:</span> 
        {isDrawing ? 'Drawing...' : imageLoaded ? 'Ready' : 'No image'}
      </span>
    </div>
    
    <div class="flex items-center space-x-4 text-gray-500">
      {#if imageLoaded}
        <span class="flex items-center space-x-2">
          <span>Ready to draw</span>
          <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        </span>
      {:else}
        <span>Upload an image to start</span>
      {/if}
    </div>
  </div>
</div>

<!-- Hidden file input -->
<input 
  bind:this={fileInputElement}
  type="file" 
  accept="image/*" 
  class="hidden"
  on:change={handleFileUpload}
/>

<svelte:window on:keydown={handleKeydown} />

<style>
  .canvas-container {
    transition: transform 0.2s ease-out;
  }
  
  .canvas-container.drag-over {
    background: linear-gradient(45deg, transparent 25%, rgba(14, 165, 233, 0.1) 25%, rgba(14, 165, 233, 0.1) 50%, transparent 50%, transparent 75%, rgba(14, 165, 233, 0.1) 75%);
    background-size: 20px 20px;
    animation: drag-pattern 0.5s linear infinite;
  }
  
  @keyframes drag-pattern {
    0% { background-position: 0 0; }
    100% { background-position: 20px 20px; }
  }
  
  @keyframes bounce-soft {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  
  .animate-bounce-soft {
    animation: bounce-soft 2s ease-in-out infinite;
  }
</style> 
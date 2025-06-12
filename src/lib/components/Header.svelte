<script lang="ts">
  import { Map, Layers, Save, Download, Upload, Settings, FileText, FolderOpen, RotateCcw, X } from 'lucide-svelte';
  import { canvasStore } from '../stores/canvas';
  import { settingsStore } from '../stores/settings';
  import { downloadImage, generateFilename, formatFileSize } from '../utils/fileUtils';
  import ThemeToggle from './ThemeToggle.svelte';

  let showSettingsModal = false;
  let showExportModal = false;
  let isExporting = false;
  let isAutoSaving = false;
  let lastSaveTime = '';

  // Reactive variables
  $: imageLoaded = $canvasStore?.imageLoaded || false;
  $: memoryUsage = $canvasStore?.memoryUsage || 0;
  $: autoSave = $settingsStore?.autoSave || false;
  $: recentFiles = $settingsStore?.recentFiles || [];

  // Auto-save functionality
  $: if (autoSave && imageLoaded) {
    startAutoSave();
  }

  function startAutoSave() {
    settingsStore.startAutoSave(() => {
      if (imageLoaded) {
        handleAutoSave();
      }
    });
  }

  async function handleAutoSave() {
    if (!imageLoaded) return;
    
    isAutoSaving = true;
    try {
      canvasStore.saveProject();
      lastSaveTime = new Date().toLocaleTimeString();
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      isAutoSaving = false;
    }
  }

  async function handleSaveProject() {
    if (!imageLoaded) return;
    
    try {
      canvasStore.saveProject();
      lastSaveTime = new Date().toLocaleTimeString();
      
      // Show success feedback
      // TODO: Add toast notification
      console.log('Project saved successfully');
    } catch (error) {
      console.error('Failed to save project:', error);
      // TODO: Add error notification
    }
  }

  function handleExportClick() {
    if (!imageLoaded) return;
    showExportModal = true;
  }

  async function handleQuickExport() {
    if (!imageLoaded) return;
    
    isExporting = true;
    const startTime = Date.now();
    
    try {
      const dataUrl = canvasStore.exportCanvas('png', 1);
      const filename = generateFilename('realty-canvas-export', 'png');
      downloadImage(dataUrl, filename);
      
      // Track export in history
      const exportDuration = Date.now() - startTime;
      const fileSizeEstimate = Math.round(dataUrl.length * 0.75); // Base64 to bytes estimation
      
      settingsStore.addExportRecord({
        filename,
        format: 'png',
        quality: 1,
        fileSize: fileSizeEstimate,
        duration: exportDuration,
        canvasSize: { 
          width: $canvasStore.width, 
          height: $canvasStore.height 
        },
        includesLogos: canvasStore.getLogos().some(logo => logo.visible),
        includesMeasurements: $canvasStore.showMeasurements && $canvasStore.measurements.length > 0,
        includesAnnotations: $canvasStore.textAnnotations.length > 0,
        thumbnail: dataUrl.substring(0, 100) // Truncated thumbnail
      });
      
    } catch (error) {
      console.error('Failed to export:', error);
    } finally {
      isExporting = false;
    }
  }

  async function handleCustomExport(format: 'png' | 'jpg', quality: number) {
    if (!imageLoaded) return;
    
    isExporting = true;
    const startTime = Date.now();
    
    try {
      const dataUrl = canvasStore.exportCanvas(format, quality);
      const filename = generateFilename('realty-canvas-export', format);
      downloadImage(dataUrl, filename);
      
      // Track export in history
      const exportDuration = Date.now() - startTime;
      const fileSizeEstimate = Math.round(dataUrl.length * 0.75);
      
      settingsStore.addExportRecord({
        filename,
        format,
        quality,
        fileSize: fileSizeEstimate,
        duration: exportDuration,
        canvasSize: { 
          width: $canvasStore.width, 
          height: $canvasStore.height 
        },
        includesLogos: canvasStore.getLogos().some(logo => logo.visible),
        includesMeasurements: $canvasStore.showMeasurements && $canvasStore.measurements.length > 0,
        includesAnnotations: $canvasStore.textAnnotations.length > 0,
        thumbnail: dataUrl.substring(0, 100)
      });
      
      showExportModal = false;
    } catch (error) {
      console.error('Failed to export:', error);
    } finally {
      isExporting = false;
    }
  }

  function handleImportPhoto() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          await canvasStore.loadImage(file);
        } catch (error) {
          console.error('Failed to import photo:', error);
        }
      }
    };
    input.click();
  }

  function handleLoadProject() {
    canvasStore.loadProject();
  }

  function handleShowLayers() {
    // TODO: Implement layer panel toggle
    console.log('Show layers panel');
  }

  function handleOpenRecentFile(file: any) {
    // TODO: Implement recent file opening
    console.log('Open recent file:', file);
  }

  function toggleSettingsModal() {
    showSettingsModal = !showSettingsModal;
  }

  function closeSettingsModal() {
    showSettingsModal = false;
  }

  function closeExportModal() {
    showExportModal = false;
  }
</script>

<header class="glass-effect border-b border-white/20 sticky top-0 z-50">
  <div class="max-w-7xl mx-auto px-6 py-4">
    <div class="flex items-center justify-between">
      <!-- Logo and Title -->
      <div class="flex items-center space-x-4">
        <div class="w-10 h-10 bg-gradient-to-br from-primary-500 to-forest-500 rounded-xl flex items-center justify-center shadow-lg">
          <Map class="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 class="text-2xl font-display font-bold bg-gradient-to-r from-primary-600 to-forest-600 bg-clip-text text-transparent">
            RealtyCanvas
          </h1>
          <div class="flex items-center space-x-2 text-sm">
            <p class="text-gray-500 dark:text-gray-400 font-medium">Real Estate Photo Editor</p>
            {#if autoSave && lastSaveTime}
              <span class="text-xs text-green-600 flex items-center">
                {isAutoSaving ? 'Saving...' : `Saved ${lastSaveTime}`}
              </span>
            {/if}
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center space-x-3">
        <!-- File Operations -->
        <div class="hidden md:flex items-center space-x-2">
          <button 
            class="btn-secondary flex items-center space-x-2"
            on:click={handleImportPhoto}
            title="Import New Photo"
          >
            <Upload class="w-4 h-4" />
            <span class="hidden lg:inline">Import</span>
          </button>
          
          <button 
            class="btn-secondary flex items-center space-x-2"
            on:click={handleLoadProject}
            title="Load Recent Project"
          >
            <FolderOpen class="w-4 h-4" />
            <span class="hidden lg:inline">Open</span>
          </button>
        </div>
        
        <!-- Canvas Operations -->
        <div class="flex items-center space-x-2">
          <button 
            class="btn-secondary flex items-center space-x-2"
            on:click={handleShowLayers}
            title="Toggle Layers Panel"
          >
            <Layers class="w-4 h-4" />
            <span class="hidden sm:inline">Layers</span>
          </button>
          
          <button 
            class="btn-secondary"
            on:click={handleSaveProject}
            disabled={!imageLoaded}
            title="Save Project"
          >
            <Save class="w-4 h-4" />
          </button>
          
          <button 
            class="btn-secondary"
            on:click={handleQuickExport}
            disabled={!imageLoaded || isExporting}
            title="Quick Export as PNG"
          >
            {#if isExporting}
              <div class="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
            {:else}
              <Download class="w-4 h-4" />
            {/if}
          </button>
          
          <button 
            class="btn-secondary text-sm"
            on:click={handleExportClick}
            disabled={!imageLoaded}
            title="Export Options"
          >
            Export
          </button>
        </div>
        
        <!-- Settings and Theme -->
        <div class="flex items-center space-x-3 border-l border-gray-200 pl-3">
          <ThemeToggle />
          
          <button 
            class="btn-primary flex items-center space-x-2"
            on:click={toggleSettingsModal}
          >
            <Settings class="w-4 h-4" />
            <span class="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Status Bar -->
    {#if imageLoaded}
      <div class="mt-3 flex items-center justify-between text-sm text-gray-500">
        <div class="flex items-center space-x-4">
          <span class="flex items-center space-x-1">
            <span class="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>Ready</span>
          </span>
          {#if memoryUsage > 0}
            <span>Memory: {memoryUsage}MB</span>
          {/if}
        </div>
        
        <div class="flex items-center space-x-4">
          {#if autoSave}
            <span class="text-green-600">Auto-save: On</span>
          {:else}
            <span class="text-gray-400">Auto-save: Off</span>
          {/if}
          <span>Version 1.0.0</span>
        </div>
      </div>
    {/if}
  </div>
</header>

<!-- Settings Modal -->
{#if showSettingsModal}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" on:click={closeSettingsModal}>
    <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto" on:click|stopPropagation>
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-semibold text-gray-800 dark:text-white">Settings</h2>
        <button 
          class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          on:click={closeSettingsModal}
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="space-y-6">
        <!-- Canvas Settings -->
        <div>
          <h3 class="font-medium text-gray-700 dark:text-gray-300 mb-3">Canvas Settings</h3>
          <div class="space-y-3">
            <label class="flex items-center justify-between">
              <span class="text-sm text-gray-600 dark:text-gray-400">Show Grid</span>
              <input 
                type="checkbox" 
                checked={$settingsStore?.gridVisible || false}
                on:change={(e) => settingsStore.updateSetting('gridVisible', e.target.checked)}
                class="toggle"
              />
            </label>
            
            <label class="flex items-center justify-between">
              <span class="text-sm text-gray-600 dark:text-gray-400">Snap to Grid</span>
              <input 
                type="checkbox" 
                checked={$settingsStore?.snapToGrid || false}
                on:change={(e) => settingsStore.updateSetting('snapToGrid', e.target.checked)}
                class="toggle"
              />
            </label>
          </div>
        </div>

        <!-- Export Settings -->
        <div>
          <h3 class="font-medium text-gray-700 dark:text-gray-300 mb-3">Export Settings</h3>
          <div class="space-y-3">
            <label class="block">
              <span class="text-sm text-gray-600 dark:text-gray-400">Default Format</span>
              <select 
                value={$settingsStore?.defaultExportFormat || 'png'}
                on:change={(e) => settingsStore.updateSetting('defaultExportFormat', e.target.value)}
                class="mt-1 block w-full rounded-md border-gray-300 text-sm"
              >
                <option value="png">PNG</option>
                <option value="jpg">JPEG</option>
                <option value="webp">WebP</option>
              </select>
            </label>
          </div>
        </div>

        <!-- Auto-save Settings -->
        <div>
          <h3 class="font-medium text-gray-700 dark:text-gray-300 mb-3">Auto-save</h3>
          <div class="space-y-3">
            <label class="flex items-center justify-between">
              <span class="text-sm text-gray-600 dark:text-gray-400">Enable Auto-save</span>
              <input 
                type="checkbox" 
                checked={autoSave}
                on:change={(e) => settingsStore.updateSetting('autoSave', e.target.checked)}
                class="toggle"
              />
            </label>
            
            {#if autoSave}
              <label class="block">
                <span class="text-sm text-gray-600 dark:text-gray-400">Interval (minutes)</span>
                <input 
                  type="number" 
                  min="1" 
                  max="60"
                  value={$settingsStore?.autoSaveInterval || 5}
                  on:change={(e) => settingsStore.updateSetting('autoSaveInterval', parseInt(e.target.value))}
                  class="mt-1 block w-full rounded-md border-gray-300 text-sm"
                />
              </label>
            {/if}
          </div>
        </div>

        <!-- Recent Files -->
        {#if recentFiles.length > 0}
          <div>
            <h3 class="font-medium text-gray-700 dark:text-gray-300 mb-3">Recent Files</h3>
            <div class="space-y-2 max-h-48 overflow-y-auto">
              {#each recentFiles as file}
                <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div class="flex items-center space-x-3">
                    <FileText class="w-4 h-4 text-gray-400" />
                    <div>
                      <p class="text-sm font-medium text-gray-700 dark:text-gray-300">{file.name}</p>
                      <p class="text-xs text-gray-500">{formatFileSize(file.size)} • {new Date(file.lastModified).toLocaleString()}</p>
                    </div>
                  </div>
                  <button 
                    class="text-xs bg-primary-500 text-white px-2 py-1 rounded hover:bg-primary-600"
                    on:click={() => handleOpenRecentFile(file)}
                  >
                    Open
                  </button>
                </div>
              {/each}
            </div>
            <button 
              class="mt-2 text-sm text-red-600 hover:text-red-700"
              on:click={() => settingsStore.clearRecentFiles()}
            >
              Clear Recent Files
            </button>
          </div>
        {/if}

        <!-- Reset Settings -->
        <div class="border-t pt-4">
          <button 
            class="btn-secondary text-red-600 hover:text-red-700 hover:bg-red-50 flex items-center space-x-2"
            on:click={() => {
              if (confirm('Reset all settings to default? This cannot be undone.')) {
                settingsStore.reset();
              }
            }}
          >
            <RotateCcw class="w-4 h-4" />
            <span>Reset to Defaults</span>
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Export Modal -->
{#if showExportModal}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" on:click={closeExportModal}>
    <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md" on:click|stopPropagation>
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-xl font-semibold text-gray-800 dark:text-white">Export Image</h2>
        <button 
          class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          on:click={closeExportModal}
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Format</label>
          <div class="grid grid-cols-2 gap-2">
            <button 
              class="p-3 border rounded-lg text-center hover:bg-gray-50 transition-colors"
              on:click={() => handleCustomExport('png', 1)}
              disabled={isExporting}
            >
              <div class="font-medium">PNG</div>
              <div class="text-xs text-gray-500">Lossless, larger file</div>
            </button>
            <button 
              class="p-3 border rounded-lg text-center hover:bg-gray-50 transition-colors"
              on:click={() => handleCustomExport('jpg', 0.9)}
              disabled={isExporting}
            >
              <div class="font-medium">JPEG</div>
              <div class="text-xs text-gray-500">Compressed, smaller file</div>
            </button>
          </div>
        </div>

        <div class="text-xs text-gray-500 text-center">
          Images will be exported with all visible layers and logos included.
        </div>

        {#if isExporting}
          <div class="flex items-center justify-center p-4">
            <div class="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full"></div>
            <span class="ml-2">Exporting...</span>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .toggle {
    @apply w-12 h-6 bg-gray-200 rounded-full relative cursor-pointer transition-colors;
    -webkit-appearance: none;
    appearance: none;
  }

  .toggle:checked {
    @apply bg-primary-500;
  }

  .toggle::after {
    content: '';
    @apply absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform;
  }

  .toggle:checked::after {
    transform: translateX(1.5rem);
  }
</style> 
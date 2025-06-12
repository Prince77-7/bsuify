<script lang="ts">
  import { onMount } from 'svelte';
  import Header from '$lib/components/Header.svelte';
  import ToolsSidebar from '$lib/components/ToolsSidebar.svelte';
  import Canvas from '$lib/components/Canvas.svelte';
  import LogoOverlay from '$lib/components/LogoOverlay.svelte';
  import Welcome from '$lib/components/Welcome.svelte';
  import SelectionPanel from '$lib/components/SelectionPanel.svelte';
  import { PanelLeftOpen, PanelRightOpen } from 'lucide-svelte';
  import { canvasStore } from '$lib/stores/canvas';
  import { settingsStore } from '$lib/stores/settings';
  import { theme } from '$lib/stores/theme';

  let showToolsSidebar = true;
  let showLogoPanel = true;
  let isInitialized = false;

  // Reactive variables to safely access store values
  $: imageLoaded = $canvasStore?.imageLoaded || false;
  $: canvasWidth = $canvasStore?.width || 1200;
  $: canvasHeight = $canvasStore?.height || 800;
  $: zoom = $canvasStore?.zoom || 100;
  $: memoryUsage = $canvasStore?.memoryUsage || 0;
  $: autoSave = $settingsStore?.autoSave || false;
  $: showWelcomeScreen = $settingsStore?.showWelcomeScreen !== false;
  $: panelPosition = $settingsStore?.panelPosition || 'left';

  onMount(() => {
    // Initialize theme
    theme.init();
    
    // Set up keyboard shortcuts
    setupKeyboardShortcuts();
    
    // Auto-hide welcome screen after first interaction
    const hideWelcome = () => {
      if (showWelcomeScreen) {
        settingsStore.updateSetting('showWelcomeScreen', false);
      }
    };
    
    // Listen for first canvas interaction
    document.addEventListener('mousedown', hideWelcome, { once: true });
    document.addEventListener('keydown', hideWelcome, { once: true });
    
    isInitialized = true;
    
    return () => {
      document.removeEventListener('mousedown', hideWelcome);
      document.removeEventListener('keydown', hideWelcome);
    };
  });

  function setupKeyboardShortcuts() {
    function handleKeydown(event: KeyboardEvent) {
      // Don't trigger shortcuts when typing in inputs
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      const isCtrlOrCmd = event.ctrlKey || event.metaKey;

      switch (event.key.toLowerCase()) {
        case 's':
          if (isCtrlOrCmd) {
            event.preventDefault();
            if (imageLoaded) {
              canvasStore.saveProject();
            }
          }
          break;
        
        case 'e':
          if (isCtrlOrCmd) {
            event.preventDefault();
            if (imageLoaded) {
              // Trigger export
              const dataUrl = canvasStore.exportCanvas('png', 1);
              const link = document.createElement('a');
              link.download = `realty-canvas-${Date.now()}.png`;
              link.href = dataUrl;
              link.click();
            }
          }
          break;
        
        case 'z':
          if (isCtrlOrCmd && !event.shiftKey) {
            event.preventDefault();
            canvasStore.undo();
          }
          break;
        
        case 'y':
          if (isCtrlOrCmd) {
            event.preventDefault();
            canvasStore.redo();
          }
          break;
        
        case 'g':
          if (!isCtrlOrCmd) {
            event.preventDefault();
            settingsStore.updateSetting('gridVisible', !$settingsStore?.gridVisible);
          }
          break;
        
        case '[':
          if (!isCtrlOrCmd) {
            event.preventDefault();
            showToolsSidebar = !showToolsSidebar;
          }
          break;
        
        case ']':
          if (!isCtrlOrCmd) {
            event.preventDefault();
            showLogoPanel = !showLogoPanel;
          }
          break;
          
        case '=':
        case '+':
          if (!isCtrlOrCmd) {
            event.preventDefault();
            canvasStore.zoomIn();
          }
          break;
          
        case '-':
          if (!isCtrlOrCmd) {
            event.preventDefault();
            canvasStore.zoomOut();
          }
          break;
          
        case '0':
          if (!isCtrlOrCmd) {
            event.preventDefault();
            canvasStore.setZoom(100);
          }
          break;
      }
    }

    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  }

  function toggleToolsSidebar() {
    showToolsSidebar = !showToolsSidebar;
  }

  function toggleLogoPanel() {
    showLogoPanel = !showLogoPanel;
  }

  // Format memory usage
  function formatMemory(mb: number): string {
    if (mb < 1) return `${Math.round(mb * 1000)}KB`;
    return `${mb.toFixed(1)}MB`;
  }
</script>

<svelte:head>
  <title>RealtyCanvas - Professional Real Estate Photo Editor</title>
  <meta name="description" content="Professional real estate photo editing tool for property visualization, land parcels, and landscape overlays" />
  <meta name="keywords" content="real estate, photo editor, property visualization, land parcels, canvas drawing" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
</svelte:head>

<div class="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
  <!-- Header -->
  <Header />
  
  <!-- Main Content Area -->
  <main class="flex-1 flex relative overflow-hidden p-2 sm:p-4 lg:p-6">
    <!-- Left Sidebar Toggle -->
    <button
      class="absolute top-2 left-2 sm:top-4 sm:left-4 z-40 tool-button group transition-all duration-300 {showToolsSidebar ? 'translate-x-64 sm:translate-x-72 lg:translate-x-80' : 'translate-x-0'}"
      class:active={showToolsSidebar}
      on:click={toggleToolsSidebar}
      title="Toggle Tools Panel ([)"
    >
      <PanelLeftOpen class="w-4 h-4 sm:w-5 sm:h-5 {showToolsSidebar ? 'rotate-180' : ''} transition-transform duration-200" />
    </button>

    <!-- Tools Sidebar -->
    <aside class="relative transition-all duration-300 ease-in-out bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 rounded-r-lg shadow-sm {showToolsSidebar ? 'w-60 sm:w-72 lg:w-80 opacity-100' : 'w-0 opacity-0 overflow-hidden'}">
      <div class="h-full py-4 px-2 sm:py-4 sm:px-3 lg:py-6 lg:px-4 overflow-y-auto">
        {#if isInitialized}
          <ToolsSidebar />
        {/if}
      </div>
    </aside>

    <!-- Canvas Area -->
    <section class="flex-1 p-3 sm:p-4 lg:p-6 min-w-0 bg-white dark:bg-gray-800 mx-2 sm:mx-4 lg:mx-6 rounded-lg shadow-sm">
      {#if isInitialized}
        <Canvas />
      {:else}
        <div class="flex items-center justify-center h-full">
          <div class="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full"></div>
        </div>
      {/if}
    </section>

    <!-- Right Sidebar Toggle -->
    <button
      class="absolute top-2 right-2 sm:top-4 sm:right-4 z-40 tool-button group transition-all duration-300 {showLogoPanel ? '-translate-x-64 sm:-translate-x-72 lg:-translate-x-80' : 'translate-x-0'}"
      class:active={showLogoPanel}
      on:click={toggleLogoPanel}
      title="Toggle Logo Panel (])"
    >
      <PanelRightOpen class="w-4 h-4 sm:w-5 sm:h-5 {showLogoPanel ? 'rotate-180' : ''} transition-transform duration-200" />
    </button>

    <!-- Logo Overlay Panel -->
    <aside class="relative transition-all duration-300 ease-in-out bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 rounded-l-lg shadow-sm {showLogoPanel ? 'w-60 sm:w-72 lg:w-80 opacity-100' : 'w-0 opacity-0 overflow-hidden'}">
      <div class="h-full py-4 px-2 sm:py-4 sm:px-3 lg:py-6 lg:px-4 overflow-y-auto">
        {#if isInitialized}
          <LogoOverlay />
        {/if}
      </div>
    </aside>
  </main>

  <!-- Footer Status Bar -->
  <footer class="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 md:px-6 py-3">
    <div class="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 flex-wrap gap-2">
      <div class="flex items-center space-x-3 md:space-x-6">
        <span class="flex items-center space-x-2">
          <div class="w-2 h-2 bg-green-500 rounded-full {imageLoaded ? 'animate-pulse' : ''}"></div>
          <span>{imageLoaded ? 'Ready' : 'No Image'}</span>
        </span>
        <span class="hidden sm:inline">Canvas: {canvasWidth}×{canvasHeight}px</span>
        <span>Zoom: {zoom}%</span>
      </div>
      
      <div class="flex items-center space-x-2 md:space-x-4">
        {#if memoryUsage > 0}
          <span>Memory: {formatMemory(memoryUsage)}</span>
        {/if}
        <span class="{autoSave ? 'text-green-600' : 'text-gray-400'}">
          Auto-save: {autoSave ? 'On' : 'Off'}
        </span>
        <div class="text-xs text-gray-500 dark:text-gray-500 hidden md:block">
          RealtyCanvas v1.0.0 • Built for Real Estate Professionals
        </div>
      </div>
    </div>
  </footer>
  
  <!-- Welcome Modal -->
  {#if showWelcomeScreen && isInitialized}
    <Welcome />
  {/if}
  
  <!-- Selection Panel -->
  {#if isInitialized}
    <SelectionPanel />
  {/if}
  
  <!-- Keyboard Shortcuts Help -->
  <div class="fixed bottom-4 left-4 sm:bottom-6 sm:left-6 z-30 hidden lg:block">
    <details class="group">
      <summary class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-500 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
        Keyboard Shortcuts
      </summary>
      <div class="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 w-64 text-xs">
        <div class="space-y-2">
          <div class="flex justify-between">
            <span>Save Project</span>
            <kbd class="bg-gray-100 dark:bg-gray-700 px-1 rounded">Ctrl+S</kbd>
          </div>
          <div class="flex justify-between">
            <span>Export Image</span>
            <kbd class="bg-gray-100 dark:bg-gray-700 px-1 rounded">Ctrl+E</kbd>
          </div>
          <div class="flex justify-between">
            <span>Undo</span>
            <kbd class="bg-gray-100 dark:bg-gray-700 px-1 rounded">Ctrl+Z</kbd>
          </div>
          <div class="flex justify-between">
            <span>Toggle Grid</span>
            <kbd class="bg-gray-100 dark:bg-gray-700 px-1 rounded">G</kbd>
          </div>
          <div class="flex justify-between">
            <span>Toggle Tools</span>
            <kbd class="bg-gray-100 dark:bg-gray-700 px-1 rounded">[</kbd>
          </div>
          <div class="flex justify-between">
            <span>Toggle Logos</span>
            <kbd class="bg-gray-100 dark:bg-gray-700 px-1 rounded">]</kbd>
          </div>
          <div class="flex justify-between">
            <span>Zoom In/Out</span>
            <kbd class="bg-gray-100 dark:bg-gray-700 px-1 rounded">+/-</kbd>
          </div>
        </div>
      </div>
    </details>
  </div>
</div>

<style>
  /* Custom animation for panel toggles */
  .tool-button {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    @apply p-2 sm:p-3 rounded-lg sm:rounded-xl border-2 border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 shadow-sm;
  }
  
  .tool-button.active {
    @apply border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-primary-300;
  }
  
  /* Ensure proper layering */
  main {
    position: relative;
    z-index: 1;
  }
  
  /* Smooth sidebar animations */
  aside {
    will-change: width, opacity;
  }
  
  /* Custom scrollbar styling */
  :global(.sidebar-panel) {
    scrollbar-width: thin;
    scrollbar-color: #cbd5e1 transparent;
  }
  
  :global(.sidebar-panel::-webkit-scrollbar) {
    width: 6px;
  }
  
  :global(.sidebar-panel::-webkit-scrollbar-track) {
    background: transparent;
  }
  
  :global(.sidebar-panel::-webkit-scrollbar-thumb) {
    background-color: #cbd5e1;
    border-radius: 3px;
  }
  
  :global(.sidebar-panel::-webkit-scrollbar-thumb:hover) {
    background-color: #94a3b8;
  }
  
  kbd {
    font-family: ui-monospace, SFMono-Regular, "SF Mono", monospace;
    font-size: 0.75rem;
  }

  /* Mobile-first responsive adjustments */
  @media (max-width: 640px) {
    .tool-button {
      @apply p-2 rounded-lg;
    }
  }

  /* Ensure sidebars don't overflow on small screens */
  @media (max-width: 768px) {
    aside {
      max-width: calc(100vw - 4rem);
    }
  }
</style>

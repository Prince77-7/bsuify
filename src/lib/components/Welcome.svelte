<script>
  import { Map, Upload, Palette, Layers, Zap, Star } from 'lucide-svelte';

  let isVisible = true;

  function closeWelcome() {
    isVisible = false;
  }

  const features = [
    {
      icon: Map,
      title: 'Property Mapping',
      description: 'Draw precise property lines and boundaries with professional tools'
    },
    {
      icon: Palette,
      title: 'Smart Drawing Tools',
      description: 'Intuitive drawing tools designed specifically for real estate professionals'
    },
    {
      icon: Layers,
      title: 'Layer Management',
      description: 'Organize your work with powerful layer controls and visibility options'
    },
    {
      icon: Zap,
      title: 'Logo Overlay',
      description: 'Add your branding and watermarks with precise positioning controls'
    }
  ];
</script>

{#if isVisible}
  <div class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
      <!-- Header -->
      <div class="bg-gradient-to-r from-primary-500 to-forest-500 text-white p-8 rounded-t-3xl">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Map class="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 class="text-3xl font-display font-bold">RealtyCanvas</h1>
              <p class="text-primary-100 font-medium">Professional Real Estate Photo Editor</p>
            </div>
          </div>
          
          <button 
            class="text-white/80 hover:text-white text-2xl font-light"
            on:click={closeWelcome}
          >
            ×
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="p-8">
        <div class="text-center mb-8">
          <h2 class="text-2xl font-semibold text-gray-800 mb-3">
            Welcome to Your Professional Photo Editor
          </h2>
          <p class="text-gray-600 max-w-2xl mx-auto">
            Designed specifically for real estate professionals, RealtyCanvas helps you create stunning property visualizations with precise drawing tools and logo overlays.
          </p>
        </div>

        <!-- Features Grid -->
        <div class="grid md:grid-cols-2 gap-6 mb-8">
          {#each features as feature}
            <div class="bg-gray-50 rounded-2xl p-6 hover:bg-gray-100 transition-colors duration-200">
              <div class="flex items-start space-x-4">
                <div class="w-12 h-12 bg-gradient-to-br from-primary-500 to-forest-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svelte:component this={feature.icon} class="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 class="font-semibold text-gray-800 mb-2">{feature.title}</h3>
                  <p class="text-gray-600 text-sm">{feature.description}</p>
                </div>
              </div>
            </div>
          {/each}
        </div>

        <!-- Getting Started -->
        <div class="bg-gradient-to-r from-primary-50 to-forest-50 rounded-2xl p-6 mb-6">
          <h3 class="font-semibold text-gray-800 mb-4 flex items-center">
            <Star class="w-5 h-5 mr-2 text-primary-500" />
            Quick Start Guide
          </h3>
          
          <div class="space-y-3">
            <div class="flex items-center space-x-3">
              <div class="w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
              <span class="text-gray-700">Upload your property photo using the "Import Photo" button</span>
            </div>
            <div class="flex items-center space-x-3">
              <div class="w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
              <span class="text-gray-700">Select drawing tools from the left sidebar to mark property lines</span>
            </div>
            <div class="flex items-center space-x-3">
              <div class="w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
              <span class="text-gray-700">Add your company logo and branding from the right panel</span>
            </div>
            <div class="flex items-center space-x-3">
              <div class="w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
              <span class="text-gray-700">Save and export your professional property visualization</span>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-center space-x-4">
          <button 
            class="btn-primary flex items-center space-x-2"
            on:click={closeWelcome}
          >
            <Upload class="w-4 h-4" />
            <span>Start Creating</span>
          </button>
          
          <button class="btn-secondary">
            <span>View Tutorial</span>
          </button>
        </div>
      </div>
    </div>
  </div>
{/if} 
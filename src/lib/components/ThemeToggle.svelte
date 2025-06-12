<script lang="ts">
  import { onMount } from 'svelte';
  import { Sun, Moon } from 'lucide-svelte';
  import { theme } from '$lib/stores/theme';

  onMount(() => {
    theme.init();
  });
</script>

<button
  class="tool-button group relative"
  on:click={theme.toggle}
  title="Toggle dark mode"
  aria-label="Toggle dark mode"
>
  {#if $theme === 'light'}
    <Sun class="w-5 h-5 text-yellow-500 transform transition-transform duration-300 group-hover:rotate-12" />
  {:else}
    <Moon class="w-5 h-5 text-blue-400 transform transition-transform duration-300 group-hover:-rotate-12" />
  {/if}
  
  <!-- Animated background -->
  <div 
    class="absolute inset-0 rounded-xl transition-all duration-300 opacity-0 group-hover:opacity-100 {$theme === 'light' ? 'bg-yellow-100 dark:bg-yellow-900/20' : 'bg-blue-100 dark:bg-blue-900/20'}"
  ></div>
</button> 
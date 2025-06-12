<script lang="ts">
  import { canvasStore } from '../stores/canvas';

  $: selectedElements = $canvasStore.selectedElements;
  $: hasSelection = selectedElements.length > 0;

  function deleteSelected() {
    canvasStore.deleteSelectedElements();
  }

  function duplicateSelected() {
    canvasStore.duplicateSelectedElements();
  }

  function clearSelection() {
    canvasStore.clearAllSelections();
  }

  // Listen for keyboard shortcuts
  function handleKeydown(event: KeyboardEvent) {
    if (!hasSelection) return;
    
    switch (event.key) {
      case 'Delete':
      case 'Backspace':
        event.preventDefault();
        deleteSelected();
        break;
      case 'd':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          duplicateSelected();
        }
        break;
      case 'Escape':
        event.preventDefault();
        clearSelection();
        break;
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if hasSelection}
  <div class="selection-panel">
    <div class="selection-info">
      <span class="selection-count">
        {selectedElements.length} element{selectedElements.length > 1 ? 's' : ''} selected
      </span>
      <div class="selection-hint">
        <span class="hint-text">💡 Drag corners to resize • Drag center to move</span>
      </div>
    </div>
    
    <div class="selection-controls">
      <button 
        class="control-btn duplicate-btn" 
        on:click={duplicateSelected}
        title="Duplicate (Ctrl+D)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        Duplicate
      </button>
      
      <button 
        class="control-btn delete-btn" 
        on:click={deleteSelected}
        title="Delete (Del)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3,6 5,6 21,6"></polyline>
          <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
        Delete
      </button>
      
      <button 
        class="control-btn clear-btn" 
        on:click={clearSelection}
        title="Clear Selection (Esc)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
        Clear
      </button>
    </div>
  </div>
{/if}

<style>
  .selection-panel {
    position: fixed;
    top: 80px;
    right: 20px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(0, 0, 0, 0.1);
    border-radius: 12px;
    padding: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    min-width: 280px;
    z-index: 1000;
    font-family: 'Inter', sans-serif;
  }

  .selection-info {
    margin-bottom: 12px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  }

  .selection-count {
    font-size: 14px;
    color: #333;
    font-weight: 500;
  }

  .selection-hint {
    margin-top: 6px;
  }

  .hint-text {
    font-size: 12px;
    color: #666;
    font-style: italic;
  }

  .selection-controls {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .control-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border: 1px solid rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    background: white;
    color: #333;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .control-btn:hover {
    background: #f8f9fa;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .duplicate-btn:hover {
    border-color: #007ACC;
    color: #007ACC;
  }

  .delete-btn:hover {
    border-color: #dc3545;
    color: #dc3545;
  }

  .clear-btn:hover {
    border-color: #6c757d;
    color: #6c757d;
  }

  .control-btn svg {
    flex-shrink: 0;
  }

  @media (max-width: 768px) {
    .selection-panel {
      position: fixed;
      bottom: 20px;
      right: 50%;
      transform: translateX(50%);
      top: auto;
      min-width: auto;
      width: calc(100% - 40px);
      max-width: 400px;
    }
    
    .selection-controls {
      justify-content: center;
    }
  }
</style> 
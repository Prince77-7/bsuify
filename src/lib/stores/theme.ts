import { writable } from 'svelte/store';
import { browser } from '$app/environment';

type Theme = 'light' | 'dark';

function createThemeStore() {
  // Initialize with system preference or default to light
  const getInitialTheme = (): Theme => {
    if (!browser) return 'light';
    
    // Check localStorage first
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    
    // Check system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
    return 'light';
  };

  const { subscribe, set, update } = writable<Theme>(getInitialTheme());

  return {
    subscribe,
    toggle: () => update(theme => {
      const newTheme = theme === 'light' ? 'dark' : 'light';
      
      if (browser) {
        localStorage.setItem('theme', newTheme);
        
        // Update document class
        if (newTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
      
      return newTheme;
    }),
    set: (theme: Theme) => {
      if (browser) {
        localStorage.setItem('theme', theme);
        
        // Update document class
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
      
      set(theme);
    },
    init: () => {
      if (browser) {
        const theme = getInitialTheme();
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        }
      }
    }
  };
}

export const theme = createThemeStore(); 
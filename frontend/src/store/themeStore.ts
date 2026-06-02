/**
 * Dark Mode / Theme Store
 * Using Zustand for state management
 * Persists to localStorage via persist middleware
 */

import React from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

/**
 * Get system dark mode preference
 */
const getSystemPreference = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

/**
 * Apply theme class to document root
 */
const applyThemeToDOM = (isDark: boolean) => {
  const html = document.documentElement;
  if (isDark) {
    html.classList.add('dark');
    html.style.colorScheme = 'dark';
  } else {
    html.classList.remove('dark');
    html.style.colorScheme = 'light';
  }
};

/**
 * Theme store with localStorage persistence
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      // Default to system preference
      mode: 'system',
      isDark: getSystemPreference(),

      setMode: (mode: ThemeMode) => {
        const isDark =
          mode === 'dark' || (mode === 'system' && getSystemPreference());

        applyThemeToDOM(isDark);
        set({ mode, isDark });
      },

      toggle: () => {
        const { isDark } = get();
        const newIsDark = !isDark;
        const newMode: ThemeMode = newIsDark ? 'dark' : 'light';

        applyThemeToDOM(newIsDark);
        set({ mode: newMode, isDark: newIsDark });
      },
    }),
    {
      name: 'theme-storage',
      onRehydrate: () => (state) => {
        // Apply theme when state is restored from storage
        if (state && 'isDark' in state) {
          applyThemeToDOM(state.isDark);
        }
      },
    }
  )
);

/**
 * Hook to use theme in components
 */
export function useTheme() {
  const { mode, isDark, setMode, toggle } = useThemeStore();

  return {
    mode,
    isDark,
    setMode,
    toggle,
  };
}

/**
 * Hook to detect and respond to system theme changes
 */
export function useSystemTheme() {
  const { mode, isDark } = useThemeStore();

  React.useEffect(() => {
    if (mode !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      applyThemeToDOM(e.matches);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [mode]);

  // Apply theme on mount
  React.useEffect(() => {
    applyThemeToDOM(isDark);
  }, [isDark]);
}

/**
 * Theme Toggle Component
 * Displays in header/navigation for easy dark mode toggling
 */

import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme, useSystemTheme } from '@store/themeStore';

export function ThemeToggle() {
  const { isDark, toggle } = useTheme();
  useSystemTheme(); // Monitor system theme changes

  return (
    <button
      onClick={toggle}
      className="topbar-menu-btn"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle theme"
    >
      {isDark ? (
        <Sun size={20} />
      ) : (
        <Moon size={20} />
      )}
    </button>
  );
}

/**
 * Theme Selection Dropdown (for Settings page)
 */
export function ThemeSelector() {
  const { mode, setMode } = useTheme();

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">
        Appearance
      </label>

      <div className="space-y-2">
        {['light', 'dark', 'system'].map((themeMode) => (
          <label key={themeMode} className="flex items-center cursor-pointer">
            <input
              type="radio"
              name="theme"
              value={themeMode}
              checked={mode === themeMode}
              onChange={() => setMode(themeMode as any)}
              className="mr-3"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
              {themeMode === 'system'
                ? '🖥️ System preference'
                : themeMode === 'dark'
                  ? '🌙 Dark'
                  : '☀️ Light'}
            </span>
          </label>
        ))}
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
        Choose how the app should look. "System preference" follows your device's setting.
      </p>
    </div>
  );
}

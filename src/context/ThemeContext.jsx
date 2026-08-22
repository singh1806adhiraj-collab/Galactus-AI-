/* Galactus AI - Theme Context */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

const THEME_STORAGE_KEY = 'galactus-theme';
const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system'
};

function getSystemTheme() {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? THEMES.DARK : THEMES.LIGHT;
  }
  return THEMES.DARK;
}

function resolveTheme(theme) {
  if (theme === THEMES.SYSTEM) {
    return getSystemTheme();
  }
  return theme;
}

export function ThemeProvider({ children }) {
  const [storedTheme, setStoredTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(THEME_STORAGE_KEY) || THEMES.SYSTEM;
    }
    return THEMES.SYSTEM;
  });

  const [resolvedTheme, setResolvedTheme] = useState(() => resolveTheme(storedTheme));
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Apply theme to document
  useEffect(() => {
    setIsTransitioning(true);
    const root = document.documentElement;
    root.setAttribute('data-theme', resolvedTheme);
    root.classList.remove('theme-light', 'theme-dark');
    root.classList.add(`theme-${resolvedTheme}`);

    // Force reflow for smooth transition
    root.style.transition = 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease';

    setTimeout(() => {
      root.style.transition = '';
      setIsTransitioning(false);
    }, 300);
  }, [resolvedTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (storedTheme !== THEMES.SYSTEM) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      const newTheme = getSystemTheme();
      setResolvedTheme(newTheme);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [storedTheme]);

  const setTheme = useCallback((theme) => {
    if (!Object.values(THEMES).includes(theme)) return;
    setStoredTheme(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    setResolvedTheme(resolveTheme(theme));
  }, []);

  const toggleTheme = useCallback(() => {
    const themes = [THEMES.LIGHT, THEMES.DARK, THEMES.SYSTEM];
    const currentIndex = themes.indexOf(storedTheme);
    const nextIndex = (currentIndex + 1) % themes.length;
    setTheme(themes[nextIndex]);
  }, [storedTheme, setTheme]);

  const value = {
    theme: storedTheme,
    resolvedTheme,
    isTransitioning,
    setTheme,
    toggleTheme,
    themes: THEMES
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
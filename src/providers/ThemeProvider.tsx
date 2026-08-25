/**
 * Theme context: light / dark / system.
 *
 * The choice is written to `localStorage` immediately so it survives a reload
 * without waiting on the network, and synced to the user's Appwrite settings
 * row separately (see `useSettings`) so it follows them between devices.
 *
 * `ChemicalStructure` reads `document.documentElement.classList` to pick its
 * SVG palette, so the resolved theme must be reflected as a class on <html>,
 * not just held in React state. A `themeVersion` counter is exposed to let
 * structures re-render on change.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'chem9701.theme';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  /** Increments on every resolved-theme change. Use as a render key. */
  themeVersion: number;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
}

function systemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    readStoredTheme() === 'system' ? systemTheme() : (readStoredTheme() as ResolvedTheme),
  );
  const [themeVersion, setThemeVersion] = useState(0);

  // Apply to <html> and keep in sync with the OS when set to "system".
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = () => {
      const next: ResolvedTheme = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
      const root = document.documentElement;
      root.classList.toggle('dark', next === 'dark');
      root.style.colorScheme = next;
      setResolvedTheme((prev) => {
        if (prev !== next) setThemeVersion((v) => v + 1);
        return next;
      });
    };

    apply();
    if (theme !== 'system') return;
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    setThemeState(next);
  }, []);

  const value = useMemo(
    () => ({ theme, resolvedTheme, setTheme, themeVersion }),
    [theme, resolvedTheme, setTheme, themeVersion],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}

/**
 * Inline script for `index.html` <head>. Applies the stored theme before first
 * paint so there is no white flash on a dark-mode reload.
 */
export const THEME_BOOTSTRAP_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('${STORAGE_KEY}') || 'system';
    var dark = stored === 'dark' ||
      (stored === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  } catch (e) {}
})();
`.trim();

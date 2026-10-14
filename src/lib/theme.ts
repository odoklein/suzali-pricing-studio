import { useEffect, useState } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';

const KEY = 'rm_theme';

function read(): ThemePreference {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

/** Pose data-theme sur <html> : « system » laisse la préférence du système décider. */
export function applyTheme(theme: ThemePreference = read()): void {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

export function useTheme(): [ThemePreference, (theme: ThemePreference) => void] {
  const [theme, setTheme] = useState<ThemePreference>(read);
  useEffect(() => {
    applyTheme(theme);
    try {
      if (theme === 'system') localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, theme);
    } catch {
      // stockage indisponible : le choix vaut pour la session en cours
    }
  }, [theme]);
  return [theme, setTheme];
}

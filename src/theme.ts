export type AppTheme = 'debugger' | 'monochrome' | 'cyberpunk';

export const THEME_STORAGE_KEY = 'arm64-simulator-theme';

export function readStoredTheme(): AppTheme {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  return saved === 'debugger' || saved === 'monochrome' || saved === 'cyberpunk'
    ? saved
    : 'cyberpunk';
}

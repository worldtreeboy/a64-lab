// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest';
import { readStoredTheme, THEME_STORAGE_KEY } from './theme';

describe('theme preference', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('uses Cyberpunk HUD when no preference has been saved', () => {
    expect(readStoredTheme()).toBe('cyberpunk');
  });

  it.each(['cyberpunk', 'debugger', 'monochrome'] as const)(
    'restores the saved %s theme',
    (theme) => {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
      expect(readStoredTheme()).toBe(theme);
    },
  );

  it('falls back to Cyberpunk HUD when the saved value is invalid', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'unknown-theme');
    expect(readStoredTheme()).toBe('cyberpunk');
  });
});

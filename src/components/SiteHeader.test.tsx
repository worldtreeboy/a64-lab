// @vitest-environment jsdom

import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { SiteHeader } from './SiteHeader';

describe('SiteHeader theme picker', () => {
  it('lists Cyberpunk HUD first', () => {
    render(
      <MemoryRouter>
        <SiteHeader theme="cyberpunk" onThemeChange={vi.fn()} />
      </MemoryRouter>,
    );

    const themePicker = screen.getByRole('combobox', { name: 'Theme' });
    const options = within(themePicker).getAllByRole('option');

    expect(options.map((option) => option.textContent)).toEqual([
      'Cyberpunk HUD',
      'Debugger',
      'Black / White',
    ]);
    expect((themePicker as HTMLSelectElement).value).toBe('cyberpunk');
  });
});

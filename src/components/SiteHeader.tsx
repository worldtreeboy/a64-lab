import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import type { AppTheme } from '../theme';

interface SiteHeaderProps {
  theme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
  actions?: ReactNode;
  progressLabel?: string;
}

export function SiteHeader({
  theme,
  onThemeChange,
  actions,
  progressLabel,
}: SiteHeaderProps) {
  return (
    <header className="topbar site-header">
      <NavLink className="brand brand-link" to="/guide" aria-label="A64 Lab guide">
        <div className="brand-mark">A64</div>
        <div>
          <h1>A64 Lab</h1>
          <span>Learn AArch64 by watching state change</span>
        </div>
      </NavLink>

      <nav className="primary-nav" aria-label="Primary navigation">
        <NavLink to="/guide" className={({ isActive }) => isActive ? 'active' : ''}>Guide</NavLink>
        <NavLink to="/lab" className={({ isActive }) => isActive ? 'active' : ''}>Lab</NavLink>
        <NavLink to="/challenges" className={({ isActive }) => isActive ? 'active' : ''}>Challenges</NavLink>
      </nav>

      <div className="site-header-actions">
        {progressLabel && <span className="header-progress">{progressLabel}</span>}
        {actions}
        <label className="example-picker theme-picker">
          <span>Theme</span>
          <select
            value={theme}
            onChange={(event) => onThemeChange(event.target.value as AppTheme)}
            aria-label="Theme"
          >
            <option value="debugger">Debugger</option>
            <option value="monochrome">Black / White</option>
            <option value="cyberpunk">Cyberpunk</option>
          </select>
        </label>
      </div>
    </header>
  );
}

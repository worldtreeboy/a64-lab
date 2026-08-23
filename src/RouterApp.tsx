import { useEffect, useState } from 'react';
import {
  BrowserRouter,
  HashRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import LabPage, { type LabTransfer } from './App';
import { ChallengesPage } from './pages/ChallengesPage';
import { GuidePage } from './pages/GuidePage';
import { ProgressProvider } from './learning/progress';
import { readStoredTheme, THEME_STORAGE_KEY, type AppTheme } from './theme';

interface RouteContentProps {
  theme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
}

function isLabTransfer(value: unknown): value is LabTransfer {
  if (!value || typeof value !== 'object') return false;
  const transfer = value as Partial<LabTransfer>;
  return typeof transfer.program === 'string'
    && typeof transfer.returnTo === 'string'
    && typeof transfer.returnLabel === 'string';
}

function LabRoute(props: RouteContentProps) {
  const location = useLocation();
  const transfer = isLabTransfer(location.state) ? location.state : undefined;
  return <LabPage key={location.key} {...props} transfer={transfer} />;
}

export function AppRoutes(props: RouteContentProps) {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/guide" replace />} />
      <Route path="/guide" element={<GuidePage {...props} />} />
      <Route path="/guide/:lessonId" element={<GuidePage {...props} />} />
      <Route path="/lab" element={<LabRoute {...props} />} />
      <Route path="/challenges" element={<ChallengesPage {...props} />} />
      <Route path="*" element={<Navigate to="/guide" replace />} />
    </Routes>
  );
}

export default function RouterApp() {
  const [theme, setTheme] = useState<AppTheme>(readStoredTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const Router = window.location.protocol === 'file:' ? HashRouter : BrowserRouter;
  return (
    <Router>
      <ProgressProvider>
        <AppRoutes theme={theme} onThemeChange={setTheme} />
      </ProgressProvider>
    </Router>
  );
}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import RouterApp from './RouterApp';
import './styles.css';
import './learning.css';
import './diagram-scale.css';

const syncMotionState = () => {
  document.documentElement.toggleAttribute(
    'data-motion-paused',
    document.visibilityState !== 'visible' || !document.hasFocus(),
  );
};

syncMotionState();
document.addEventListener('visibilitychange', syncMotionState);
window.addEventListener('focus', syncMotionState);
window.addEventListener('blur', syncMotionState);
window.addEventListener('pageshow', syncMotionState);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterApp />
  </StrictMode>,
);

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Bootstrap } from './Bootstrap';
import { captureInstallPrompt } from './installPrompt';
import './index.css';

captureInstallPrompt();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Bootstrap />
  </StrictMode>,
);

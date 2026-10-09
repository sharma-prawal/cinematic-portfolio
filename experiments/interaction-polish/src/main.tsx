import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HeadTracker } from './HeadTracker';
import './style.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode><HeadTracker /></StrictMode>,
);

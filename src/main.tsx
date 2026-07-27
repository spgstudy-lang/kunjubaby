// Patch window.fetch to allow property assignment when fetch is defined as a getter-only property on Window
if (typeof window !== 'undefined' && window.fetch) {
  try {
    let _currentFetch = window.fetch;
    Object.defineProperty(window, 'fetch', {
      get() {
        return _currentFetch;
      },
      set(newFetch) {
        _currentFetch = newFetch;
      },
      configurable: true,
      enumerable: true
    });
  } catch (_e) {
    // Ignore if fetch property descriptor cannot be redefined
  }
}

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

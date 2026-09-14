import './polyfills'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// Prevent elastic bounce / drag-down on header and non-scrollable areas in iOS WebKit
if (typeof window !== 'undefined') {
  document.addEventListener(
    'touchmove',
    (e) => {
      let target = e.target as HTMLElement | null;
      let isScrollable = false;
      while (target && target !== document.body) {
        if (
          target.scrollHeight > target.clientHeight &&
          (getComputedStyle(target).overflowY === 'auto' ||
            getComputedStyle(target).overflowY === 'scroll')
        ) {
          isScrollable = true;
          break;
        }
        target = target.parentElement;
      }
      if (!isScrollable) {
        e.preventDefault();
      }
    },
    { passive: false }
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)


import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app';
import { I18nProvider } from './i18n';
import { ThemeProvider } from './theme/theme';
import './theme/global.css';
import './theme/public.css';

const root = document.getElementById('root')!;
const app = (
  <StrictMode>
    <I18nProvider>
      <ThemeProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ThemeProvider>
    </I18nProvider>
  </StrictMode>
);

// A public page arrives prerendered (docs/74 §5) and is hydrated; the protected areas arrive as an empty shell.
if (root.firstElementChild) hydrateRoot(root, app);
else createRoot(root).render(app);

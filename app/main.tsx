if (import.meta.env.DEV) {
  import('react-grab');
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import './global.css';
import { App } from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

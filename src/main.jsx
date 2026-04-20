import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './App.css';
import { initSupabase } from './lib/supabase.js';

// Attempt to init Supabase (no-op if env vars not set, or package not installed)
initSupabase().then(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});

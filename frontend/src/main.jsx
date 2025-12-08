import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import App from './App.jsx';
import './assets/boxicons-2.0.7/css/boxicons.min.css';
import './assets/css/globals.css';
import './assets/css/index.css';
import './assets/css/grid.css';
import './assets/css/theme.css';
import './i18n';
import {store,persistor} from './redux/store.js';
import { PersistGate } from "redux-persist/integration/react";

createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <StrictMode>
        <App />
      </StrictMode>
    </PersistGate>
  </Provider>
)

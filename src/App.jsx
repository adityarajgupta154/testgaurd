import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import { AuthProvider } from './contexts/AuthContext';
import PWAInstallPrompt from './components/ui/PWAInstallPrompt';
import PWAUpdater from './components/ui/PWAUpdater';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <PWAInstallPrompt />
        <PWAUpdater />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

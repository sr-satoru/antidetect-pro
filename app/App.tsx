import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/auth-context';
import { BrowserProvider } from './contexts/browser-context';
import { BrowserDownloadModal } from './components/browser/browser-download-modal';
import { ProtectedRoute } from './components/auth/protected-route';
import { LoginPage } from './(app)/auth/login/page';
import { RegisterPage } from './(app)/auth/register/page';
import { AppLayout } from './(app)/layout';
import { PerfisPage } from './(app)/perfis/page';
import { CriarPerfilPage } from './(app)/criar-perfil/page';
import { EditarPerfilPage } from './(app)/perfis/editar/page';
import { ProxyPage } from './(app)/proxy/page';
import { ExtensoesPage } from './(app)/extensoes/page';
import { LixeiraPage } from './(app)/lixeira/page';

import { Toaster } from './components/ui/notification';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserProvider>
        <Toaster position="top-center" />
        <BrowserDownloadModal />
        <BrowserRouter>
        <Routes>
          {/* Rotas Públicas de Acesso */}
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />

          {/* Rotas Protegidas (Exigem Login Local ou Acesso Convidado) */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Navigate to="/perfis" replace />} />
              <Route path="/perfis" element={<PerfisPage />} />
              <Route path="/perfis/editar/:id" element={<EditarPerfilPage />} />
              <Route path="/criar-perfil" element={<CriarPerfilPage />} />
              <Route path="/proxy" element={<ProxyPage />} />
              <Route path="/extensoes" element={<ExtensoesPage />} />
              <Route path="/lixeira" element={<LixeiraPage />} />
              <Route path="*" element={<Navigate to="/perfis" replace />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
      </BrowserProvider>
    </AuthProvider>
  );
};

export default App;

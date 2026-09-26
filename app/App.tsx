import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/auth-context';
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

import { Toaster, toast } from './components/ui/notification';

export const App: React.FC = () => {
  // Script de teste: dispara notificações rotativas a cada 5 segundos
  React.useEffect(() => {
    const toasts = [
      () => toast.success('Perfil copiado com sucesso!'),
      () => toast.success('Perfil excluído com sucesso!'),
      () => toast.success('Perfil sincronizado com sucesso!'),
    ];

    let index = 0;
    // Dispara a primeira imediatamente para você já visualizar
    toasts[0]();

    const interval = setInterval(() => {
      index = (index + 1) % toasts.length;
      toasts[index]();
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  return (
    <AuthProvider>
      <Toaster position="top-center" />
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
    </AuthProvider>
  );
};

export default App;

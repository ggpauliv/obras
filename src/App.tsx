import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, RequireAuth } from './auth/AuthContext';
import AppLayout from './layouts/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ObrasPage from './pages/ObrasPage';
import FornecedoresPage from './pages/FornecedoresPage';
import ObraDetalhePage from './pages/ObraDetalhePage';
import ObraFasesPage from './pages/ObraFasesPage';
import ObraFinanceiroPage from './pages/ObraFinanceiroPage';
import ObraFotosPage from './pages/ObraFotosPage';
import ObraAuditoriaPage from './pages/ObraAuditoriaPage';
import ProgressoPage from './pages/ProgressoPage';
import ImportarPage from './pages/ImportarPage';
import UsuariosPage from './pages/UsuariosPage';
import ConfiguracoesPage from './pages/ConfiguracoesPage';
import { OrcamentosUploadPage } from './pages/OrcamentosUploadPage';
import { OrcamentosPage } from './pages/OrcamentosPage';

export default function App() {
  return (
    <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/obras" element={<ObrasPage />} />
          <Route path="/fornecedores" element={<FornecedoresPage />} />
          <Route path="/obra-detalhe" element={<ObraDetalhePage />} />
          <Route path="/obra-fases" element={<ObraFasesPage />} />
          <Route path="/obra-financeiro" element={<ObraFinanceiroPage />} />
          <Route path="/obra-fotos" element={<ObraFotosPage />} />
          <Route path="/obra-auditoria" element={<ObraAuditoriaPage />} />
          <Route path="/progresso" element={<ProgressoPage />} />
          <Route path="/importar" element={<ImportarPage />} />
          <Route path="/usuarios" element={<UsuariosPage />} />
          <Route path="/configuracoes" element={<ConfiguracoesPage />} />
          <Route path="/orcamentos/upload" element={<OrcamentosUploadPage />} />
          <Route path="/orcamentos/comparativa" element={<OrcamentosPage />} />
          <Route path="/orcamentos/aprovacao" element={<OrcamentosPage />} />
          <Route path="/orcamentos" element={<OrcamentosPage />} />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
    </AuthProvider>
  );
}

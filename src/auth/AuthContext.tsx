import React, { createContext, useContext, useState, useCallback } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { apiClient } from '../api/client';
import type { Papel } from './users';

interface SessaoUsuario {
  id: string;
  username: string;
  nome: string;
  email: string;
  papel: Papel;
  empresaId: string | null;
  isSuper: boolean;
}

interface AuthContextValue {
  usuario: SessaoUsuario | null;
  login: (username: string, senha: string) => Promise<boolean>;
  logout: () => void;
  can: (permissao: string) => boolean;
}

const STORAGE_KEY = 'pawliv.sessao';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function carregarSessao(): SessaoUsuario | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SessaoUsuario) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<SessaoUsuario | null>(carregarSessao);

  const login = useCallback(async (username: string, senha: string): Promise<boolean> => {
    try {
      const resp = await apiClient.login(username, senha);
      if (!resp.token) return false;

      apiClient.setToken(resp.token);

      const sessao: SessaoUsuario = {
        id: resp.usuario.id,
        username: resp.usuario.email,
        nome: resp.usuario.nome,
        email: resp.usuario.email,
        papel: resp.usuario.papel || 'Admin',
        empresaId: resp.usuario.empresaId ?? null,
        isSuper: !!resp.usuario.isSuper,
      };
      setUsuario(sessao);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessao));
      // Empresa ativa inicial = empresa do usuário
      if (resp.usuario.empresaId) localStorage.setItem('pawliv.empresaAtiva', resp.usuario.empresaId);
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setUsuario(null);
    apiClient.clearToken();
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('pawliv.empresaAtiva');
  }, []);

  const can = useCallback((_permissao: string) => usuario !== null, [usuario]);

  return (
    <AuthContext.Provider value={{ usuario, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}

/** Protege rotas: redireciona para /login se não houver sessão. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { usuario } = useAuth();
  const location = useLocation();
  if (!usuario) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}

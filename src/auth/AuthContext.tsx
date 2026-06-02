import React, { createContext, useContext, useState, useCallback } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { autenticar, temPermissao, Permissao, Papel } from './users';

interface SessaoUsuario {
  username: string;
  nome: string;
  email: string;
  papel: Papel;
}

interface AuthContextValue {
  usuario: SessaoUsuario | null;
  login: (username: string, senha: string) => boolean;
  logout: () => void;
  can: (permissao: Permissao) => boolean;
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

  const login = useCallback((username: string, senha: string) => {
    const u = autenticar(username, senha);
    if (!u) return false;
    const sessao: SessaoUsuario = { username: u.username, nome: u.nome, email: u.email, papel: u.papel };
    setUsuario(sessao);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessao));
    return true;
  }, []);

  const logout = useCallback(() => {
    setUsuario(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const can = useCallback(
    (permissao: Permissao) => (usuario ? temPermissao(usuario.papel, permissao) : false),
    [usuario]
  );

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

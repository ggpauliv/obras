// Repositório de Usuários — agora via API REST (persistido no PostgreSQL).
// O "login" do usuário é o campo `email`.
import { apiClient } from '../api/client';
import type { Papel } from '../auth/users';

export interface Usuario {
  id?: string;
  nome: string;
  email: string;       // usado como login
  papel: Papel;
  ativo: boolean;
  senha?: string;      // só no cadastro/edição; nunca volta do servidor
  isSuper?: boolean;   // super-admin (acesso geral) — só super define
}

export async function listarUsuarios(): Promise<Usuario[]> {
  try {
    return await apiClient.listarUsuarios();
  } catch {
    return [];
  }
}

/** Cria ou atualiza um usuário (pelo `id`). */
export async function salvarUsuario(u: Usuario): Promise<Usuario> {
  if (u.id) {
    return apiClient.atualizarUsuario(u.id, u);
  }
  return apiClient.criarUsuario(u);
}

export async function removerUsuario(id: string): Promise<void> {
  await apiClient.deletarUsuario(id);
}

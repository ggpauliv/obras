// O cadastro de usuários vive em src/store/usuarios.ts (persistido via API).
import type { Usuario } from '../store/usuarios';

export type Papel = 'Admin' | 'Diretor' | 'Gestor' | 'Engenheiro' | 'Cliente';

/** Permissões granulares do sistema. Adicione novas conforme necessário. */
export type Permissao =
  | 'obras.ver'
  | 'obras.editar'
  | 'fases.editar'
  | 'financeiro.ver'
  | 'financeiro.editar'
  | 'importar.usar'
  | 'fornecedores.ver'
  | 'usuarios.gerenciar'
  | 'configuracoes.gerenciar';

/** Permissões por papel. Admin tem tudo. */
export const PERMISSOES_POR_PAPEL: Record<Papel, Permissao[] | 'all'> = {
  Admin: 'all',
  Diretor: ['obras.ver', 'financeiro.ver', 'fornecedores.ver'],
  Gestor: ['obras.ver', 'obras.editar', 'fases.editar', 'financeiro.ver', 'financeiro.editar', 'importar.usar', 'fornecedores.ver'],
  Engenheiro: ['obras.ver', 'fases.editar', 'importar.usar', 'fornecedores.ver'],
  Cliente: ['obras.ver'],
};

export type { Usuario };

export function temPermissao(papel: Papel, permissao: Permissao): boolean {
  const perms = PERMISSOES_POR_PAPEL[papel];
  return perms === 'all' || perms.includes(permissao);
}

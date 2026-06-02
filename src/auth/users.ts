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

export interface Usuario {
  username: string;
  senha: string;
  nome: string;
  email: string;
  papel: Papel;
}

/** Usuários cadastrados (provisório, até existir banco de dados). */
export const USUARIOS: Usuario[] = [
  {
    username: 'ggpauliv',
    senha: '110989',
    nome: 'Guilherme Pauliv',
    email: 'ggpauliv@pawliv.com.br',
    papel: 'Admin',
  },
];

export function autenticar(username: string, senha: string): Usuario | null {
  const u = USUARIOS.find(
    (x) => x.username.toLowerCase() === username.trim().toLowerCase() && x.senha === senha
  );
  return u ?? null;
}

export function temPermissao(papel: Papel, permissao: Permissao): boolean {
  const perms = PERMISSOES_POR_PAPEL[papel];
  return perms === 'all' || perms.includes(permissao);
}

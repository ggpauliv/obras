// Repositório de Usuários (provisório, até existir banco com hash de senha).
// É a fonte de verdade da autenticação — `autenticar()` lê daqui.
import { read, write } from './db';
import type { Papel } from '../auth/users';

export interface Usuario {
  username: string;
  senha: string;
  nome: string;
  email: string;
  papel: Papel;
  ativo: boolean;
}

const KEY = 'usuarios';

const SEED: Usuario[] = [
  { username: 'ggpauliv', senha: '110989', nome: 'Guilherme Pauliv', email: 'ggpauliv@pawliv.com.br', papel: 'Admin', ativo: true },
];

export function listarUsuarios(): Usuario[] {
  return read<Usuario[]>(KEY, SEED);
}

/** Cria ou atualiza um usuário (upsert pelo `username`). */
export function salvarUsuario(u: Usuario): Usuario {
  const lista = listarUsuarios();
  const idx = lista.findIndex((x) => x.username.toLowerCase() === u.username.toLowerCase());
  if (idx >= 0) lista[idx] = u;
  else lista.push(u);
  write(KEY, lista);
  return u;
}

export function removerUsuario(username: string): void {
  write(KEY, listarUsuarios().filter((u) => u.username.toLowerCase() !== username.toLowerCase()));
}

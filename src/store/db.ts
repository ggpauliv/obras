// Camada de acesso de baixo nível ao armazenamento.
// Hoje usa localStorage; quando migrarmos para banco/API, SÓ este arquivo
// (e os repositórios em src/store/*) mudam — a UI permanece igual.

const PREFIX = 'pawliv.';

/**
 * Lê uma coleção do armazenamento. Se ainda não existir, grava o `seed`
 * (estado inicial) e o retorna — assim a primeira execução já vem populada.
 */
export function read<T>(key: string, seed: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) {
      localStorage.setItem(PREFIX + key, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw) as T;
  } catch {
    return seed;
  }
}

/** Persiste uma coleção no armazenamento. */
export function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error(`Falha ao gravar "${key}" no armazenamento`, e);
  }
}

/** Gera um identificador único simples (suficiente enquanto não há banco). */
export function uid(prefix = ''): string {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

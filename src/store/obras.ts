// Repositório de Obras — API de dados da aplicação.
// A UI deve consumir SOMENTE estas funções, nunca o localStorage direto.
// Assinaturas pensadas para virarem chamadas HTTP no futuro sem mudar a UI.
import { read, write } from './db';
import type { Obra } from './types';
import { OBRAS as OBRAS_SEED } from '../data/obras';

const KEY = 'obras';

/** Lista todas as obras. */
export function listarObras(): Obra[] {
  return read<Obra[]>(KEY, OBRAS_SEED);
}

/** Busca uma obra pelo id. */
export function obterObra(id: string): Obra | undefined {
  return listarObras().find((o) => o.id === id);
}

/**
 * Cria ou atualiza uma obra (upsert pelo `id`) e retorna o registro salvo.
 * Se a obra não tiver `id`, gera um novo.
 */
export function salvarObra(obra: Obra): Obra {
  const obras = listarObras();
  const registro: Obra = { ...obra, id: obra.id || gerarId(obras) };
  const idx = obras.findIndex((o) => o.id === registro.id);
  if (idx >= 0) {
    obras[idx] = registro;
  } else {
    obras.push(registro);
  }
  write(KEY, obras);
  return registro;
}

/** Remove uma obra pelo id. */
export function removerObra(id: string): void {
  write(KEY, listarObras().filter((o) => o.id !== id));
}

/** Gera o próximo id numérico disponível. */
function gerarId(obras: Obra[]): string {
  const maior = obras.reduce((max, o) => {
    const n = parseInt(o.id, 10);
    return Number.isFinite(n) && n > max ? n : max;
  }, 100);
  return String(maior + 1);
}

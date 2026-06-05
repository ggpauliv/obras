// Repositório de Obras — API de dados da aplicação.
// Agora com chamadas assincronas à API REST
import { apiClient } from '../api/client';
import type { Obra } from './types';
import { paraISO, paraBR } from '../utils/datas';

// Converte datas vindas do banco (ISO) para exibição BR.
function deDB(o: any): Obra {
  return { ...o, inicio: paraBR(o.inicio), termino: paraBR(o.termino) };
}
// Converte datas da UI (BR) para ISO antes de enviar ao banco.
function paraDB<T extends { inicio?: string; termino?: string }>(o: T): T {
  return { ...o, inicio: paraISO(o.inicio || ''), termino: paraISO(o.termino || '') };
}

/** Lista todas as obras. */
export async function listarObras(): Promise<Obra[]> {
  return (await apiClient.listarObras()).map(deDB);
}

/** Busca uma obra pelo id. */
export async function obterObra(id: string): Promise<Obra | undefined> {
  if (!id || id === 'undefined' || id === 'null') return undefined;
  try {
    return deDB(await apiClient.obterObra(id));
  } catch {
    return undefined;
  }
}

/** Cria uma nova obra. */
export async function criarObra(obra: Omit<Obra, 'id'>): Promise<Obra> {
  return deDB(await apiClient.criarObra(paraDB(obra)));
}

/** Atualiza uma obra existente. */
export async function atualizarObra(id: string, obra: Partial<Obra>): Promise<Obra> {
  return deDB(await apiClient.atualizarObra(id, paraDB(obra)));
}

/**
 * Cria ou atualiza uma obra.
 * Se tiver `id`, atualiza; senão, cria.
 */
export async function salvarObra(obra: Obra): Promise<Obra> {
  if (obra.id) {
    return atualizarObra(obra.id, obra);
  } else {
    return criarObra(obra);
  }
}

/** Remove uma obra pelo id. */
export async function removerObra(id: string): Promise<void> {
  await apiClient.deletarObra(id);
}

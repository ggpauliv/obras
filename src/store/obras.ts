// Repositório de Obras — API de dados da aplicação.
// Agora com chamadas assincronas à API REST
import { apiClient } from '../api/client';
import type { Obra } from './types';

/** Lista todas as obras. */
export async function listarObras(): Promise<Obra[]> {
  return apiClient.listarObras();
}

/** Busca uma obra pelo id. */
export async function obterObra(id: string): Promise<Obra | undefined> {
  if (!id || id === 'undefined' || id === 'null') return undefined;
  try {
    return await apiClient.obterObra(id);
  } catch {
    return undefined;
  }
}

/** Cria uma nova obra. */
export async function criarObra(obra: Omit<Obra, 'id'>): Promise<Obra> {
  return apiClient.criarObra(obra);
}

/** Atualiza uma obra existente. */
export async function atualizarObra(id: string, obra: Partial<Obra>): Promise<Obra> {
  return apiClient.atualizarObra(id, obra);
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

// Repositório de Despesas (por obra) — com API REST
import { apiClient } from '../api/client';
import type { Despesa } from './types';

/** Lista as despesas de uma obra. */
export async function listarDespesas(obraId: string): Promise<Despesa[]> {
  if (!obraId || obraId === 'undefined' || obraId === 'null') return [];
  try {
    return await apiClient.listarDespesas(obraId);
  } catch {
    return [];
  }
}

/** Cria uma nova despesa. */
export async function criarDespesa(despesa: Omit<Despesa, 'id'>): Promise<Despesa> {
  return apiClient.criarDespesa(despesa);
}

/** Atualiza uma despesa existente. */
export async function atualizarDespesa(id: string, despesa: Partial<Despesa>): Promise<Despesa> {
  return apiClient.atualizarDespesa(id, despesa);
}

/** Cria ou atualiza uma despesa. */
export async function salvarDespesa(despesa: Despesa): Promise<Despesa> {
  if (despesa.id) {
    return atualizarDespesa(despesa.id, despesa);
  } else {
    return criarDespesa(despesa);
  }
}

/** Remove uma despesa pelo id. */
export async function removerDespesa(id: string): Promise<void> {
  await apiClient.deletarDespesa(id);
}

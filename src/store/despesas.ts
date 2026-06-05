// Repositório de Despesas (por obra) — com API REST
import { apiClient } from '../api/client';
import type { Despesa } from './types';
import { paraISO, paraBR, hojeISO } from '../utils/datas';

// Data do banco (ISO) -> exibição BR.
function deDB(d: any): Despesa {
  return { ...d, data: paraBR(d.data) };
}
// Data da UI (BR) -> ISO; "data" é obrigatória no banco, usa hoje como fallback.
function paraDB<T extends { data?: string }>(d: T): T {
  return { ...d, data: paraISO(d.data || '') || hojeISO() };
}

/** Lista as despesas de uma obra. */
export async function listarDespesas(obraId: string): Promise<Despesa[]> {
  if (!obraId || obraId === 'undefined' || obraId === 'null') return [];
  try {
    return (await apiClient.listarDespesas(obraId)).map(deDB);
  } catch {
    return [];
  }
}

/** Cria uma nova despesa. */
export async function criarDespesa(despesa: Omit<Despesa, 'id'>): Promise<Despesa> {
  return deDB(await apiClient.criarDespesa(paraDB(despesa)));
}

/** Atualiza uma despesa existente. */
export async function atualizarDespesa(id: string, despesa: Partial<Despesa>): Promise<Despesa> {
  return deDB(await apiClient.atualizarDespesa(id, paraDB(despesa)));
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

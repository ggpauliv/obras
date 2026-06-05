// Repositório de Fases (por obra) — com API REST
import { apiClient } from '../api/client';
import type { Fase } from './types';
import { paraISO, paraBR, hojeISO } from '../utils/datas';

// Datas do banco (ISO) -> exibição BR.
function deDB(f: any): Fase {
  return { ...f, inicio: paraBR(f.inicio), termino: paraBR(f.termino) };
}
// Datas da UI (BR) -> ISO. Como inicio/termino são obrigatórios no banco,
// usa a data de hoje como fallback quando vierem vazias.
function paraDB<T extends { inicio?: string; termino?: string }>(f: T): T {
  return { ...f, inicio: paraISO(f.inicio || '') || hojeISO(), termino: paraISO(f.termino || '') || hojeISO() };
}

/** Lista as fases de uma obra, ordenadas. */
export async function listarFases(obraId: string): Promise<Fase[]> {
  if (!obraId || obraId === 'undefined' || obraId === 'null') return [];
  try {
    const fases = await apiClient.listarFases(obraId);
    return fases.map(deDB).sort((a, b) => a.ordem - b.ordem);
  } catch {
    return [];
  }
}

/** Cria uma nova fase. */
export async function criarFase(fase: Omit<Fase, 'id'>): Promise<Fase> {
  return deDB(await apiClient.criarFase(paraDB(fase)));
}

/** Atualiza uma fase existente. */
export async function atualizarFase(id: string, fase: Partial<Fase>): Promise<Fase> {
  return deDB(await apiClient.atualizarFase(id, paraDB(fase)));
}

/** Cria ou atualiza uma fase. */
export async function salvarFase(fase: Fase): Promise<Fase> {
  if (fase.id) {
    return atualizarFase(fase.id, fase);
  } else {
    return criarFase(fase);
  }
}

/** Remove uma fase pelo id. */
export async function removerFase(id: string): Promise<void> {
  await apiClient.deletarFase(id);
}

/**
 * Acrescenta fases importadas (IA) a uma obra, continuando a numeração de ordem.
 */
export async function adicionarFasesImportadas(
  obraId: string,
  importadas: Array<{ nome: string; inicio?: string; termino?: string; categoria?: Fase['categoria']; descricao?: string }>
): Promise<Fase[]> {
  const fases = await apiClient.listarFases(obraId);
  const baseOrdem = fases.length > 0 ? Math.max(...fases.map((f) => f.ordem)) : 0;

  const novas: Fase[] = [];
  for (let i = 0; i < importadas.length; i++) {
    const imp = importadas[i];
    const novaFase = await criarFase({
      obraId,
      ordem: baseOrdem + i + 1,
      nome: imp.nome,
      inicio: imp.inicio || '',
      termino: imp.termino || '',
      pct: 0,
      status: 'nao_iniciada',
      categoria: imp.categoria,
      descricao: imp.descricao,
    } as Omit<Fase, 'id'>);
    novas.push(novaFase);
  }
  return novas;
}

// Repositório de Fases (por obra).
import { read, write, uid } from './db';
import type { Fase, FaseStatus } from './types';

const KEY = 'fases';

// Seed: fases da obra 101 (antes hardcoded em ObraFasesPage).
const FASES_SEED: Fase[] = [
  { id: 'f101-1', obraId: '101', ordem: 1, nome: 'Fundações', inicio: '15/03/23', termino: '20/05/23', pct: 100, status: 'concluida' },
  { id: 'f101-2', obraId: '101', ordem: 2, nome: 'Estrutura', inicio: '21/05/23', termino: '10/10/23', pct: 100, status: 'concluida' },
  { id: 'f101-3', obraId: '101', ordem: 3, nome: 'Alvenaria', inicio: '11/10/23', termino: '28/02/24', pct: 45, status: 'andamento' },
  { id: 'f101-4', obraId: '101', ordem: 4, nome: 'Instalações', inicio: '01/03/24', termino: '15/07/24', pct: 15, status: 'atrasada' },
  { id: 'f101-5', obraId: '101', ordem: 5, nome: 'Acabamento', inicio: '16/07/24', termino: '15/11/24', pct: 0, status: 'nao_iniciada' },
];

function todas(): Fase[] {
  return read<Fase[]>(KEY, FASES_SEED);
}

/** Lista as fases de uma obra, ordenadas. */
export function listarFases(obraId: string): Fase[] {
  return todas()
    .filter((f) => f.obraId === obraId)
    .sort((a, b) => a.ordem - b.ordem);
}

/** Cria ou atualiza uma fase (upsert pelo `id`). */
export function salvarFase(fase: Fase): Fase {
  const fases = todas();
  const registro: Fase = { ...fase, id: fase.id || uid('f') };
  const idx = fases.findIndex((f) => f.id === registro.id);
  if (idx >= 0) fases[idx] = registro;
  else fases.push(registro);
  write(KEY, fases);
  return registro;
}

/** Remove uma fase pelo id. */
export function removerFase(id: string): void {
  write(KEY, todas().filter((f) => f.id !== id));
}

/**
 * Acrescenta fases importadas (IA) a uma obra, continuando a numeração de ordem.
 * Aceita o formato extraído (nome/inicio/termino/categoria/descricao).
 */
export function adicionarFasesImportadas(
  obraId: string,
  importadas: Array<{ nome: string; inicio?: string; termino?: string; categoria?: Fase['categoria']; descricao?: string }>
): Fase[] {
  const fases = todas();
  const baseOrdem = fases.filter((f) => f.obraId === obraId).reduce((max, f) => Math.max(max, f.ordem), 0);
  const novas: Fase[] = importadas.map((imp, i) => ({
    id: uid('f'),
    obraId,
    ordem: baseOrdem + i + 1,
    nome: imp.nome,
    inicio: imp.inicio || '',
    termino: imp.termino || '',
    pct: 0,
    status: 'nao_iniciada' as FaseStatus,
    categoria: imp.categoria,
    descricao: imp.descricao,
  }));
  write(KEY, [...fases, ...novas]);
  return novas;
}

// Repositório de Despesas (por obra).
import { read, write, uid } from './db';
import type { Despesa } from './types';

const KEY = 'despesas';

function todas(): Despesa[] {
  return read<Despesa[]>(KEY, []);
}

/** Lista as despesas de uma obra. */
export function listarDespesas(obraId: string): Despesa[] {
  return todas().filter((d) => d.obraId === obraId);
}

/** Cria ou atualiza uma despesa (upsert pelo `id`). */
export function salvarDespesa(despesa: Despesa): Despesa {
  const despesas = todas();
  const registro: Despesa = { ...despesa, id: despesa.id || uid('d') };
  const idx = despesas.findIndex((d) => d.id === registro.id);
  if (idx >= 0) despesas[idx] = registro;
  else despesas.push(registro);
  write(KEY, despesas);
  return registro;
}

/** Remove uma despesa pelo id. */
export function removerDespesa(id: string): void {
  write(KEY, todas().filter((d) => d.id !== id));
}

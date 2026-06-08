// Cálculo de impacto de ocorrências no prazo da obra (modelo híbrido).

// Tipos que, por padrão, impactam o cronograma (quando não há valor manual).
const TIPOS_IMPACTO = new Set(['Chuva', 'Problema', 'Atraso', 'Paralisação', 'Acidente']);

/** Impacto automático sugerido (em dias), pela duração do evento. */
export function impactoAuto(o: any): number {
  if (!TIPOS_IMPACTO.has(o.tipo)) return 0;
  const ini = o.dataInicio ? new Date(o.dataInicio).getTime() : null;
  if (!ini) return 0;
  const fim = o.dataFim ? new Date(o.dataFim).getTime() : Date.now(); // em aberto: cresce até hoje
  const horas = (fim - ini) / 3_600_000;
  return Math.max(1, Math.ceil(horas / 24));
}

/** Impacto efetivo: usa o valor manual quando definido; senão, o automático. */
export function impactoEfetivo(o: any): number {
  if (o.impactoDias !== null && o.impactoDias !== undefined && o.impactoDias !== '') {
    return Number(o.impactoDias) || 0;
  }
  return impactoAuto(o);
}

/** Soma do impacto (dias) de uma lista de ocorrências. */
export function impactoTotal(lista: any[]): number {
  return lista.reduce((s, o) => s + impactoEfetivo(o), 0);
}

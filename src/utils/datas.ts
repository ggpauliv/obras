// Conversão entre o formato exibido (DD/MM/AAAA) e o do <input type="date"> (AAAA-MM-DD).

/** "15/01/2024" -> "2024-01-15" (para preencher um input date). */
export function brParaInput(br: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{2,4})$/.exec((br || '').trim());
  if (!m) return '';
  let ano = m[3];
  if (ano.length === 2) ano = '20' + ano;
  return `${ano}-${m[2]}-${m[1]}`;
}

/** "2024-01-15" -> "15/01/2024" (para salvar/exibir). */
export function inputParaBr(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((iso || '').trim());
  if (!m) return '';
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** Hoje no formato ISO (AAAA-MM-DD). */
export function hojeISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Normaliza qualquer data para ISO (AAAA-MM-DD), aceito pelo PostgreSQL.
 * Aceita "DD/MM/AAAA", "DD/MM/AA" ou já-ISO ("AAAA-MM-DD" / timestamp ISO).
 * Retorna "" se não reconhecer.
 */
export function paraISO(s: string): string {
  const v = (s || '').trim();
  if (!v) return '';
  const br = /^(\d{2})\/(\d{2})\/(\d{2,4})$/.exec(v);
  if (br) {
    let ano = br[3];
    if (ano.length === 2) ano = '20' + ano;
    return `${ano}-${br[2]}-${br[1]}`;
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  return '';
}

/**
 * Normaliza qualquer data para exibição BR (DD/MM/AAAA).
 * Aceita ISO ("AAAA-MM-DD" ou timestamp) ou já-BR. Retorna a entrada se não reconhecer.
 */
export function paraBR(s: string): string {
  const v = (s || '').trim();
  if (!v) return '';
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  return v;
}

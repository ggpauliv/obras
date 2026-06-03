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

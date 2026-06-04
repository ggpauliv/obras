// Estado de navegação: qual obra está "aberta" nas telas de detalhe.
const KEY = 'pawliv.obraAtiva';

// Limpa IDs antigos no formato numérico (legado localStorage)
const raw = localStorage.getItem(KEY);
if (raw && /^"\d+"$/.test(raw)) localStorage.removeItem(KEY);

export function getObraAtivaId(): string {
  try {
    const val = localStorage.getItem(KEY);
    if (!val) return '';
    const parsed = JSON.parse(val);
    // Só aceita UUIDs (formato 8-4-4-4-12)
    if (typeof parsed === 'string' && /^[0-9a-f-]{36}$/i.test(parsed)) return parsed;
    return '';
  } catch {
    return '';
  }
}

export function setObraAtivaId(id: string): void {
  localStorage.setItem(KEY, JSON.stringify(id));
}

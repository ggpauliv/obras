// Validação de arquivos para a importação por IA.

/** Tamanho máximo aceito (20 MB). */
export const TAMANHO_MAX_MB = 20;
const TAMANHO_MAX_BYTES = TAMANHO_MAX_MB * 1024 * 1024;

/** Extensões aceitas (cronogramas, planilhas, documentos e imagens de notas). */
export const EXTENSOES_ACEITAS = ['pdf', 'xlsx', 'xls', 'docx', 'csv', 'png', 'jpg', 'jpeg', 'webp'];

function extensao(nome: string): string {
  const i = nome.lastIndexOf('.');
  return i >= 0 ? nome.slice(i + 1).toLowerCase() : '';
}

/** Formata bytes em uma string legível (ex.: "12,3 MB"). */
export function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

/**
 * Valida tipo e tamanho do arquivo.
 * Retorna uma mensagem de erro, ou `null` se o arquivo for válido.
 */
export function validarArquivo(arquivo: File): string | null {
  const ext = extensao(arquivo.name);
  if (!EXTENSOES_ACEITAS.includes(ext)) {
    return `Tipo de arquivo não suportado (.${ext || '?'}). Use: ${EXTENSOES_ACEITAS.map((e) => e.toUpperCase()).join(', ')}.`;
  }
  if (arquivo.size > TAMANHO_MAX_BYTES) {
    return `Arquivo muito grande (${formatarTamanho(arquivo.size)}). O limite é ${TAMANHO_MAX_MB} MB.`;
  }
  if (arquivo.size === 0) {
    return 'O arquivo está vazio.';
  }
  return null;
}

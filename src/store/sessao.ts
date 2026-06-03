// Estado de navegação: qual obra está "aberta" nas telas de detalhe.
// Como as rotas de detalhe (/obra-fases, /obra-financeiro, ...) não carregam
// o id na URL, guardamos a obra ativa aqui (selecionada na lista de obras).
import { read, write } from './db';

const KEY = 'obraAtiva';
const PADRAO = '101';

export function getObraAtivaId(): string {
  return read<string>(KEY, PADRAO);
}

export function setObraAtivaId(id: string): void {
  write(KEY, id);
}

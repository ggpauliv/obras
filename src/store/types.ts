// Tipos compartilhados de domínio.
// Fonte única de verdade — usados tanto pela UI quanto pela camada de dados.
// Quando migrarmos para banco/API, estes tipos continuam valendo (são o "contrato").

export type StatusKey = 'andamento' | 'atrasada' | 'planejamento' | 'concluida';

export interface Obra {
  id: string;
  nome: string;
  cliente: string;
  tipo: string;
  inicio: string;
  termino: string;
  pct: number;
  status: StatusKey;
  /** Fases conhecidas da obra (para vincular itens importados). */
  fases?: string[];
}

export type FaseStatus = 'nao_iniciada' | 'andamento' | 'atrasada' | 'concluida';

export interface Fase {
  id: string;
  obraId: string;
  ordem: number;
  nome: string;
  inicio: string;
  termino: string;
  /** Progresso 0–100. */
  pct: number;
  status: FaseStatus;
  /** Categoria opcional (origem de importação por IA). */
  categoria?: 'compra' | 'instalacao' | 'manutencao' | 'servico' | 'etapa_obra';
  descricao?: string;
}

export interface Despesa {
  id: string;
  obraId: string;
  /** Fase vinculada, quando houver. */
  faseId?: string | null;
  descricao: string;
  categoria: string;
  valor: string;
  data: string;
  fornecedor?: string | null;
  cnpj?: string | null;
  numeroNota?: string | null;
  chaveAcesso?: string | null;
}

export type FornecedorStatus = 'ativo' | 'pendente' | 'inativo';

export interface Fornecedor {
  id: string;
  nome: string;
  categoria: string;
  cnpj: string;
  contato: string;
  obras: number;
  status: FornecedorStatus;
}

export interface EventoAuditoria {
  id: string;
  obraId?: string | null;
  tipo: string;
  titulo: string;
  descricao: string;
  usuario: string;
  data: string; // ISO
}

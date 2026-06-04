// Repositório de Orçamentos — com API REST
import { apiClient } from '../api/client';

export interface Orcamento {
  id: string;
  obraId: string;
  fornecedorId?: string;
  fornecedorNome?: string;
  nome: string;
  descricao?: string;
  valorTotal: number;
  prazoDias?: number;
  status: 'ativo' | 'vencido' | 'aceito' | 'descartado';
  dataEmissao?: string;
  numeroCotacao?: string;
  criado_em?: string;
}

export interface LinhaOrcamento {
  id: string;
  orcamentoId: string;
  itemNumero?: string;
  descricao: string;
  quantidade?: number;
  valorUnitario?: number;
  valorTotal: number;
  categoria?: string;
}

/** Lista orçamentos de uma obra. */
export async function listarOrcamentos(obraId: string): Promise<Orcamento[]> {
  return apiClient.listarOrcamentos(obraId);
}

/** Obtém detalhes de um orçamento com suas linhas. */
export async function obterOrcamento(id: string): Promise<Orcamento & { linhas: LinhaOrcamento[] }> {
  return apiClient.obterOrcamento(id);
}

/** Cria um novo orçamento. */
export async function criarOrcamento(orcamento: Omit<Orcamento, 'id'>): Promise<Orcamento> {
  return apiClient.criarOrcamento(orcamento);
}

/** Remove um orçamento. */
export async function removerOrcamento(id: string): Promise<void> {
  await apiClient.deletarOrcamento(id);
}

/** Analisa planilha Excel com IA, retorna dados sem salvar. */
export async function analisarOrcamento(arquivo: string): Promise<any> {
  return apiClient.analisarOrcamento(arquivo);
}

/** Salva orçamento já analisado no banco. */
export async function salvarOrcamento(obraId: string, dados: any): Promise<any> {
  return apiClient.salvarOrcamento(obraId, dados);
}

/** Compara orçamentos de uma obra. */
export async function compararOrcamentos(obraId: string): Promise<any> {
  return apiClient.compararOrcamentos(obraId);
}

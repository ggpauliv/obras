// Repositório de Fornecedores — com API REST
import { apiClient } from '../api/client';
import type { Fornecedor } from './types';

export async function listarFornecedores(): Promise<Fornecedor[]> {
  try {
    return await apiClient.listarFornecedores();
  } catch {
    return [];
  }
}

export async function criarFornecedor(f: Omit<Fornecedor, 'id'>): Promise<Fornecedor> {
  return apiClient.criarFornecedor(f);
}

export async function atualizarFornecedor(id: string, f: Partial<Fornecedor>): Promise<Fornecedor> {
  return apiClient.atualizarFornecedor(id, f);
}

export async function salvarFornecedor(f: Fornecedor): Promise<Fornecedor> {
  if (f.id) {
    return atualizarFornecedor(f.id, f);
  } else {
    return criarFornecedor(f);
  }
}

export async function removerFornecedor(id: string): Promise<void> {
  await apiClient.deletarFornecedor(id);
}

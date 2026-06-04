/**
 * Camada de acesso que usa a API REST em vez de localStorage
 * Mesma interface do db.ts original — UI não precisa mudar
 */

import { apiClient } from '../api/client';

/**
 * Converte snake_case do banco para camelCase do frontend
 */
function convertKeysFromSnakeCase(obj: any): any {
  if (!obj) return obj;

  if (Array.isArray(obj)) {
    return obj.map(convertKeysFromSnakeCase);
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  const converted: any = {};
  for (const [key, value] of Object.entries(obj)) {
    // Converter snake_case para camelCase
    const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    converted[camelKey] = convertKeysFromSnakeCase(value);
  }
  return converted;
}

/**
 * Converte camelCase do frontend para snake_case do banco
 */
function convertKeysToSnakeCase(obj: any): any {
  if (!obj) return obj;

  if (Array.isArray(obj)) {
    return obj.map(convertKeysToSnakeCase);
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  const converted: any = {};
  for (const [key, value] of Object.entries(obj)) {
    // Converter camelCase para snake_case
    const snakeKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    converted[snakeKey] = convertKeysToSnakeCase(value);
  }
  return converted;
}

/**
 * Lê uma coleção da API
 * @param key - chave/tipo de recurso ('obras', 'fases', etc)
 * @param seed - valor padrão se houver erro
 * @param params - parâmetros de query (ex: { obraId: '...' })
 */
export async function read<T>(key: string, seed: T, params?: Record<string, string>): Promise<T> {
  try {
    let result: any[] = [];

    switch (key) {
      case 'obras':
        result = await apiClient.listarObras();
        break;
      case 'fases':
        result = await apiClient.listarFases(params?.obraId);
        break;
      case 'despesas':
        result = await apiClient.listarDespesas(params?.obraId);
        break;
      case 'fornecedores':
        result = await apiClient.listarFornecedores();
        break;
      case 'auditoria':
        result = await apiClient.listarAuditoria(params?.obraId);
        break;
      default:
        console.warn(`⚠️  Tipo desconhecido: ${key}`);
        return seed;
    }

    return convertKeysFromSnakeCase(result) as T;
  } catch (error) {
    console.error(`❌ Erro ao ler ${key} da API:`, error);
    return seed;
  }
}

/**
 * Persiste uma entidade via API
 * @param key - tipo de recurso ('obra', 'fase', etc)
 * @param value - dados a persistir
 * @param action - 'create' | 'update' | 'delete'
 */
export async function write<T>(key: string, value: T, action: 'create' | 'update' | 'delete' = 'update'): Promise<T | null> {
  try {
    const data = convertKeysToSnakeCase(value);

    switch (key) {
      case 'obra':
        if (action === 'create') {
          return await apiClient.criarObra(data);
        } else if (action === 'update') {
          return await apiClient.atualizarObra((value as any).id, data);
        } else if (action === 'delete') {
          await apiClient.deletarObra((value as any).id);
          return null;
        }
        break;

      case 'fase':
        if (action === 'create') {
          return await apiClient.criarFase(data);
        } else if (action === 'update') {
          return await apiClient.atualizarFase((value as any).id, data);
        } else if (action === 'delete') {
          await apiClient.deletarFase((value as any).id);
          return null;
        }
        break;

      case 'despesa':
        if (action === 'create') {
          return await apiClient.criarDespesa(data);
        } else if (action === 'update') {
          return await apiClient.atualizarDespesa((value as any).id, data);
        } else if (action === 'delete') {
          await apiClient.deletarDespesa((value as any).id);
          return null;
        }
        break;

      case 'fornecedor':
        if (action === 'create') {
          return await apiClient.criarFornecedor(data);
        } else if (action === 'update') {
          return await apiClient.atualizarFornecedor((value as any).id, data);
        } else if (action === 'delete') {
          await apiClient.deletarFornecedor((value as any).id);
          return null;
        }
        break;

      default:
        console.warn(`⚠️  Tipo desconhecido: ${key}`);
        return null;
    }
    return null;
  } catch (error) {
    console.error(`❌ Erro ao escrever ${key} na API:`, error);
    throw error;
  }
}

/**
 * Gera um identificador (agora pelo backend via DB)
 * Frontend não precisa gerar IDs — backend o faz
 */
export function uid(prefix = ''): string {
  // Retornar um placeholder; o servidor gerará o UUID real
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/**
 * Cliente HTTP centralizado para a API REST
 * Gerencia token JWT, requisições e erros
 */

// Em produção o build define REACT_APP_API_URL="" (string vazia) para usar
// o mesmo origin (nginx faz o proxy de /api). Usamos ?? para respeitar a
// string vazia; só caímos no localhost quando a variável é indefinida (dev).
const API_BASE_URL = process.env.REACT_APP_API_URL ?? 'http://localhost:3001';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function convertKeys(obj: any): any {
  if (Array.isArray(obj)) return obj.map(convertKeys);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [snakeToCamel(k), convertKeys(v)])
    );
  }
  return obj;
}

class APIClient {
  private token: string | null = null;

  constructor() {
    // Carregar token do localStorage se existir
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  private async request<T>(url: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options;

    // Adicionar token ao header se existir
    const finalHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (this.token) {
      finalHeaders.Authorization = `Bearer ${this.token}`;
    }

    const config: RequestInit = {
      method,
      headers: finalHeaders,
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(`${API_BASE_URL}${url}`, config);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ erro: 'Erro desconhecido' }));

        if (response.status === 401) {
          // Token inválido/expirado
          this.clearToken();
          window.location.href = '/auth/login';
        }

        throw new Error(error.erro || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return convertKeys(data);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`❌ Erro na requisição ${method} ${url}:`, error);
      }
      throw error;
    }
  }

  // Autenticação
  async login(email: string, senha: string): Promise<{ token: string; usuario: any }> {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: { email, senha },
    });
  }

  async register(nome: string, email: string, senha: string): Promise<{ token: string; usuario: any }> {
    return this.request('/api/auth/register', {
      method: 'POST',
      body: { nome, email, senha },
    });
  }

  // Obras
  async listarObras(): Promise<any[]> {
    return this.request('/api/obras');
  }

  async obterObra(id: string): Promise<any> {
    return this.request(`/api/obras/${id}`);
  }

  async criarObra(dados: any): Promise<any> {
    return this.request('/api/obras', { method: 'POST', body: dados });
  }

  async atualizarObra(id: string, dados: any): Promise<any> {
    return this.request(`/api/obras/${id}`, { method: 'PUT', body: dados });
  }

  async deletarObra(id: string): Promise<any> {
    return this.request(`/api/obras/${id}`, { method: 'DELETE' });
  }

  // Fases
  async listarFases(obraId?: string): Promise<any[]> {
    const url = obraId ? `/api/fases?obraId=${obraId}` : '/api/fases';
    return this.request(url);
  }

  async criarFase(dados: any): Promise<any> {
    return this.request('/api/fases', { method: 'POST', body: dados });
  }

  async atualizarFase(id: string, dados: any): Promise<any> {
    return this.request(`/api/fases/${id}`, { method: 'PUT', body: dados });
  }

  async deletarFase(id: string): Promise<any> {
    return this.request(`/api/fases/${id}`, { method: 'DELETE' });
  }

  // Despesas
  async listarDespesas(obraId?: string): Promise<any[]> {
    const url = obraId ? `/api/despesas?obraId=${obraId}` : '/api/despesas';
    return this.request(url);
  }

  async criarDespesa(dados: any): Promise<any> {
    return this.request('/api/despesas', { method: 'POST', body: dados });
  }

  async atualizarDespesa(id: string, dados: any): Promise<any> {
    return this.request(`/api/despesas/${id}`, { method: 'PUT', body: dados });
  }

  async deletarDespesa(id: string): Promise<any> {
    return this.request(`/api/despesas/${id}`, { method: 'DELETE' });
  }

  // Fornecedores
  async listarFornecedores(): Promise<any[]> {
    return this.request('/api/fornecedores');
  }

  async criarFornecedor(dados: any): Promise<any> {
    return this.request('/api/fornecedores', { method: 'POST', body: dados });
  }

  async atualizarFornecedor(id: string, dados: any): Promise<any> {
    return this.request(`/api/fornecedores/${id}`, { method: 'PUT', body: dados });
  }

  async deletarFornecedor(id: string): Promise<any> {
    return this.request(`/api/fornecedores/${id}`, { method: 'DELETE' });
  }

  // Usuários
  async listarUsuarios(): Promise<any[]> {
    return this.request('/api/usuarios');
  }
  async criarUsuario(dados: any): Promise<any> {
    return this.request('/api/usuarios', { method: 'POST', body: dados });
  }
  async atualizarUsuario(id: string, dados: any): Promise<any> {
    return this.request(`/api/usuarios/${id}`, { method: 'PUT', body: dados });
  }
  async deletarUsuario(id: string): Promise<any> {
    return this.request(`/api/usuarios/${id}`, { method: 'DELETE' });
  }

  // Ocorrências (Diário de Obra)
  async listarOcorrencias(obraId?: string): Promise<any[]> {
    const url = obraId ? `/api/ocorrencias?obraId=${obraId}` : '/api/ocorrencias';
    return this.request(url);
  }
  async criarOcorrencia(dados: any): Promise<any> {
    return this.request('/api/ocorrencias', { method: 'POST', body: dados });
  }
  async atualizarOcorrencia(id: string, dados: any): Promise<any> {
    return this.request(`/api/ocorrencias/${id}`, { method: 'PUT', body: dados });
  }
  async deletarOcorrencia(id: string): Promise<any> {
    return this.request(`/api/ocorrencias/${id}`, { method: 'DELETE' });
  }

  // Auditoria
  async listarAuditoria(obraId?: string): Promise<any[]> {
    const url = obraId ? `/api/auditoria?obraId=${obraId}` : '/api/auditoria';
    return this.request(url);
  }

  // Orçamentos
  async listarOrcamentos(obraId?: string): Promise<any[]> {
    const url = obraId ? `/api/orcamentos?obraId=${obraId}` : '/api/orcamentos';
    return this.request(url);
  }

  async obterOrcamento(id: string): Promise<any> {
    return this.request(`/api/orcamentos/${id}`);
  }

  async criarOrcamento(dados: any): Promise<any> {
    return this.request('/api/orcamentos', { method: 'POST', body: dados });
  }

  async deletarOrcamento(id: string): Promise<any> {
    return this.request(`/api/orcamentos/${id}`, { method: 'DELETE' });
  }

  async analisarOrcamento(arquivo: string): Promise<any> {
    return this.request('/api/orcamentos/analisar', { method: 'POST', body: { arquivo } });
  }

  async salvarOrcamento(obraId: string, dados: any): Promise<any> {
    return this.request('/api/orcamentos/salvar', { method: 'POST', body: { obraId, dados } });
  }

  async renomearOrcamento(id: string, nome: string): Promise<any> {
    return this.request(`/api/orcamentos/${id}`, { method: 'PUT', body: { nome } });
  }

  /** Gera o Excel (com gráficos nativos) no backend e retorna o arquivo como Blob. */
  async exportarOrcamentosExcel(payload: any): Promise<Blob> {
    const resp = await fetch(`${API_BASE_URL}/api/orcamentos/exportar-excel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) throw new Error('Falha ao gerar o Excel no servidor');
    return resp.blob();
  }

  /** Reimporta um .xlsx editado (com aba _meta) e atualiza os orçamentos. */
  async reimportarOrcamentosExcel(arquivoBase64: string): Promise<{ sucesso: boolean; atualizados: number }> {
    return this.request('/api/orcamentos/reimportar', { method: 'POST', body: { arquivo: arquivoBase64 } });
  }

  async atualizarCategoriaItem(obraId: string, itemNumero: string, categoria: string): Promise<any> {
    return this.request('/api/orcamentos/categoria', { method: 'PUT', body: { obraId, itemNumero, categoria } });
  }

  async compararOrcamentos(obraId: string): Promise<any> {
    return this.request(`/api/orcamentos/comparar?obraId=${obraId}`);
  }

  // Processamento de documentos
  async processarDocumento(content: any): Promise<any> {
    return this.request('/api/process-document', {
      method: 'POST',
      body: { content },
    });
  }

  // Aprovação de orçamentos (com itens selecionados)
  async aprovarOrcamento(id: string, opts?: { linhaIds?: string[]; categorias?: string[] }): Promise<any> {
    return this.request(`/api/orcamentos/${id}/aprovar`, {
      method: 'POST',
      body: { linhaIds: opts?.linhaIds || [], categorias: opts?.categorias || [] },
    });
  }

  async excluirItensOrcamento(id: string, linhaIds: string[]): Promise<any> {
    return this.request(`/api/orcamentos/${id}/itens`, { method: 'DELETE', body: { linhaIds } });
  }
}

// Exportar instância singleton
export const apiClient = new APIClient();

// Repositório de Fornecedores.
import { read, write, uid } from './db';
import type { Fornecedor } from './types';

const KEY = 'fornecedores';

const SEED: Fornecedor[] = [
  { id: 'fo1', nome: 'Cimentos Apex Ltda', categoria: 'Materiais Básicos', cnpj: '12.345.678/0001-90', contato: 'comercial@apex.com.br', obras: 4, status: 'ativo' },
  { id: 'fo2', nome: 'Aços Meridional S.A.', categoria: 'Estrutura Metálica', cnpj: '98.765.432/0001-10', contato: 'vendas@meridional.com', obras: 3, status: 'ativo' },
  { id: 'fo3', nome: 'ElétricaTotal Instalações', categoria: 'Instalações Elétricas', cnpj: '45.678.912/0001-33', contato: 'contato@eletricatotal.com', obras: 2, status: 'pendente' },
  { id: 'fo4', nome: 'HidroMax Tubulações', categoria: 'Hidráulica', cnpj: '32.165.498/0001-77', contato: 'orcamento@hidromax.com', obras: 1, status: 'ativo' },
  { id: 'fo5', nome: 'Locações Brasil Equipamentos', categoria: 'Locação de Máquinas', cnpj: '11.222.333/0001-44', contato: 'locacao@lbe.com.br', obras: 5, status: 'ativo' },
  { id: 'fo6', nome: 'Acabamentos Premium', categoria: 'Acabamentos', cnpj: '55.666.777/0001-22', contato: 'sac@premium.com', obras: 0, status: 'inativo' },
];

export function listarFornecedores(): Fornecedor[] {
  return read<Fornecedor[]>(KEY, SEED);
}

export function salvarFornecedor(f: Fornecedor): Fornecedor {
  const lista = listarFornecedores();
  const registro: Fornecedor = { ...f, id: f.id || uid('fo') };
  const idx = lista.findIndex((x) => x.id === registro.id);
  if (idx >= 0) lista[idx] = registro;
  else lista.push(registro);
  write(KEY, lista);
  return registro;
}

export function removerFornecedor(id: string): void {
  write(KEY, listarFornecedores().filter((f) => f.id !== id));
}

import React from 'react';

type StatusKey = 'ativo' | 'pendente' | 'inativo';

const STATUS: Record<StatusKey, { label: string; chip: string }> = {
  ativo: { label: 'Ativo', chip: 'bg-success/10 text-success border-success/20' },
  pendente: { label: 'Pendente', chip: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20' },
  inativo: { label: 'Inativo', chip: 'bg-outline-variant/30 text-on-surface-variant border-outline-variant' },
};

interface Fornecedor { nome: string; categoria: string; cnpj: string; contato: string; obras: number; status: StatusKey; }

const FORNECEDORES: Fornecedor[] = [
  { nome: 'Cimentos Apex Ltda', categoria: 'Materiais Básicos', cnpj: '12.345.678/0001-90', contato: 'comercial@apex.com.br', obras: 4, status: 'ativo' },
  { nome: 'Aços Meridional S.A.', categoria: 'Estrutura Metálica', cnpj: '98.765.432/0001-10', contato: 'vendas@meridional.com', obras: 3, status: 'ativo' },
  { nome: 'ElétricaTotal Instalações', categoria: 'Instalações Elétricas', cnpj: '45.678.912/0001-33', contato: 'contato@eletricatotal.com', obras: 2, status: 'pendente' },
  { nome: 'HidroMax Tubulações', categoria: 'Hidráulica', cnpj: '32.165.498/0001-77', contato: 'orcamento@hidromax.com', obras: 1, status: 'ativo' },
  { nome: 'Locações Brasil Equipamentos', categoria: 'Locação de Máquinas', cnpj: '11.222.333/0001-44', contato: 'locacao@lbe.com.br', obras: 5, status: 'ativo' },
  { nome: 'Acabamentos Premium', categoria: 'Acabamentos', cnpj: '55.666.777/0001-22', contato: 'sac@premium.com', obras: 0, status: 'inativo' },
];

const KPIS = [
  { icon: 'engineering', label: 'Fornecedores Ativos', value: '24', tone: 'bg-primary-container/10 text-primary-container' },
  { icon: 'pending_actions', label: 'Aguardando Aprovação', value: '3', tone: 'bg-[#F59E0B]/10 text-[#F59E0B]' },
  { icon: 'payments', label: 'Em Pagamentos no Mês', value: 'R$ 1.2M', tone: 'bg-success/10 text-success' },
];

const SELECT = 'appearance-none pl-4 pr-10 py-2 border border-outline-variant rounded-lg bg-surface-container-lowest focus:outline-none focus:border-primary text-body-sm text-on-surface cursor-pointer';

export default function FornecedoresPage() {
  return (
    <div className="space-y-lg">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        {KPIS.map((k) => (
          <div key={k.label} className="bg-white rounded-lg border border-outline-variant/50 p-md ambient-shadow flex items-center gap-md">
            <div className={`p-3 rounded-lg ${k.tone}`}><span className="material-symbols-outlined">{k.icon}</span></div>
            <div>
              <p className="text-label-sm text-outline uppercase tracking-wider">{k.label}</p>
              <p className="text-headline-md font-bold text-on-surface">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Barra de ações */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-md bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm">
        <div className="flex flex-wrap items-center gap-sm w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
            <input className="w-full pl-10 pr-4 py-2 border border-outline-variant rounded-lg bg-surface-container-lowest focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-body-sm text-on-surface placeholder:text-outline" placeholder="Buscar fornecedores..." type="text" />
          </div>
          <div className="relative">
            <select className={SELECT}>
              <option value="">Categoria (Todas)</option>
              <option>Materiais Básicos</option>
              <option>Estrutura Metálica</option>
              <option>Instalações Elétricas</option>
              <option>Hidráulica</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[20px]">expand_more</span>
          </div>
          <div className="relative">
            <select className={SELECT}>
              <option value="">Status (Todos)</option>
              <option>Ativo</option>
              <option>Pendente</option>
              <option>Inativo</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[20px]">expand_more</span>
          </div>
        </div>
        <button className="w-full sm:w-auto flex items-center justify-center gap-xs px-lg py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm text-label-md shrink-0">
          <span className="material-symbols-outlined text-[20px]">add</span> Novo Fornecedor
        </button>
      </div>

      {/* Tabela */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                {['Fornecedor', 'Categoria', 'CNPJ', 'Contato', 'Obras', 'Status', 'Ações'].map((h) => (
                  <th key={h} className="py-sm px-md text-label-sm text-on-surface-variant font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-body-sm divide-y divide-outline-variant/50">
              {FORNECEDORES.map((f, idx) => {
                const s = STATUS[f.status];
                return (
                  <tr key={f.cnpj} className={`hover:bg-surface-container-low transition-colors ${idx % 2 === 1 ? 'bg-surface-bright' : ''}`}>
                    <td className="py-sm px-md font-medium text-on-surface">{f.nome}</td>
                    <td className="py-sm px-md text-secondary">{f.categoria}</td>
                    <td className="py-sm px-md text-secondary">{f.cnpj}</td>
                    <td className="py-sm px-md text-secondary">{f.contato}</td>
                    <td className="py-sm px-md text-secondary text-center">{f.obras}</td>
                    <td className="py-sm px-md"><span className={`inline-flex items-center px-2 py-1 rounded-full text-label-sm border ${s.chip}`}>{s.label}</span></td>
                    <td className="py-sm px-md text-center">
                      <button className="p-xs text-outline hover:text-primary transition-colors rounded-md hover:bg-primary-container/10"><span className="material-symbols-outlined text-[20px]">more_vert</span></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

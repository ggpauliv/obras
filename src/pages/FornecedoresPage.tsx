import React, { useMemo, useState } from 'react';
import { listarFornecedores, salvarFornecedor, removerFornecedor } from '../store';
import type { Fornecedor, FornecedorStatus } from '../store';

const STATUS: Record<FornecedorStatus, { label: string; chip: string }> = {
  ativo: { label: 'Ativo', chip: 'bg-success/10 text-success border-success/20' },
  pendente: { label: 'Pendente', chip: 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20' },
  inativo: { label: 'Inativo', chip: 'bg-outline-variant/30 text-on-surface-variant border-outline-variant' },
};

const SELECT = 'appearance-none pl-4 pr-10 py-2 border border-outline-variant rounded-lg bg-surface-container-lowest focus:outline-none focus:border-primary text-body-sm text-on-surface cursor-pointer';
const FIELD = 'w-full rounded-lg border border-outline-variant text-body-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary py-2 px-3';

const VAZIO: Fornecedor = { id: '', nome: '', categoria: '', cnpj: '', contato: '', obras: 0, status: 'ativo' };

export default function FornecedoresPage() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>(() => listarFornecedores());
  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Fornecedor>(VAZIO);
  const [menuId, setMenuId] = useState<string | null>(null);

  const recarregar = () => setFornecedores(listarFornecedores());
  const novo = () => { setForm(VAZIO); setModalOpen(true); };
  const editar = (f: Fornecedor) => { setForm(f); setModalOpen(true); setMenuId(null); };
  const excluir = (id: string) => { if (window.confirm('Excluir este fornecedor?')) { removerFornecedor(id); recarregar(); } setMenuId(null); };
  const salvar = () => {
    if (!form.nome.trim()) { window.alert('Informe o nome do fornecedor.'); return; }
    salvarFornecedor({ ...form, obras: Number(form.obras) || 0 });
    recarregar();
    setModalOpen(false);
  };
  const set = (campo: keyof Fornecedor, valor: string | number) => setForm((f) => ({ ...f, [campo]: valor }));

  const categorias = useMemo(() => Array.from(new Set(fornecedores.map((f) => f.categoria).filter(Boolean))), [fornecedores]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return fornecedores.filter((f) => {
      const okBusca = !q || f.nome.toLowerCase().includes(q) || f.cnpj.includes(q) || f.contato.toLowerCase().includes(q);
      const okCat = !filtroCategoria || f.categoria === filtroCategoria;
      const okStatus = !filtroStatus || f.status === filtroStatus;
      return okBusca && okCat && okStatus;
    });
  }, [fornecedores, busca, filtroCategoria, filtroStatus]);

  const ativos = fornecedores.filter((f) => f.status === 'ativo').length;
  const pendentes = fornecedores.filter((f) => f.status === 'pendente').length;

  const KPIS = [
    { icon: 'engineering', label: 'Fornecedores Ativos', value: String(ativos), tone: 'bg-primary-container/10 text-primary-container' },
    { icon: 'pending_actions', label: 'Aguardando Aprovação', value: String(pendentes), tone: 'bg-[#F59E0B]/10 text-[#F59E0B]' },
    { icon: 'inventory_2', label: 'Total Cadastrados', value: String(fornecedores.length), tone: 'bg-success/10 text-success' },
  ];

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
            <input value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-outline-variant rounded-lg bg-surface-container-lowest focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-body-sm text-on-surface placeholder:text-outline" placeholder="Buscar fornecedores..." type="text" />
          </div>
          <div className="relative">
            <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className={SELECT}>
              <option value="">Categoria (Todas)</option>
              {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[20px]">expand_more</span>
          </div>
          <div className="relative">
            <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className={SELECT}>
              <option value="">Status (Todos)</option>
              <option value="ativo">Ativo</option>
              <option value="pendente">Pendente</option>
              <option value="inativo">Inativo</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[20px]">expand_more</span>
          </div>
        </div>
        <button onClick={novo} className="w-full sm:w-auto flex items-center justify-center gap-xs px-lg py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm text-label-md shrink-0">
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
              {filtrados.length === 0 && (
                <tr><td colSpan={7} className="py-xl px-md text-center text-on-surface-variant">Nenhum fornecedor encontrado.</td></tr>
              )}
              {filtrados.map((f, idx) => {
                const s = STATUS[f.status];
                return (
                  <tr key={f.id} className={`hover:bg-surface-container-low transition-colors ${idx % 2 === 1 ? 'bg-surface-bright' : ''}`}>
                    <td className="py-sm px-md font-medium text-on-surface">{f.nome}</td>
                    <td className="py-sm px-md text-secondary">{f.categoria}</td>
                    <td className="py-sm px-md text-secondary">{f.cnpj}</td>
                    <td className="py-sm px-md text-secondary">{f.contato}</td>
                    <td className="py-sm px-md text-secondary text-center">{f.obras}</td>
                    <td className="py-sm px-md"><span className={`inline-flex items-center px-2 py-1 rounded-full text-label-sm border ${s.chip}`}>{s.label}</span></td>
                    <td className="py-sm px-md text-center relative">
                      <button onClick={() => setMenuId(menuId === f.id ? null : f.id)} className="p-xs text-outline hover:text-primary transition-colors rounded-md hover:bg-primary-container/10"><span className="material-symbols-outlined text-[20px]">more_vert</span></button>
                      {menuId === f.id && (
                        <div className="absolute right-8 top-2 z-20 bg-surface border border-outline-variant rounded-lg shadow-lg py-1 w-36 text-left">
                          <button onClick={() => editar(f)} className="w-full px-md py-2 text-body-sm text-on-surface hover:bg-surface-container-low flex items-center gap-sm"><span className="material-symbols-outlined text-[18px]">edit</span> Editar</button>
                          <button onClick={() => excluir(f.id)} className="w-full px-md py-2 text-body-sm text-error hover:bg-error-container/30 flex items-center gap-sm"><span className="material-symbols-outlined text-[18px]">delete</span> Excluir</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Novo/Editar Fornecedor */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/60 backdrop-blur-sm p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-surface-container-lowest w-full max-w-xl rounded-xl shadow-xl border border-outline-variant overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-lg py-md border-b border-outline-variant flex items-center justify-between bg-surface">
              <h3 className="text-headline-sm font-semibold text-on-surface">{form.id ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h3>
              <button onClick={() => setModalOpen(false)} className="p-xs text-outline hover:text-error transition-colors rounded-md hover:bg-error-container/50"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-lg space-y-md bg-surface-bright">
              <div>
                <label className="block text-label-sm text-on-surface mb-1">Nome / Razão Social *</label>
                <input className={FIELD} value={form.nome} onChange={(e) => set('nome', e.target.value)} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                <div>
                  <label className="block text-label-sm text-on-surface mb-1">Categoria</label>
                  <input className={FIELD} value={form.categoria} onChange={(e) => set('categoria', e.target.value)} placeholder="Ex: Materiais Básicos" />
                </div>
                <div>
                  <label className="block text-label-sm text-on-surface mb-1">CNPJ</label>
                  <input className={FIELD} value={form.cnpj} onChange={(e) => set('cnpj', e.target.value)} placeholder="00.000.000/0000-00" />
                </div>
                <div>
                  <label className="block text-label-sm text-on-surface mb-1">Contato</label>
                  <input className={FIELD} value={form.contato} onChange={(e) => set('contato', e.target.value)} placeholder="email ou telefone" />
                </div>
                <div>
                  <label className="block text-label-sm text-on-surface mb-1">Obras vinculadas</label>
                  <input type="number" min={0} className={FIELD} value={form.obras} onChange={(e) => set('obras', Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-label-sm text-on-surface mb-1">Status</label>
                  <select className={`${FIELD} appearance-none`} value={form.status} onChange={(e) => set('status', e.target.value as FornecedorStatus)}>
                    <option value="ativo">Ativo</option>
                    <option value="pendente">Pendente</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="px-lg py-md border-t border-outline-variant flex justify-end gap-sm bg-surface">
              <button onClick={() => setModalOpen(false)} className="px-lg py-2 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-variant transition-colors text-label-md">Cancelar</button>
              <button onClick={salvar} className="px-lg py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors text-label-md">Salvar Fornecedor</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

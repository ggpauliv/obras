import React, { useState, useEffect } from 'react';
import ObraHeader from '../components/ObraHeader';
import { listarDespesas, salvarDespesa, removerDespesa, getObraAtivaId } from '../store';
import type { Despesa } from '../store';

const FIELD = 'w-full rounded-lg border border-outline-variant text-body-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary py-2 px-3';

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Converte "R$ 1.234,56", "1234.56" ou número em number. */
function parseValor(v: any): number {
  if (typeof v === 'number') return v;
  const s = String(v || '').replace(/[^\d,.-]/g, '');
  // se tem vírgula como decimal (formato BR), normaliza
  if (s.includes(',')) return Number(s.replace(/\./g, '').replace(',', '.')) || 0;
  return Number(s) || 0;
}

export default function ObraFinanceiroPage() {
  const obraId = getObraAtivaId();
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Despesa | null>(null);

  useEffect(() => {
    listarDespesas(obraId).then(setDespesas);
  }, [obraId]);

  const recarregar = () => listarDespesas(obraId).then(setDespesas);
  const vazia = (): Despesa => ({ id: '', obraId, faseId: null, descricao: '', categoria: '', valor: '', data: new Date().toLocaleDateString('pt-BR'), fornecedor: '', cnpj: '', numeroNota: '' });
  const nova = () => { setForm(vazia()); setModalOpen(true); };
  const editar = (d: Despesa) => { setForm({ ...d }); setModalOpen(true); };
  const excluir = async (id: string) => {
    if (!window.confirm('Excluir esta despesa?')) return;
    try { await removerDespesa(id); await recarregar(); }
    catch (e) { window.alert('Erro ao excluir: ' + (e instanceof Error ? e.message : 'desconhecido')); }
  };
  const salvar = async () => {
    if (!form || !form.descricao.trim()) { window.alert('Informe a descrição da despesa.'); return; }
    try {
      await salvarDespesa(form);
      await recarregar();
      setModalOpen(false);
    } catch (e) { window.alert('Erro ao salvar: ' + (e instanceof Error ? e.message : 'desconhecido')); }
  };
  const setCampo = (campo: keyof Despesa, valor: string) => setForm((f) => (f ? { ...f, [campo]: valor } : f));

  // Agregados reais da obra ativa
  const totalLancado = despesas.reduce((s, d) => s + parseValor(d.valor), 0);
  const porCategoria = Object.values(
    despesas.reduce((acc: Record<string, { cat: string; total: number; qtd: number }>, d) => {
      const cat = d.categoria || 'Sem categoria';
      acc[cat] = acc[cat] || { cat, total: 0, qtd: 0 };
      acc[cat].total += parseValor(d.valor);
      acc[cat].qtd += 1;
      return acc;
    }, {})
  ).sort((a, b) => b.total - a.total);
  const maiorCat = porCategoria[0];
  const maxCat = Math.max(0, ...porCategoria.map((c) => c.total));

  return (
    <div className="flex flex-col gap-lg">
      <ObraHeader />

      {/* KPIs reais da obra */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
        <div className="bg-surface border border-outline-variant rounded-lg p-lg ambient-shadow flex flex-col justify-between">
          <div className="flex items-center justify-between mb-sm">
            <h3 className="text-label-md text-on-surface-variant uppercase tracking-wider">Total Lançado</h3>
            <span className="material-symbols-outlined text-outline">payments</span>
          </div>
          <div className="text-display-lg font-bold text-on-surface">{fmt(totalLancado)}</div>
          <div className="mt-sm text-secondary"><span className="text-body-sm">Soma das despesas desta obra</span></div>
        </div>
        <div className="bg-surface border border-outline-variant rounded-lg p-lg ambient-shadow flex flex-col justify-between">
          <div className="flex items-center justify-between mb-sm">
            <h3 className="text-label-md text-on-surface-variant uppercase tracking-wider">Lançamentos</h3>
            <span className="material-symbols-outlined text-outline">receipt_long</span>
          </div>
          <div className="text-display-lg font-bold text-on-surface">{despesas.length}</div>
          <div className="mt-sm"><span className="text-body-sm text-on-surface-variant">{porCategoria.length} categoria(s)</span></div>
        </div>
        <div className="bg-surface border border-outline-variant rounded-lg p-lg ambient-shadow flex flex-col justify-between">
          <div className="flex items-center justify-between mb-sm">
            <h3 className="text-label-md text-on-surface-variant uppercase tracking-wider">Maior Categoria</h3>
            <span className="material-symbols-outlined text-outline">leaderboard</span>
          </div>
          <div className="text-headline-md font-bold text-on-surface">{maiorCat ? maiorCat.cat : '—'}</div>
          <div className="mt-sm"><span className="text-body-sm text-on-surface-variant">{maiorCat ? fmt(maiorCat.total) : 'Sem despesas'}</span></div>
        </div>
      </div>

      {/* Despesas por categoria (dados reais) */}
      <div className="bg-surface border border-outline-variant rounded-lg ambient-shadow overflow-hidden">
        <div className="p-lg border-b border-outline-variant bg-surface-bright">
          <h3 className="text-headline-sm font-bold text-on-surface">Despesas por Categoria</h3>
        </div>
        <div className="p-lg flex flex-col gap-sm">
          {porCategoria.length === 0 && (
            <p className="text-body-sm text-on-surface-variant text-center py-md">Nenhuma despesa lançada ainda.</p>
          )}
          {porCategoria.map((c) => (
            <div key={c.cat} className="flex items-center gap-md">
              <div className="w-40 shrink-0 text-body-sm text-on-surface truncate">{c.cat}</div>
              <div className="flex-1 h-6 bg-surface-container-highest rounded-lg overflow-hidden">
                <div className="h-full rounded-lg bg-primary" style={{ width: `${maxCat > 0 ? (c.total / maxCat) * 100 : 0}%` }} />
              </div>
              <div className="w-32 text-right shrink-0 text-body-sm font-medium text-on-surface">{fmt(c.total)}</div>
              <div className="w-10 text-right shrink-0 text-label-sm text-on-surface-variant">{c.qtd}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Despesas lançadas (dados reais do store, incl. importadas via IA) */}
      <div className="bg-surface border border-outline-variant rounded-lg ambient-shadow overflow-hidden">
        <div className="p-lg border-b border-outline-variant flex justify-between items-center bg-surface-bright">
          <h3 className="text-headline-sm font-bold text-on-surface">Despesas Lançadas <span className="text-label-sm text-on-surface-variant font-normal">({despesas.length})</span></h3>
          <button onClick={nova} className="flex items-center gap-xs px-md py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-label-md">
            <span className="material-symbols-outlined text-[20px]">add</span> Nova Despesa
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead className="bg-surface-container-low">
              <tr>
                {['Descrição', 'Categoria', 'Fornecedor', 'Nº Nota', 'Data', 'Valor', ''].map((h, i) => (
                  <th key={i} className="py-sm px-md text-label-sm text-on-surface-variant font-medium border-b border-outline-variant whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50 text-body-sm">
              {despesas.length === 0 && (
                <tr><td colSpan={7} className="py-xl px-md text-center text-on-surface-variant">
                  Nenhuma despesa lançada. Clique em “Nova Despesa” ou importe uma nota fiscal em “Importar”.
                </td></tr>
              )}
              {despesas.map((d, i) => (
                <tr key={d.id} className={`group hover:bg-surface-container-lowest transition-colors ${i % 2 === 1 ? 'bg-surface-bright' : ''}`}>
                  <td className="py-md px-md text-on-surface">{d.descricao}</td>
                  <td className="py-md px-md text-on-surface-variant">{d.categoria || '—'}</td>
                  <td className="py-md px-md text-on-surface-variant">{d.fornecedor || '—'}</td>
                  <td className="py-md px-md text-on-surface-variant">{d.numeroNota || '—'}</td>
                  <td className="py-md px-md text-on-surface-variant">{d.data}</td>
                  <td className="py-md px-md text-on-surface font-medium text-right">{fmt(parseValor(d.valor))}</td>
                  <td className="py-md px-md text-right whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => editar(d)} className="text-on-surface-variant hover:text-primary p-xs"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                    <button onClick={() => excluir(d.id)} className="text-on-surface-variant hover:text-error p-xs"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nova/Editar Despesa */}
      {modalOpen && form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/60 backdrop-blur-sm p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-surface-container-lowest w-full max-w-xl rounded-xl shadow-xl border border-outline-variant overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-lg py-md border-b border-outline-variant flex items-center justify-between bg-surface">
              <h3 className="text-headline-sm font-semibold text-on-surface">{form.id ? 'Editar Despesa' : 'Nova Despesa'}</h3>
              <button onClick={() => setModalOpen(false)} className="p-xs text-outline hover:text-error transition-colors rounded-md hover:bg-error-container/50"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-lg space-y-md bg-surface-bright">
              <div>
                <label className="block text-label-sm text-on-surface mb-1">Descrição *</label>
                <input className={FIELD} value={form.descricao} onChange={(e) => setCampo('descricao', e.target.value)} placeholder="Ex: Compra de cimento" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                <div>
                  <label className="block text-label-sm text-on-surface mb-1">Categoria</label>
                  <input className={FIELD} value={form.categoria} onChange={(e) => setCampo('categoria', e.target.value)} placeholder="Ex: Materiais" />
                </div>
                <div>
                  <label className="block text-label-sm text-on-surface mb-1">Valor</label>
                  <input className={FIELD} value={form.valor} onChange={(e) => setCampo('valor', e.target.value)} placeholder="R$ 0,00" />
                </div>
                <div>
                  <label className="block text-label-sm text-on-surface mb-1">Fornecedor</label>
                  <input className={FIELD} value={form.fornecedor || ''} onChange={(e) => setCampo('fornecedor', e.target.value)} />
                </div>
                <div>
                  <label className="block text-label-sm text-on-surface mb-1">Nº da Nota</label>
                  <input className={FIELD} value={form.numeroNota || ''} onChange={(e) => setCampo('numeroNota', e.target.value)} />
                </div>
                <div>
                  <label className="block text-label-sm text-on-surface mb-1">Data</label>
                  <input className={FIELD} value={form.data} onChange={(e) => setCampo('data', e.target.value)} placeholder="DD/MM/AAAA" />
                </div>
              </div>
            </div>
            <div className="px-lg py-md border-t border-outline-variant flex justify-end gap-sm bg-surface">
              <button onClick={() => setModalOpen(false)} className="px-lg py-2 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-variant transition-colors text-label-md">Cancelar</button>
              <button onClick={salvar} className="px-lg py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors text-label-md">Salvar Despesa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import ObraHeader from '../components/ObraHeader';
import { listarDespesas, salvarDespesa, removerDespesa, getObraAtivaId } from '../store';
import type { Despesa } from '../store';

const FIELD = 'w-full rounded-lg border border-outline-variant text-body-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary py-2 px-3';

const BARS = [
  { fase: 'Fundações', orcado: 80, realizado: 85 },
  { fase: 'Estrutura', orcado: 60, realizado: 65 },
  { fase: 'Alvenaria', orcado: 40, realizado: 35 },
  { fase: 'Instalações', orcado: 70, realizado: 20 },
  { fase: 'Acabamento', orcado: 90, realizado: 5 },
];

interface Desp { cat: string; orcado: string; realizado: string; delta: string; tone: 'error' | 'green' | 'flat'; arrow: string; }
const DESPESAS: Desp[] = [
  { cat: 'Materiais', orcado: '3.5M', realizado: '3.8M', delta: '300k', tone: 'error', arrow: 'arrow_upward' },
  { cat: 'Mão de Obra', orcado: '2.8M', realizado: '2.9M', delta: '100k', tone: 'error', arrow: 'arrow_upward' },
  { cat: 'Equipamentos', orcado: '1.2M', realizado: '1.1M', delta: '100k', tone: 'green', arrow: 'arrow_downward' },
  { cat: 'Serviços Terc.', orcado: '0.8M', realizado: '0.82M', delta: '20k', tone: 'error', arrow: 'arrow_upward' },
  { cat: 'Impostos/Taxas', orcado: '0.2M', realizado: '0.2M', delta: '0', tone: 'flat', arrow: 'horizontal_rule' },
];

const TONE = { error: 'text-error', green: 'text-[#16A34A]', flat: 'text-on-surface' };
const DELTA_TONE = { error: 'text-error', green: 'text-[#16A34A]', flat: 'text-outline' };

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
  const excluir = (id: string) => { if (window.confirm('Excluir esta despesa?')) { removerDespesa(id); recarregar(); } };
  const salvar = () => {
    if (!form || !form.descricao.trim()) { window.alert('Informe a descrição da despesa.'); return; }
    salvarDespesa(form);
    recarregar();
    setModalOpen(false);
  };
  const setCampo = (campo: keyof Despesa, valor: string) => setForm((f) => (f ? { ...f, [campo]: valor } : f));

  return (
    <div className="flex flex-col gap-lg">
      <ObraHeader />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
        <div className="bg-surface border border-outline-variant rounded-lg p-lg ambient-shadow flex flex-col justify-between hover:border-primary/30 transition-colors">
          <div className="flex items-center justify-between mb-sm">
            <h3 className="text-label-md text-on-surface-variant uppercase tracking-wider">Orçamento Total</h3>
            <span className="material-symbols-outlined text-outline">account_balance_wallet</span>
          </div>
          <div className="text-display-lg font-bold text-on-surface">R$ 8.5M</div>
          <div className="mt-sm text-secondary"><span className="text-body-sm">Previsto para conclusão</span></div>
        </div>
        <div className="bg-surface border border-outline-variant rounded-lg p-lg ambient-shadow flex flex-col justify-between hover:border-primary/30 transition-colors">
          <div className="flex items-center justify-between mb-sm">
            <h3 className="text-label-md text-on-surface-variant uppercase tracking-wider">Realizado Total</h3>
            <span className="material-symbols-outlined text-outline">payments</span>
          </div>
          <div className="text-display-lg font-bold text-on-surface">R$ 4.1M</div>
          <div className="mt-sm"><span className="text-body-sm text-on-surface-variant">48% do orçamento</span></div>
        </div>
        <div className="bg-error-container border border-error/20 rounded-lg p-lg ambient-shadow flex flex-col justify-between">
          <div className="flex items-center justify-between mb-sm">
            <h3 className="text-label-md text-on-error-container uppercase tracking-wider">Desvio Atual</h3>
            <span className="material-symbols-outlined text-error">trending_up</span>
          </div>
          <div className="text-display-lg font-bold text-error">+R$ 320k</div>
          <div className="mt-sm flex items-center gap-xs text-error">
            <span className="material-symbols-outlined text-[16px]">warning</span>
            <span className="text-body-sm font-medium">Acima do orçado</span>
          </div>
        </div>
      </div>

      {/* Chart + tabela */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg mt-md">
        <div className="lg:col-span-2 bg-surface border border-outline-variant rounded-lg p-lg ambient-shadow flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-lg">
            <h3 className="text-headline-sm font-bold text-on-surface">Orçado vs Realizado por Fase</h3>
            <div className="flex gap-md">
              <div className="flex items-center gap-sm"><div className="w-3 h-3 rounded-sm bg-primary-container" /><span className="text-label-sm text-on-surface-variant">Orçado</span></div>
              <div className="flex items-center gap-sm"><div className="w-3 h-3 rounded-sm bg-tertiary" /><span className="text-label-sm text-on-surface-variant">Realizado</span></div>
            </div>
          </div>
          <div className="flex-1 flex items-end justify-between gap-2">
            {BARS.map((b) => (
              <div key={b.fase} className="flex flex-col items-center justify-end h-full flex-1 group cursor-pointer">
                <div className="flex gap-1 items-end h-full pt-8 w-full justify-center">
                  <div className="w-6 bg-primary-container rounded-t-sm" style={{ height: `${b.orcado}%` }} />
                  <div className="w-6 bg-tertiary rounded-t-sm" style={{ height: `${b.realizado}%` }} />
                </div>
                <span className="text-label-sm text-on-surface-variant mt-3 text-center">{b.fase}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-1 bg-surface border border-outline-variant rounded-lg ambient-shadow flex flex-col h-[400px] overflow-hidden">
          <div className="p-lg border-b border-outline-variant flex justify-between items-center bg-surface-bright">
            <h3 className="text-headline-sm font-bold text-on-surface">Despesas por Categoria</h3>
            <button className="text-primary hover:bg-primary-fixed-dim/20 rounded-full p-1 transition-colors"><span className="material-symbols-outlined">more_vert</span></button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-surface-container-low sticky top-0 z-10">
                <tr>
                  <th className="py-sm px-md text-label-sm text-on-surface-variant font-medium border-b border-outline-variant">Categoria</th>
                  <th className="py-sm px-md text-label-sm text-on-surface-variant font-medium border-b border-outline-variant text-right">Orçado</th>
                  <th className="py-sm px-md text-label-sm text-on-surface-variant font-medium border-b border-outline-variant text-right">Realizado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/50">
                {DESPESAS.map((d, i) => (
                  <tr key={d.cat} className={`hover:bg-surface-container-lowest transition-colors ${i % 2 === 1 ? 'bg-surface-bright' : ''}`}>
                    <td className="py-md px-md text-body-sm text-on-surface">{d.cat}</td>
                    <td className="py-md px-md text-body-sm text-on-surface text-right">{d.orcado}</td>
                    <td className={`py-md px-md text-body-sm font-medium text-right ${TONE[d.tone]}`}>
                      <div className="flex flex-col items-end">
                        {d.realizado}
                        <span className={`text-[10px] flex items-center ${DELTA_TONE[d.tone]}`}><span className="material-symbols-outlined text-[12px]">{d.arrow}</span>{d.delta}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                  <td className="py-md px-md text-on-surface font-medium text-right">{d.valor}</td>
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

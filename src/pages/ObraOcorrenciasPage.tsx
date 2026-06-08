import React, { useEffect, useState } from 'react';
import ObraHeader from '../components/ObraHeader';
import { getObraAtivaId, listarFases } from '../store';
import type { Fase } from '../store';
import { apiClient } from '../api/client';
import { impactoAuto, impactoEfetivo, impactoTotal } from '../utils/ocorrencias';

const TIPOS = ['Chuva', 'Problema', 'Atraso', 'Paralisação', 'Acidente', 'Visita técnica', 'Entrega', 'Inspeção', 'Outro'];

const TIPO_ESTILO: Record<string, { icon: string; cls: string }> = {
  'Chuva': { icon: 'rainy', cls: 'bg-blue-100 text-blue-700' },
  'Problema': { icon: 'report_problem', cls: 'bg-error/10 text-error' },
  'Atraso': { icon: 'schedule', cls: 'bg-amber-100 text-amber-700' },
  'Paralisação': { icon: 'pause_circle', cls: 'bg-error/10 text-error' },
  'Acidente': { icon: 'personal_injury', cls: 'bg-error/10 text-error' },
  'Visita técnica': { icon: 'engineering', cls: 'bg-primary/10 text-primary' },
  'Entrega': { icon: 'local_shipping', cls: 'bg-emerald-100 text-emerald-700' },
  'Inspeção': { icon: 'fact_check', cls: 'bg-primary/10 text-primary' },
  'Outro': { icon: 'event_note', cls: 'bg-surface-container-high text-on-surface-variant' },
};
const estilo = (t: string) => TIPO_ESTILO[t] || TIPO_ESTILO['Outro'];

const FIELD = 'w-full rounded-lg border border-outline-variant text-body-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary py-2 px-3 bg-surface-container-lowest';

const paraInput = (v: any) => v ? new Date(v).toISOString().slice(0, 16) : '';
const fmtData = (v: any) => v ? new Date(v).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
function duracao(ini: any, fim: any): string {
  if (!ini || !fim) return 'em aberto';
  const ms = new Date(fim).getTime() - new Date(ini).getTime();
  if (ms <= 0) return '—';
  const h = Math.round(ms / 3600000);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d${h % 24 ? ` ${h % 24}h` : ''}`;
}

interface Ocorrencia {
  id?: string; obraId: string; faseId: string | null; tipo: string; descricao: string;
  dataInicio: string; dataFim: string | null; impactoDias: string | number | null; faseNome?: string;
}

export default function ObraOcorrenciasPage() {
  const obraId = getObraAtivaId();
  const [lista, setLista] = useState<any[]>([]);
  const [fases, setFases] = useState<Fase[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Ocorrencia | null>(null);
  const [filtroTipo, setFiltroTipo] = useState('');

  const recarregar = () => apiClient.listarOcorrencias(obraId).then(setLista).catch(() => setLista([]));
  useEffect(() => {
    recarregar();
    listarFases(obraId).then(setFases);
  }, [obraId]); // eslint-disable-line

  const nova = () => {
    setForm({ obraId, faseId: null, tipo: 'Chuva', descricao: '', dataInicio: new Date().toISOString().slice(0, 16), dataFim: null, impactoDias: '' });
    setModalOpen(true);
  };
  const editar = (o: any) => {
    setForm({ id: o.id, obraId, faseId: o.faseId || null, tipo: o.tipo, descricao: o.descricao || '', dataInicio: paraInput(o.dataInicio), dataFim: o.dataFim ? paraInput(o.dataFim) : null, impactoDias: o.impactoDias ?? '' });
    setModalOpen(true);
  };
  const excluir = async (id: string) => {
    if (!window.confirm('Excluir esta ocorrência?')) return;
    try { await apiClient.deletarOcorrencia(id); await recarregar(); }
    catch (e: any) { alert('Erro: ' + e.message); }
  };
  const salvar = async () => {
    if (!form || !form.tipo || !form.dataInicio) { alert('Informe tipo e data de início.'); return; }
    const payload = { obraId, faseId: form.faseId, tipo: form.tipo, descricao: form.descricao, dataInicio: form.dataInicio, dataFim: form.dataFim || null, impactoDias: form.impactoDias === '' ? null : form.impactoDias };
    try {
      if (form.id) await apiClient.atualizarOcorrencia(form.id, payload);
      else await apiClient.criarOcorrencia(payload);
      await recarregar();
      setModalOpen(false);
    } catch (e: any) { alert('Erro ao salvar: ' + e.message); }
  };
  const setCampo = (campo: keyof Ocorrencia, valor: any) => setForm((f) => (f ? { ...f, [campo]: valor } : f));

  const filtrados = filtroTipo ? lista.filter(o => o.tipo === filtroTipo) : lista;
  const emAberto = lista.filter(o => !o.dataFim).length;
  const totalImpacto = impactoTotal(lista);

  return (
    <div className="flex flex-col gap-lg">
      <ObraHeader />

      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-md">
        <div className="flex items-center gap-md">
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="rounded-lg border border-outline-variant text-body-sm py-2 px-3 bg-surface focus:outline-none focus:border-primary">
            <option value="">Todos os tipos</option>
            {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          {emAberto > 0 && <span className="text-body-sm text-amber-700">{emAberto} em aberto</span>}
        </div>
        <button onClick={nova} className="flex items-center justify-center gap-xs px-lg py-2 bg-primary text-on-primary rounded-lg hover:bg-primary/90 text-label-md">
          <span className="material-symbols-outlined text-[20px]">add</span> Nova Ocorrência
        </button>
      </div>

      {/* Impacto acumulado no prazo */}
      {totalImpacto > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-md flex items-center gap-md">
          <span className="material-symbols-outlined text-amber-600 text-[28px]">running_with_errors</span>
          <div>
            <p className="text-label-md font-semibold text-amber-800">Impacto acumulado no prazo: +{totalImpacto} dia(s)</p>
            <p className="text-body-sm text-amber-700">Soma do impacto das ocorrências. A "Previsão ajustada" aparece na Visão Geral.</p>
          </div>
        </div>
      )}

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm">
        {filtrados.length === 0 ? (
          <div className="py-2xl text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-[48px] text-outline">event_note</span>
            <p className="text-body-md mt-sm">Nenhuma ocorrência registrada{filtroTipo ? ' deste tipo' : ''}.</p>
            <p className="text-body-sm">Registre chuvas, problemas, paralisações e outros eventos da obra.</p>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/50">
            {filtrados.map((o) => {
              const est = estilo(o.tipo);
              return (
                <div key={o.id} className="p-md flex items-start gap-md group hover:bg-surface-container-low transition-colors">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${est.cls}`}>
                    <span className="material-symbols-outlined text-[20px]">{est.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-sm flex-wrap">
                      <span className="text-label-md font-semibold text-on-surface">{o.tipo}</span>
                      {o.faseNome && <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">{o.faseNome}</span>}
                      {!o.dataFim && <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">em aberto</span>}
                    </div>
                    {o.descricao && <p className="text-body-sm text-on-surface-variant mt-1">{o.descricao}</p>}
                    <p className="text-body-sm text-on-surface-variant mt-1">
                      {fmtData(o.dataInicio)}{o.dataFim ? ` → ${fmtData(o.dataFim)}` : ''} · <span className="font-medium">{duracao(o.dataInicio, o.dataFim)}</span>
                      {impactoEfetivo(o) > 0 && <span className="text-amber-700"> · impacto: {impactoEfetivo(o)} dia(s)</span>}
                    </p>
                  </div>
                  <div className="flex gap-xs opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => editar(o)} className="p-xs text-on-surface-variant hover:text-primary" title={o.dataFim ? 'Editar' : 'Editar / encerrar'}><span className="material-symbols-outlined text-[18px]">edit</span></button>
                    <button onClick={() => excluir(o.id)} className="p-xs text-on-surface-variant hover:text-error"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/60 backdrop-blur-sm p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-surface-container-lowest w-full max-w-xl rounded-xl shadow-xl border border-outline-variant overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-lg py-md border-b border-outline-variant flex items-center justify-between bg-surface">
              <h3 className="text-headline-sm font-semibold text-on-surface">{form.id ? 'Editar Ocorrência' : 'Nova Ocorrência'}</h3>
              <button onClick={() => setModalOpen(false)} className="p-xs text-outline hover:text-error rounded-md"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-lg space-y-md bg-surface-bright">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                <div>
                  <label className="block text-label-sm text-on-surface mb-1">Tipo *</label>
                  <select className={FIELD} value={form.tipo} onChange={e => setCampo('tipo', e.target.value)}>
                    {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-label-sm text-on-surface mb-1">Fase / etapa</label>
                  <select className={FIELD} value={form.faseId || ''} onChange={e => setCampo('faseId', e.target.value || null)}>
                    <option value="">— (geral da obra)</option>
                    {fases.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-label-sm text-on-surface mb-1">Início *</label>
                  <input type="datetime-local" className={FIELD} value={form.dataInicio} onChange={e => setCampo('dataInicio', e.target.value)} />
                </div>
                <div>
                  <label className="block text-label-sm text-on-surface mb-1">Fim <span className="text-outline text-xs">(deixe em branco se ainda em aberto)</span></label>
                  <input type="datetime-local" className={FIELD} value={form.dataFim || ''} onChange={e => setCampo('dataFim', e.target.value || null)} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-label-sm text-on-surface mb-1">
                    Impacto no prazo (dias) <span className="text-outline text-xs">(em branco = automático pela duração; 0 = não atrasa)</span>
                  </label>
                  <input type="number" min={0} className={FIELD} value={form.impactoDias ?? ''}
                    onChange={e => setCampo('impactoDias', e.target.value)}
                    placeholder={`Automático: ${impactoAuto({ ...form, impactoDias: '' })} dia(s)`} />
                </div>
              </div>
              <div>
                <label className="block text-label-sm text-on-surface mb-1">Descrição</label>
                <textarea className={`${FIELD} min-h-[80px]`} value={form.descricao} onChange={e => setCampo('descricao', e.target.value)} placeholder="Detalhes do evento (ex.: chuva forte interrompeu a concretagem)…" />
              </div>
            </div>
            <div className="px-lg py-md border-t border-outline-variant flex justify-end gap-sm bg-surface">
              <button onClick={() => setModalOpen(false)} className="px-lg py-2 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-variant text-label-md">Cancelar</button>
              <button onClick={salvar} className="px-lg py-2 rounded-lg bg-primary text-white hover:bg-primary/90 text-label-md">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

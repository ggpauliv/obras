import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ObraHeader from '../components/ObraHeader';
import { listarFases, salvarFase, removerFase, getObraAtivaId } from '../store';
import type { Fase, FaseStatus } from '../store';
import { brParaInput, inputParaBr } from '../utils/datas';

// Estilos por status de fase.
const STATUS_INFO: Record<FaseStatus, { label: string; chip: string; bar: string; gantt: string }> = {
  concluida: { label: 'Concluída', chip: 'bg-success/10 text-success border-success/20', bar: 'bg-success', gantt: 'bg-success' },
  andamento: { label: 'Em andamento', chip: 'bg-primary-container/10 text-primary-container border-primary-container/20', bar: 'bg-primary-container', gantt: 'bg-primary-container' },
  atrasada: { label: 'Atrasada', chip: 'bg-error/10 text-error border-error/20', bar: 'bg-error', gantt: 'bg-error' },
  nao_iniciada: { label: 'Não iniciada', chip: 'bg-surface-variant text-on-surface-variant border-outline-variant/40', bar: 'bg-outline-variant', gantt: 'bg-surface-container-highest border border-outline-variant' },
};

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/** Converte data DD/MM/AA ou DD/MM/AAAA em timestamp; null se inválida. */
function parseData(s: string): number | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{2,4})$/.exec(s.trim());
  if (!m) return null;
  const dia = +m[1];
  const mes = +m[2] - 1;
  let ano = +m[3];
  if (ano < 100) ano += 2000;
  const d = new Date(ano, mes, dia);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

/** Calcula posição (left/width em %) de cada fase em uma régua temporal comum. */
function calcularGantt(fases: Fase[]) {
  const intervalos = fases.map((f) => ({
    fase: f,
    ini: parseData(f.inicio),
    fim: parseData(f.termino),
  }));
  const datas = intervalos.flatMap((i) => [i.ini, i.fim]).filter((v): v is number => v !== null);
  if (datas.length === 0) return null;
  const min = Math.min(...datas);
  const max = Math.max(...datas);
  const span = max - min || 1;
  const barras = intervalos.map(({ fase, ini, fim }) => {
    const a = ini ?? min;
    const b = fim ?? max;
    return {
      fase,
      left: `${((a - min) / span) * 100}%`,
      width: `${Math.max(((b - a) / span) * 100, 2)}%`,
    };
  });
  // Marcos de meses para o cabeçalho (até 9 colunas).
  const labels: string[] = [];
  const dIni = new Date(min);
  const dFim = new Date(max);
  const totalMeses = (dFim.getFullYear() - dIni.getFullYear()) * 12 + (dFim.getMonth() - dIni.getMonth()) + 1;
  const passo = Math.max(1, Math.ceil(totalMeses / 9));
  for (let i = 0; i < totalMeses; i += passo) {
    const d = new Date(dIni.getFullYear(), dIni.getMonth() + i, 1);
    labels.push(`${MESES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`);
  }
  return { barras, labels };
}

const FIELD = 'w-full rounded-lg border border-outline-variant text-body-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary py-2 px-3';

export default function ObraFasesPage() {
  const navigate = useNavigate();
  const obraId = getObraAtivaId();
  const [fasesAll, setFasesAll] = useState<Fase[]>([]);
  const [busca, setBusca] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Fase | null>(null);

  useEffect(() => {
    listarFases(obraId).then(setFasesAll);
  }, [obraId]);

  const recarregar = () => listarFases(obraId).then(setFasesAll);

  const novaFase = () => {
    const ordem = fasesAll.reduce((m, f) => Math.max(m, f.ordem), 0) + 1;
    setForm({ id: '', obraId, ordem, nome: '', inicio: '', termino: '', pct: 0, status: 'nao_iniciada' });
    setModalOpen(true);
  };
  const editarFase = (f: Fase) => { setForm({ ...f }); setModalOpen(true); };
  const excluirFase = (id: string) => {
    if (window.confirm('Excluir esta fase?')) { removerFase(id); recarregar(); }
  };
  const salvar = () => {
    if (!form || !form.nome.trim()) { window.alert('Informe o nome da fase.'); return; }
    salvarFase({ ...form, pct: Math.min(100, Math.max(0, Number(form.pct) || 0)) });
    recarregar();
    setModalOpen(false);
  };
  const setCampo = (campo: keyof Fase, valor: string | number) => setForm((f) => (f ? { ...f, [campo]: valor } : f));

  const fases = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return q ? fasesAll.filter((f) => f.nome.toLowerCase().includes(q)) : fasesAll;
  }, [fasesAll, busca]);

  const concluidas = fases.filter((f) => f.status === 'concluida').length;
  const emAndamento = fases.filter((f) => f.status === 'andamento').length;
  const atrasadas = fases.filter((f) => f.status === 'atrasada').length;
  const gantt = calcularGantt(fases);

  return (
    <div className="flex flex-col gap-lg">
      <ObraHeader />

      {/* Action bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-md">
        <div className="flex gap-sm w-full sm:w-auto">
          <button onClick={novaFase} className="bg-primary-container text-on-primary text-label-md px-md py-sm rounded-lg hover:opacity-90 transition-opacity flex items-center gap-sm ambient-shadow w-full sm:w-auto justify-center"><span className="material-symbols-outlined text-[18px]">add</span> Adicionar Fase</button>
          <button onClick={() => navigate('/importar')} className="bg-surface border border-outline-variant text-on-surface text-label-md px-md py-sm rounded-lg hover:bg-surface-container-low transition-colors flex items-center gap-sm w-full sm:w-auto justify-center"><span className="material-symbols-outlined text-[18px]">smart_toy</span> Importar Cronograma (IA)</button>
        </div>
        <div className="relative w-full sm:w-64">
          <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
          <input value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full pl-[36px] pr-sm py-sm rounded-lg border border-outline-variant bg-surface text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container focus:outline-none" placeholder="Buscar fases..." type="text" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-lg">
        {/* Tabela de fases */}
        <div className="xl:col-span-2 bg-surface rounded-xl border border-outline-variant/50 ambient-shadow overflow-hidden flex flex-col">
          <div className="p-md border-b border-outline-variant/40 flex justify-between items-center bg-surface-container-lowest">
            <h3 className="text-headline-sm text-on-surface">Detalhamento de Fases</h3>
            <button className="text-on-surface-variant hover:text-primary transition-colors"><span className="material-symbols-outlined">more_vert</span></button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[760px]">
              <thead>
                <tr className="bg-surface-container-low/50 border-b border-outline-variant/40">
                  {['#', 'Nome da Fase', 'Início', 'Término', 'Progresso', 'Status', 'Ações'].map((h) => (
                    <th key={h} className="py-sm px-md text-label-sm text-on-surface-variant whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-body-sm text-on-surface divide-y divide-outline-variant/20">
                {fases.length === 0 && (
                  <tr><td colSpan={7} className="py-xl px-md text-center text-on-surface-variant">
                    Nenhuma fase cadastrada. Use “Adicionar Fase” ou “Importar Cronograma (IA)”.
                  </td></tr>
                )}
                {fases.map((f) => {
                  const s = STATUS_INFO[f.status];
                  const active = f.status === 'andamento';
                  return (
                    <tr key={f.id} className={`transition-colors group h-14 ${active ? 'bg-primary-fixed/30 hover:bg-primary-fixed/40 border-l-2 border-l-primary' : 'hover:bg-surface-container-lowest'}`}>
                      <td className={`py-sm px-md ${active ? 'text-primary font-medium' : 'text-on-surface-variant'}`}>{f.ordem}</td>
                      <td className={`py-sm px-md ${active ? 'font-semibold text-on-surface' : 'font-medium'}`}>{f.nome}</td>
                      <td className={`py-sm px-md ${f.status === 'atrasada' ? 'text-error flex items-center gap-xs' : 'text-on-surface-variant'}`}>
                        {f.status === 'atrasada' && <span className="material-symbols-outlined text-[14px]">warning</span>}{f.inicio || '—'}
                      </td>
                      <td className="py-sm px-md text-on-surface-variant">{f.termino || '—'}</td>
                      <td className="py-sm px-md">
                        <div className="flex items-center gap-xs">
                          <div className="flex-1 h-2 bg-surface-container-highest rounded-full overflow-hidden">
                            <div className={`h-full ${s.bar}`} style={{ width: `${f.pct}%` }} />
                          </div>
                          <span className={`text-[11px] w-8 text-right ${f.status === 'atrasada' ? 'text-error' : 'text-on-surface-variant'}`}>{f.pct}%</span>
                        </div>
                      </td>
                      <td className="py-sm px-md"><span className={`inline-flex items-center px-xs py-0.5 rounded text-[11px] font-medium border ${s.chip}`}>{s.label}</span></td>
                      <td className={`py-sm px-md text-right ${active ? '' : 'opacity-0 group-hover:opacity-100 transition-opacity'}`}>
                        <button onClick={() => editarFase(f)} className="text-on-surface-variant hover:text-primary p-xs"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                        <button onClick={() => excluirFase(f.id)} className="text-on-surface-variant hover:text-error p-xs"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Resumo */}
        <div className="bg-surface rounded-xl border border-outline-variant/50 ambient-shadow p-md flex flex-col gap-sm">
          <h3 className="text-headline-sm text-on-surface mb-xs">Resumo de Progresso</h3>
          <div className="flex items-center justify-between p-sm bg-surface-container-low rounded-lg">
            <div className="flex items-center gap-sm"><div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center text-success"><span className="material-symbols-outlined text-[18px]">check_circle</span></div><span className="text-label-md text-on-surface">Concluídas</span></div>
            <span className="text-headline-sm font-bold text-on-surface">{concluidas}</span>
          </div>
          <div className="flex items-center justify-between p-sm bg-primary-fixed/50 rounded-lg border border-primary/20">
            <div className="flex items-center gap-sm"><div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary-container"><span className="material-symbols-outlined text-[18px]">sync</span></div><span className="text-label-md text-on-surface">Em andamento</span></div>
            <span className="text-headline-sm font-bold text-primary-container">{emAndamento}</span>
          </div>
          <div className="flex items-center justify-between p-sm bg-error/5 rounded-lg border border-error/10">
            <div className="flex items-center gap-sm"><div className="w-8 h-8 rounded-full bg-error/20 flex items-center justify-center text-error"><span className="material-symbols-outlined text-[18px]">warning</span></div><span className="text-label-md text-on-surface">Atrasadas</span></div>
            <span className="text-headline-sm font-bold text-error">{atrasadas}</span>
          </div>
        </div>
      </div>

      {/* Gantt */}
      <div className="bg-surface rounded-xl border border-outline-variant/50 ambient-shadow p-md overflow-hidden flex flex-col">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-sm mb-md">
          <h3 className="text-headline-sm text-on-surface">Cronograma Gantt</h3>
          <div className="flex flex-wrap items-center gap-sm text-label-sm text-on-surface-variant">
            <span className="flex items-center gap-xs"><span className="w-3 h-3 rounded-sm bg-success" /> Concluída</span>
            <span className="flex items-center gap-xs"><span className="w-3 h-3 rounded-sm bg-primary-container" /> Em andamento</span>
            <span className="flex items-center gap-xs"><span className="w-3 h-3 rounded-sm bg-surface-container-highest" /> Não iniciada</span>
            <span className="flex items-center gap-xs"><span className="w-3 h-3 rounded-sm bg-error" /> Atrasada</span>
          </div>
        </div>
        {gantt ? (
          <div className="relative overflow-x-auto pb-sm">
            <div className="min-w-[800px]">
              <div className="flex border-b border-outline-variant/40 ml-[120px] text-label-sm text-on-surface-variant">
                {gantt.labels.map((m) => <div key={m} className="flex-1 py-xs text-center border-l border-outline-variant/20">{m}</div>)}
              </div>
              <div className="relative mt-sm flex flex-col gap-y-sm">
                {gantt.barras.map(({ fase, left, width }) => {
                  const s = STATUS_INFO[fase.status];
                  const active = fase.status === 'andamento';
                  return (
                    <div key={fase.id} className={`flex items-center h-8 rounded group ${active ? 'bg-primary-fixed/20' : 'hover:bg-surface-container-lowest transition-colors'}`}>
                      <div className={`w-[120px] shrink-0 text-body-sm px-sm truncate ${active ? 'font-medium text-primary' : 'text-on-surface'}`}>{fase.nome}</div>
                      <div className="flex-1 relative h-full flex items-center">
                        <div className={`absolute h-5 rounded-md shadow-sm overflow-hidden ${s.gantt}`} style={{ left, width }}>
                          {fase.pct > 0 && fase.pct < 100 && <div className="h-full bg-primary" style={{ width: `${fase.pct}%` }} />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-body-sm text-on-surface-variant py-md text-center">Sem datas suficientes para montar o cronograma.</p>
        )}
      </div>

      {/* Modal Adicionar/Editar Fase */}
      {modalOpen && form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/60 backdrop-blur-sm p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-surface-container-lowest w-full max-w-xl rounded-xl shadow-xl border border-outline-variant overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-lg py-md border-b border-outline-variant flex items-center justify-between bg-surface">
              <h3 className="text-headline-sm font-semibold text-on-surface">{form.id ? 'Editar Fase' : 'Adicionar Fase'}</h3>
              <button onClick={() => setModalOpen(false)} className="p-xs text-outline hover:text-error transition-colors rounded-md hover:bg-error-container/50"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-lg space-y-md bg-surface-bright">
              <div>
                <label className="block text-label-sm text-on-surface mb-1">Nome da Fase *</label>
                <input className={FIELD} value={form.nome} onChange={(e) => setCampo('nome', e.target.value)} placeholder="Ex: Fundações" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                <div>
                  <label className="block text-label-sm text-on-surface mb-1">Início</label>
                  <input type="date" className={FIELD} value={brParaInput(form.inicio)} onChange={(e) => setCampo('inicio', inputParaBr(e.target.value))} />
                </div>
                <div>
                  <label className="block text-label-sm text-on-surface mb-1">Término</label>
                  <input type="date" className={FIELD} value={brParaInput(form.termino)} onChange={(e) => setCampo('termino', inputParaBr(e.target.value))} />
                </div>
                <div>
                  <label className="block text-label-sm text-on-surface mb-1">Progresso (%)</label>
                  <input type="number" min={0} max={100} className={FIELD} value={form.pct} onChange={(e) => setCampo('pct', Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-label-sm text-on-surface mb-1">Status</label>
                  <select className={`${FIELD} appearance-none`} value={form.status} onChange={(e) => setCampo('status', e.target.value as FaseStatus)}>
                    <option value="nao_iniciada">Não iniciada</option>
                    <option value="andamento">Em andamento</option>
                    <option value="atrasada">Atrasada</option>
                    <option value="concluida">Concluída</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="px-lg py-md border-t border-outline-variant flex justify-end gap-sm bg-surface">
              <button onClick={() => setModalOpen(false)} className="px-lg py-2 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-variant transition-colors text-label-md">Cancelar</button>
              <button onClick={salvar} className="px-lg py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors text-label-md">Salvar Fase</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

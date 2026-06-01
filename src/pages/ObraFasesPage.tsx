import React from 'react';
import { useNavigate } from 'react-router-dom';
import ObraTabs from '../components/ObraTabs';

interface Fase { n: number; nome: string; inicio: string; termino: string; warnInicio?: boolean; pct: number; bar: string; pctText: string; status: string; chip: string; active?: boolean; }

const FASES: Fase[] = [
  { n: 1, nome: 'Fundações', inicio: '15/03/23', termino: '20/05/23', pct: 100, bar: 'bg-success', pctText: 'text-on-surface-variant', status: 'Concluída', chip: 'bg-success/10 text-success border-success/20' },
  { n: 2, nome: 'Estrutura', inicio: '21/05/23', termino: '10/10/23', pct: 100, bar: 'bg-success', pctText: 'text-on-surface-variant', status: 'Concluída', chip: 'bg-success/10 text-success border-success/20' },
  { n: 3, nome: 'Alvenaria', inicio: '11/10/23', termino: '28/02/24', pct: 45, bar: 'bg-primary-container', pctText: 'text-on-surface-variant', status: 'Em andamento', chip: 'bg-primary-container/10 text-primary-container border-primary-container/20', active: true },
  { n: 4, nome: 'Instalações', inicio: '01/03/24', termino: '15/07/24', warnInicio: true, pct: 15, bar: 'bg-error', pctText: 'text-error', status: 'Atrasada', chip: 'bg-error/10 text-error border-error/20' },
  { n: 5, nome: 'Acabamento', inicio: '16/07/24', termino: '15/11/24', pct: 0, bar: 'bg-outline-variant', pctText: 'text-on-surface-variant', status: 'Não iniciada', chip: 'bg-surface-variant text-on-surface-variant border-outline-variant/40' },
];

const MESES = ['Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov'];

const GANTT = [
  { nome: 'Fundações', left: '0%', width: '25%', cls: 'bg-success' },
  { nome: 'Estrutura', left: '25%', width: '55%', cls: 'bg-success' },
  { nome: 'Alvenaria', left: '75%', width: '35%', cls: 'bg-primary-container', progress: '45%', active: true },
  { nome: 'Instalações', left: '30%', width: '40%', cls: 'bg-error' },
  { nome: 'Acabamento', left: '50%', width: '50%', cls: 'bg-surface-container-highest border border-outline-variant' },
];

export default function ObraFasesPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-lg max-w-[1280px] mx-auto w-full">
      {/* Header */}
      <section className="bg-primary-container text-on-primary rounded-xl p-lg ambient-shadow relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-primary rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/3" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-md">
          <div className="flex flex-col gap-sm">
            <div className="flex items-center gap-md flex-wrap">
              <h2 className="text-display-lg-mobile md:text-display-lg text-on-primary">Edifício Horizonte — Torre A</h2>
              <span className="bg-error text-on-error text-label-sm px-sm py-xs rounded flex items-center gap-xs"><span className="material-symbols-outlined text-[14px]">warning</span> Em risco</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md mt-sm text-on-primary/90 text-body-sm">
              {[['Cliente', 'Construtora Meridional S.A.'], ['Tipo', 'Residencial'], ['Responsável', 'Eng. Carlos Motta'], ['Cronograma', '15 Mar 2023 - 15 Nov 2024']].map(([k, v]) => (
                <div key={k}>
                  <span className="block text-on-primary/70 text-label-sm mb-xs">{k}</span>
                  <span className="font-medium">{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-sm shrink-0">
            <button className="bg-transparent border border-on-primary text-on-primary text-label-md px-md py-sm rounded-lg hover:bg-on-primary/10 transition-colors flex items-center gap-sm"><span className="material-symbols-outlined text-[18px]">edit</span> Editar Obra</button>
            <button className="bg-transparent border border-on-primary text-on-primary text-label-md px-md py-sm rounded-lg hover:bg-on-primary/10 transition-colors flex items-center gap-sm"><span className="material-symbols-outlined text-[18px]">download</span> Exportar</button>
          </div>
        </div>
      </section>

      <ObraTabs />

      {/* Action bar */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-md">
        <div className="flex gap-sm w-full sm:w-auto">
          <button className="bg-primary-container text-on-primary text-label-md px-md py-sm rounded-lg hover:opacity-90 transition-opacity flex items-center gap-sm ambient-shadow w-full sm:w-auto justify-center"><span className="material-symbols-outlined text-[18px]">add</span> Adicionar Fase</button>
          <button onClick={() => navigate('/importar')} className="bg-surface border border-outline-variant text-on-surface text-label-md px-md py-sm rounded-lg hover:bg-surface-container-low transition-colors flex items-center gap-sm w-full sm:w-auto justify-center"><span className="material-symbols-outlined text-[18px]">smart_toy</span> Importar Cronograma (IA)</button>
        </div>
        <div className="relative w-full sm:w-64">
          <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
          <input className="w-full pl-[36px] pr-sm py-sm rounded-lg border border-outline-variant bg-surface text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container focus:outline-none" placeholder="Buscar fases..." type="text" />
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
                {FASES.map((f) => (
                  <tr key={f.n} className={`transition-colors group h-14 ${f.active ? 'bg-primary-fixed/30 hover:bg-primary-fixed/40 border-l-2 border-l-primary' : 'hover:bg-surface-container-lowest'}`}>
                    <td className={`py-sm px-md ${f.active ? 'text-primary font-medium' : 'text-on-surface-variant'}`}>{f.n}</td>
                    <td className={`py-sm px-md ${f.active ? 'font-semibold text-on-surface' : 'font-medium'}`}>{f.nome}</td>
                    <td className={`py-sm px-md ${f.warnInicio ? 'text-error flex items-center gap-xs' : 'text-on-surface-variant'}`}>
                      {f.warnInicio && <span className="material-symbols-outlined text-[14px]">warning</span>}{f.inicio}
                    </td>
                    <td className="py-sm px-md text-on-surface-variant">{f.termino}</td>
                    <td className="py-sm px-md">
                      <div className="flex items-center gap-xs">
                        <div className="flex-1 h-2 bg-surface-container-highest rounded-full overflow-hidden">
                          <div className={`h-full ${f.bar}`} style={{ width: `${f.pct}%` }} />
                        </div>
                        <span className={`text-[11px] w-8 text-right ${f.pctText}`}>{f.pct}%</span>
                      </div>
                    </td>
                    <td className="py-sm px-md"><span className={`inline-flex items-center px-xs py-0.5 rounded text-[11px] font-medium border ${f.chip}`}>{f.status}</span></td>
                    <td className={`py-sm px-md text-right ${f.active ? '' : 'opacity-0 group-hover:opacity-100 transition-opacity'}`}>
                      <button className="text-on-surface-variant hover:text-primary p-xs"><span className="material-symbols-outlined text-[18px]">visibility</span></button>
                      <button className="text-on-surface-variant hover:text-primary p-xs"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Resumo */}
        <div className="bg-surface rounded-xl border border-outline-variant/50 ambient-shadow p-md flex flex-col gap-sm">
          <h3 className="text-headline-sm text-on-surface mb-xs">Resumo de Progresso</h3>
          <div className="flex items-center justify-between p-sm bg-surface-container-low rounded-lg">
            <div className="flex items-center gap-sm"><div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center text-success"><span className="material-symbols-outlined text-[18px]">check_circle</span></div><span className="text-label-md text-on-surface">Concluídas</span></div>
            <span className="text-headline-sm font-bold text-on-surface">2</span>
          </div>
          <div className="flex items-center justify-between p-sm bg-primary-fixed/50 rounded-lg border border-primary/20">
            <div className="flex items-center gap-sm"><div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary-container"><span className="material-symbols-outlined text-[18px]">sync</span></div><span className="text-label-md text-on-surface">Em andamento</span></div>
            <span className="text-headline-sm font-bold text-primary-container">1</span>
          </div>
          <div className="flex items-center justify-between p-sm bg-error/5 rounded-lg border border-error/10">
            <div className="flex items-center gap-sm"><div className="w-8 h-8 rounded-full bg-error/20 flex items-center justify-center text-error"><span className="material-symbols-outlined text-[18px]">warning</span></div><span className="text-label-md text-on-surface">Atrasadas</span></div>
            <span className="text-headline-sm font-bold text-error">1</span>
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
        <div className="relative overflow-x-auto pb-sm">
          <div className="min-w-[800px]">
            <div className="flex border-b border-outline-variant/40 ml-[120px] text-label-sm text-on-surface-variant">
              {MESES.map((m) => <div key={m} className="flex-1 py-xs text-center border-l border-outline-variant/20">{m}</div>)}
            </div>
            <div className="relative mt-sm flex flex-col gap-y-sm">
              <div className="absolute top-0 bottom-0 left-[280px] w-px border-l-2 border-dashed border-error z-10">
                <div className="absolute -top-6 -left-3 bg-error text-on-error text-[10px] px-1 rounded">Hoje</div>
              </div>
              {GANTT.map((g) => (
                <div key={g.nome} className={`flex items-center h-8 rounded group ${g.active ? 'bg-primary-fixed/20' : 'hover:bg-surface-container-lowest transition-colors'}`}>
                  <div className={`w-[120px] shrink-0 text-body-sm px-sm truncate ${g.active ? 'font-medium text-primary' : 'text-on-surface'}`}>{g.nome}</div>
                  <div className="flex-1 relative h-full flex items-center">
                    <div className={`absolute h-5 rounded-md shadow-sm overflow-hidden ${g.cls}`} style={{ left: g.left, width: g.width }}>
                      {g.progress && <div className="h-full bg-primary" style={{ width: g.progress }} />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

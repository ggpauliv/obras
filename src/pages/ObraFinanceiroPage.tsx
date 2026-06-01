import React from 'react';
import ObraTabs from '../components/ObraTabs';

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
  return (
    <div className="flex flex-col gap-lg w-full max-w-7xl mx-auto">
      {/* Context header */}
      <div className="bg-primary-container text-on-primary rounded-xl p-lg ambient-shadow flex flex-col md:flex-row items-start md:items-center justify-between gap-md relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent to-primary/20 pointer-events-none" />
        <div className="flex items-center gap-md relative z-10">
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
            <span className="material-symbols-outlined text-white text-3xl">apartment</span>
          </div>
          <div>
            <h2 className="text-display-lg font-bold text-white">Edifício Horizonte — Torre A</h2>
            <p className="text-body-md text-on-primary-container mt-1">Av. Paulista, 1000 - São Paulo, SP</p>
          </div>
        </div>
        <span className="relative z-10 px-3 py-1 bg-white/20 rounded-full text-label-md text-white backdrop-blur-sm border border-white/30">Em Andamento</span>
      </div>

      <ObraTabs />

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
    </div>
  );
}

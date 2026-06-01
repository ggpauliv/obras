import React from 'react';
import { useNavigate } from 'react-router-dom';

interface Row {
  nome: string;
  cliente: string;
  pct: number;
  barColor: string;
  status: string;
  statusClass: string;
  termino: string;
}

const ROWS: Row[] = [
  { nome: 'Edifício Horizonte', cliente: 'Construtora Apex', pct: 75, barColor: 'bg-primary-container', status: 'No Prazo', statusClass: 'bg-[#16A34A]/10 text-[#16A34A]', termino: '15 Nov 2024' },
  { nome: 'Residencial Alpha', cliente: 'Investimentos S.A.', pct: 92, barColor: 'bg-[#16A34A]', status: 'No Prazo', statusClass: 'bg-[#16A34A]/10 text-[#16A34A]', termino: '30 Ago 2024' },
  { nome: 'Edifício Torres', cliente: 'Torres Empreendimentos', pct: 35, barColor: 'bg-error', status: 'Com Atraso', statusClass: 'bg-error/10 text-error', termino: '10 Mar 2025' },
  { nome: 'Galpão Logístico Sul', cliente: 'LogisCorp', pct: 50, barColor: 'bg-[#F59E0B]', status: 'Em Risco', statusClass: 'bg-[#F59E0B]/10 text-[#F59E0B]', termino: '05 Dez 2024' },
  { nome: 'Hospital Municipal', cliente: 'Prefeitura Local', pct: 15, barColor: 'bg-primary-container', status: 'No Prazo', statusClass: 'bg-[#16A34A]/10 text-[#16A34A]', termino: '20 Jul 2026' },
];

const ALERTS = [
  { dot: 'bg-error', title: 'Edifício Torres', desc: 'Atraso de 23% no cronograma de fundação.' },
  { dot: 'bg-[#16A34A]', title: 'Obra Central', desc: 'Fase de alvenaria concluída com sucesso.' },
  { dot: 'bg-[#F59E0B]', title: 'Pagamento Fornecedor X', desc: 'Vencimento próximo (amanhã).' },
  { dot: 'bg-primary-container', title: 'Residencial Alpha', desc: 'Nova vistoria agendada.' },
];

function KpiCard({ icon, iconClass, badge, badgeClass, label, value, sub }: {
  icon: string; iconClass: string; badge?: string; badgeClass?: string; label: string; value: string; sub: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-outline-variant/50 p-md ambient-shadow flex flex-col justify-between hover:border-primary-container/30 transition-colors">
      <div className="flex justify-between items-start mb-md">
        <div className={`p-2 rounded-md ${iconClass}`}>
          <span className="material-symbols-outlined">{icon}</span>
        </div>
        {badge && (
          <span className={`inline-flex items-center gap-1 text-label-sm px-2 py-1 rounded ${badgeClass}`}>
            <span className="material-symbols-outlined text-[14px]">north_east</span> {badge}
          </span>
        )}
      </div>
      <div>
        <p className="text-label-sm text-outline uppercase tracking-wider mb-1">{label}</p>
        <h3 className="text-display-lg text-on-surface">{value}</h3>
        <p className="text-body-sm text-outline mt-1">{sub}</p>
      </div>
    </div>
  );
}

const SELECT = 'w-full rounded-md border-outline-variant text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container py-2 pl-3 pr-10';

export default function DashboardPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-xl">
      {/* Filtros */}
      <section className="flex flex-wrap items-center gap-md bg-white p-sm rounded-lg border border-outline-variant/30 ambient-shadow">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-label-sm text-outline mb-1 pl-1">Período</label>
          <select className={SELECT}>
            <option>Últimos 30 dias</option>
            <option>Este Trimestre</option>
            <option>Este Ano</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-label-sm text-outline mb-1 pl-1">Tipo de Obra</label>
          <select className={SELECT}>
            <option>Todos</option>
            <option>Residencial</option>
            <option>Comercial</option>
            <option>Infraestrutura</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-label-sm text-outline mb-1 pl-1">Status</label>
          <select className={SELECT}>
            <option>Todos</option>
            <option>No Prazo</option>
            <option>Com Atraso</option>
            <option>Em Risco</option>
          </select>
        </div>
        <div className="flex items-end h-[60px] pb-[2px]">
          <button className="px-md py-2 text-label-md text-outline hover:text-primary-container hover:bg-surface-container-low rounded-md transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">filter_alt_off</span> Limpar filtros
          </button>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
        <KpiCard icon="apartment" iconClass="bg-primary-container/10 text-primary-container" badge="2" badgeClass="text-[#16A34A] bg-[#16A34A]/10" label="Obras Ativas" value="12" sub="este mês" />
        <KpiCard icon="warning" iconClass="bg-error/10 text-error" badge="1" badgeClass="text-error bg-error/10" label="Com Atraso" value="3" sub="vs mês anterior" />
        <KpiCard icon="check_circle" iconClass="bg-[#16A34A]/10 text-[#16A34A]" label="No Prazo" value="8" sub="operações saudáveis" />
        <KpiCard icon="pie_chart" iconClass="bg-primary-container/10 text-primary-container" badge="8%" badgeClass="text-[#16A34A] bg-[#16A34A]/10" label="% Médio de Conclusão" value="64%" sub="vs mês anterior" />
      </section>

      {/* Gráfico + Alertas */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        <div className="lg:col-span-2 bg-white rounded-lg border border-outline-variant/50 ambient-shadow flex flex-col">
          <div className="p-md border-b border-outline-variant/30 flex justify-between items-center">
            <h3 className="text-headline-sm text-on-surface">Evolução do Progresso</h3>
            <span className="text-label-sm text-outline">Últimas 4 Semanas</span>
          </div>
          <div className="p-md flex-1 min-h-[300px] flex flex-col">
            <div className="flex gap-md mb-lg justify-end">
              <div className="flex items-center gap-2">
                <div className="w-4 border-t-2 border-dashed border-outline" />
                <span className="text-label-sm text-outline">Esperado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-primary-container rounded-sm" />
                <span className="text-label-sm text-outline">Real Geral</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-[#F59E0B] rounded-sm" />
                <span className="text-label-sm text-outline">Obras em risco</span>
              </div>
            </div>
            <div className="flex-1 relative w-full h-full mt-4">
              <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 600 250">
                {[20, 70, 120, 170].map((y) => (
                  <line key={y} stroke="#E5E7EB" strokeWidth="1" x1="40" x2="600" y1={y} y2={y} />
                ))}
                <line stroke="#9CA3AF" strokeWidth="1" x1="40" x2="600" y1="220" y2="220" />
                {['100%', '75%', '50%', '25%', '0%'].map((t, i) => (
                  <text key={t} className="fill-outline text-[10px]" textAnchor="end" x="30" y={25 + i * 50}>{t}</text>
                ))}
                {['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'].map((t, i) => (
                  <text key={t} className="fill-outline text-[10px]" textAnchor="middle" x={100 + i * 150} y="240">{t}</text>
                ))}
                <polyline fill="none" points="100,120 250,90 400,60 550,30" stroke="#9CA3AF" strokeDasharray="5,5" strokeWidth="2" />
                <polyline fill="none" points="100,130 250,105 400,80 550,55" stroke="#185FA5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
                {[[100, 130], [250, 105], [400, 80], [550, 55]].map(([cx, cy]) => (
                  <circle key={cx} cx={cx} cy={cy} fill="#185FA5" r="4" />
                ))}
                <polyline fill="none" points="100,140 250,135 400,130 550,120" stroke="#F59E0B" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                {[[100, 140], [250, 135], [400, 130], [550, 120]].map(([cx, cy]) => (
                  <circle key={cx} cx={cx} cy={cy} fill="#F59E0B" r="3" />
                ))}
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-outline-variant/50 ambient-shadow flex flex-col">
          <div className="p-md border-b border-outline-variant/30 flex justify-between items-center">
            <h3 className="text-headline-sm text-on-surface">Alertas Recentes</h3>
            <a className="text-label-sm text-primary-container hover:underline" href="#a">Ver todos</a>
          </div>
          <div className="p-sm flex-1 overflow-y-auto">
            <ul className="space-y-2">
              {ALERTS.map((a) => (
                <li key={a.title} className="flex items-start gap-3 p-3 rounded-md hover:bg-surface-container-low transition-colors">
                  <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${a.dot}`} />
                  <div>
                    <p className="text-label-md text-on-surface">{a.title}</p>
                    <p className="text-body-sm text-outline mt-0.5">{a.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Obras recentes */}
      <section className="bg-white rounded-lg border border-outline-variant/50 ambient-shadow overflow-hidden">
        <div className="p-md border-b border-outline-variant/30">
          <h3 className="text-headline-sm text-on-surface">Obras Recentes</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low/50">
                {['Nome da Obra', 'Cliente', '% Conclusão', 'Status', 'Término Prev.'].map((h) => (
                  <th key={h} className="py-3 px-md text-label-sm text-outline uppercase tracking-wider">{h}</th>
                ))}
                <th className="py-3 px-md text-label-sm text-outline uppercase tracking-wider text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {ROWS.map((r) => (
                <tr key={r.nome} className="hover:bg-surface-container-low transition-colors">
                  <td className="py-3 px-md text-label-md text-on-surface">{r.nome}</td>
                  <td className="py-3 px-md text-body-sm text-on-surface-variant">{r.cliente}</td>
                  <td className="py-3 px-md">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-surface-container-high rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${r.barColor}`} style={{ width: `${r.pct}%` }} />
                      </div>
                      <span className="text-label-sm text-on-surface w-8">{r.pct}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-md">
                    <span className={`inline-flex px-2 py-1 rounded text-label-sm ${r.statusClass}`}>{r.status}</span>
                  </td>
                  <td className="py-3 px-md text-body-sm text-on-surface-variant">{r.termino}</td>
                  <td className="py-3 px-md text-center">
                    <button onClick={() => navigate('/obra-detalhe')} className="text-outline hover:text-primary-container p-1 rounded transition-colors">
                      <span className="material-symbols-outlined">visibility</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

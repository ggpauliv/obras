import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import type { Obra } from '../store';

interface Row {
  id: string;
  nome: string;
  cliente?: string;
  pct?: number;
  data_termino?: string;
  barColor: string;
  status: string;
  statusClass: string;
}

interface Alert {
  dot: string;
  title: string;
  desc: string;
}

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
  const [obras, setObras] = useState<Row[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const carregarDados = async () => {
      try {
        const obrasData: Obra[] = await apiClient.listarObras();
        const obrasComStatus: Row[] = obrasData.map((o) => ({
          ...o,
          pct: o.pct || 0,
          barColor: (o.pct || 0) >= 75 ? 'bg-[#16A34A]' : (o.pct || 0) >= 50 ? 'bg-[#F59E0B]' : 'bg-error',
          status: getStatusObra(o.pct || 0),
          statusClass: getStatusClass(o.pct || 0),
          termino: o.data_termino ? new Date(o.data_termino).toLocaleDateString('pt-BR') : '—',
        }));
        setObras(obrasComStatus);

        // Gerar alertas a partir das obras
        const alertsGeradas: Alert[] = obrasComStatus
          .filter(o => (o.pct || 0) < 50)
          .slice(0, 4)
          .map(o => ({
            dot: o.barColor.replace('bg-', 'bg-').split(' ')[0],
            title: o.nome,
            desc: `Progresso em ${o.pct}%. Estimado para ${o.termino}`,
          }));
        setAlerts(alertsGeradas);
      } catch (err) {
        console.error('Erro ao carregar obras:', err);
      } finally {
        setCarregando(false);
      }
    };

    carregarDados();
  }, []);

  const getStatusObra = (pct: number): string => {
    if (pct >= 80) return 'No Prazo';
    if (pct >= 50) return 'Em Risco';
    return 'Com Atraso';
  };

  const getStatusClass = (pct: number): string => {
    if (pct >= 80) return 'bg-[#16A34A]/10 text-[#16A34A]';
    if (pct >= 50) return 'bg-[#F59E0B]/10 text-[#F59E0B]';
    return 'bg-error/10 text-error';
  };

  const statsObrasAtivas = obras.length;
  const statsComAtraso = obras.filter(o => (o.pct || 0) < 50).length;
  const statsNoPrazo = obras.filter(o => (o.pct || 0) >= 80).length;
  const statsMediaConclusao = obras.length > 0 ? Math.round(obras.reduce((sum, o) => sum + (o.pct || 0), 0) / obras.length) : 0;

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
        <KpiCard icon="apartment" iconClass="bg-primary-container/10 text-primary-container" badge={statsObrasAtivas > 0 ? '↑' : '—'} badgeClass="text-[#16A34A] bg-[#16A34A]/10" label="Obras Ativas" value={String(statsObrasAtivas)} sub="no total" />
        <KpiCard icon="warning" iconClass="bg-error/10 text-error" badge={statsComAtraso > 0 ? '⚠' : '—'} badgeClass="text-error bg-error/10" label="Com Atraso" value={String(statsComAtraso)} sub="requerem atenção" />
        <KpiCard icon="check_circle" iconClass="bg-[#16A34A]/10 text-[#16A34A]" label="No Prazo" value={String(statsNoPrazo)} sub="operações saudáveis" />
        <KpiCard icon="pie_chart" iconClass="bg-primary-container/10 text-primary-container" badge={statsMediaConclusao > 50 ? '↑' : '↓'} badgeClass={statsMediaConclusao > 50 ? "text-[#16A34A] bg-[#16A34A]/10" : "text-error bg-error/10"} label="% Médio de Conclusão" value={`${statsMediaConclusao}%`} sub="em média" />
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
              {alerts.length === 0 ? (
                <li className="p-3 text-center text-on-surface-variant">Nenhum alerta no momento</li>
              ) : (
                alerts.map((a) => (
                  <li key={a.title} className="flex items-start gap-3 p-3 rounded-md hover:bg-surface-container-low transition-colors">
                    <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${a.dot}`} />
                    <div>
                      <p className="text-label-md text-on-surface">{a.title}</p>
                      <p className="text-body-sm text-outline mt-0.5">{a.desc}</p>
                    </div>
                  </li>
                ))
              )}
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
              {carregando ? (
                <tr>
                  <td colSpan={6} className="py-6 px-md text-center text-on-surface-variant">
                    <span className="material-symbols-outlined animate-spin">progress_activity</span> Carregando...
                  </td>
                </tr>
              ) : obras.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 px-md text-center text-on-surface-variant">Nenhuma obra encontrada</td>
                </tr>
              ) : (
                obras.slice(0, 5).map((r) => (
                  <tr key={r.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="py-3 px-md text-label-md text-on-surface">{r.nome}</td>
                    <td className="py-3 px-md text-body-sm text-on-surface-variant">{r.cliente || '—'}</td>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

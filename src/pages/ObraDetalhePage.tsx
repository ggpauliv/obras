import React from 'react';
import ObraHeader from '../components/ObraHeader';

const FASES = [
  { nome: 'Fundações', desc: 'Infraestrutura base e estacas', pct: 100, label: '100% Concluída', icon: 'check', iconWrap: 'bg-[#16A34A]/10 text-[#16A34A]', bar: 'bg-[#16A34A]', text: 'text-[#16A34A] font-bold', extra: '' },
  { nome: 'Estrutura', desc: 'Pilares, vigas e lajes', pct: 100, label: '100% Concluída', icon: 'check', iconWrap: 'bg-[#16A34A]/10 text-[#16A34A]', bar: 'bg-[#16A34A]', text: 'text-[#16A34A] font-bold', extra: '' },
  { nome: 'Alvenaria', desc: 'Fechamentos e paredes internas', pct: 68, label: '68% Em andamento', icon: 'progress_activity', iconWrap: 'bg-primary/10 text-primary', bar: 'bg-primary', text: 'text-primary font-bold', extra: 'bg-primary-container/5 border-l-4 border-l-primary' },
  { nome: 'Instalações', desc: 'Elétrica, hidráulica e ar condicionado', pct: 0, label: '0% Não iniciada', icon: 'schedule', iconWrap: 'bg-surface-container-highest text-on-surface-variant', bar: 'bg-outline-variant', text: 'text-on-surface-variant', extra: 'opacity-60' },
  { nome: 'Acabamento', desc: 'Pisos, pintura e metais', pct: 0, label: '0% Não iniciada', icon: 'schedule', iconWrap: 'bg-surface-container-highest text-on-surface-variant', bar: 'bg-outline-variant', text: 'text-on-surface-variant', extra: 'opacity-60' },
];

function Kpi({ children }: { children: React.ReactNode }) {
  return <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md ambient-shadow flex flex-col gap-sm">{children}</div>;
}

export default function ObraDetalhePage() {
  return (
    <div className="flex flex-col gap-lg">
      <ObraHeader />

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        <Kpi>
          <div className="flex justify-between items-start">
            <h3 className="text-label-md text-on-surface-variant uppercase tracking-wider">Progresso Geral</h3>
            <div className="p-1.5 bg-surface-container rounded-md text-primary"><span className="material-symbols-outlined text-[18px]">monitoring</span></div>
          </div>
          <div className="flex items-end gap-sm">
            <span className="text-display-lg text-on-surface font-bold">52%</span>
            <span className="text-label-sm text-error flex items-center mb-1"><span className="material-symbols-outlined text-[14px] mr-1">trending_down</span> Atraso 9%</span>
          </div>
          <div className="w-full bg-surface-container-highest rounded-full h-1.5 mt-1 relative overflow-hidden">
            <div className="bg-primary h-1.5 rounded-full absolute top-0 left-0" style={{ width: '52%' }} />
            <div className="bg-outline h-1.5 w-1 absolute top-0" style={{ left: '61%' }} title="Esperado 61%" />
          </div>
          <p className="text-body-sm text-on-surface-variant mt-1">Progresso esperado: 61%</p>
        </Kpi>
        <Kpi>
          <div className="flex justify-between items-start">
            <h3 className="text-label-md text-on-surface-variant uppercase tracking-wider">Dias Corridos</h3>
            <div className="p-1.5 bg-surface-container rounded-md text-primary"><span className="material-symbols-outlined text-[18px]">calendar_today</span></div>
          </div>
          <div className="flex items-end gap-sm">
            <span className="text-display-lg text-on-surface font-bold">127</span>
            <span className="text-body-md text-on-surface-variant mb-1">de 261</span>
          </div>
          <div className="w-full bg-surface-container-highest rounded-full h-1.5 mt-1">
            <div className="bg-tertiary h-1.5 rounded-full" style={{ width: '48.6%' }} />
          </div>
          <p className="text-body-sm text-on-surface-variant mt-1">48.6% do tempo consumido</p>
        </Kpi>
        <div className="bg-surface-container-lowest rounded-xl border border-error/30 p-md ambient-shadow flex flex-col gap-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 w-1 h-full bg-error" />
          <div className="flex justify-between items-start">
            <h3 className="text-label-md text-on-surface-variant uppercase tracking-wider">Desvio Orçamentário</h3>
            <div className="p-1.5 bg-error-container rounded-md text-error"><span className="material-symbols-outlined text-[18px]">error</span></div>
          </div>
          <div className="flex items-end gap-sm"><span className="text-display-lg text-error font-bold">+R$ 320k</span></div>
          <div className="mt-2"><span className="inline-block bg-error-container text-on-error-container text-label-sm px-2 py-0.5 rounded font-bold">+3.7% acima</span></div>
          <p className="text-body-sm text-on-surface-variant mt-1">Referente ao orçado até o momento</p>
        </div>
      </div>

      {/* Grid 2/3 + 1/3 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter items-start">
        <div className="lg:col-span-2 bg-surface-container-lowest rounded-xl border border-outline-variant ambient-shadow overflow-hidden">
          <div className="p-md border-b border-outline-variant flex justify-between items-center bg-surface-bright">
            <h2 className="text-headline-sm font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">account_tree</span> Resumo de Fases
            </h2>
            <button className="text-primary hover:text-primary-container text-label-sm transition-colors">Ver detalhamento completo</button>
          </div>
          <div className="flex flex-col">
            {FASES.map((f) => (
              <div key={f.nome} className={`p-md border-b border-outline-variant/50 flex flex-col sm:flex-row sm:items-center gap-md hover:bg-surface-container-low transition-colors ${f.extra}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${f.iconWrap}`}>
                  <span className="material-symbols-outlined text-[20px]">{f.icon}</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-label-md text-on-surface font-bold">{f.nome}</h4>
                  <p className="text-body-sm text-on-surface-variant">{f.desc}</p>
                </div>
                <div className="sm:w-1/3 flex flex-col gap-1">
                  <div className="flex justify-between text-label-sm"><span className={f.text}>{f.label}</span></div>
                  <div className="w-full bg-surface-container-highest rounded-full h-2">
                    <div className={`h-2 rounded-full ${f.bar}`} style={{ width: `${f.pct}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-gutter">
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant ambient-shadow overflow-hidden flex flex-col">
            <div className="p-md border-b border-outline-variant bg-surface-bright">
              <h2 className="text-headline-sm font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">location_on</span> Localização
              </h2>
            </div>
            <div className="h-48 w-full bg-surface-container-high relative flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#185fa5 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
              <span className="material-symbols-outlined text-error text-4xl" data-weight="fill">location_on</span>
            </div>
            <div className="p-md flex flex-col gap-md">
              <p className="text-body-md text-on-surface">
                Av. das Américas, 3500<br />
                <span className="text-on-surface-variant text-body-sm">Barra da Tijuca, Rio de Janeiro - RJ</span>
              </p>
              <button className="w-full py-sm px-md rounded-lg border border-outline-variant text-on-surface text-label-md hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[18px]">open_in_new</span> Abrir no Google Maps
              </button>
            </div>
          </div>
          <div className="bg-surface-container-lowest rounded-xl border border-outline-variant ambient-shadow p-md flex items-start gap-md">
            <div className="w-10 h-10 rounded-full bg-tertiary-container/20 text-tertiary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">partly_cloudy_day</span>
            </div>
            <div>
              <h4 className="text-label-md font-bold text-on-surface">Condições Atuais</h4>
              <p className="text-body-sm text-on-surface-variant mt-1">Dia ensolarado, 28°C. Ideal para concretagem programada.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

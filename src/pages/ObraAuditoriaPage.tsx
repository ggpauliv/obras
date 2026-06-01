import React from 'react';
import ObraTabs from '../components/ObraTabs';

interface Evento { icon: string; fill?: boolean; border: string; text?: string; titulo: string; desc: string; data: string; tituloClass?: string; }

const EVENTOS: Evento[] = [
  { icon: 'check_circle', fill: true, border: 'border-primary text-primary', titulo: 'Registro de Progresso', desc: 'Eng. Ricardo Silva registrou 15% de avanço na fase de Alvenaria', data: '15/05/2024 10:30' },
  { icon: 'verified', fill: true, border: 'border-[#16A34A] text-[#16A34A]', titulo: 'Aprovação', desc: 'Gestor aprovou relatório de medição #452', data: '14/05/2024 16:45' },
  { icon: 'warning', fill: true, border: 'border-error text-error', titulo: 'Alerta do Sistema', desc: 'Atraso crítico detectado na entrega de materiais', data: '13/05/2024 09:00', tituloClass: 'text-error' },
  { icon: 'cancel', fill: true, border: 'border-[#F59E0B] text-[#F59E0B]', titulo: 'Rejeição', desc: 'Foto #4829 rejeitada por Eng. Carlos Motta (Imagem sem nitidez)', data: '12/05/2024 11:20' },
  { icon: 'payments', border: 'border-[#16A34A] text-[#16A34A]', titulo: 'Pagamento Liberado', desc: 'Financeiro liberou pagamento de R$ 50.000 para Fornecedor X', data: '11/05/2024 14:10' },
  { icon: 'event', border: 'border-[#8B5CF6] text-[#8B5CF6]', titulo: 'Alteração de Prazo', desc: 'Prazo da fase de Acabamento prorrogado em 15 dias', data: '10/05/2024 17:30' },
];

const CTRL = 'bg-surface border border-outline-variant text-on-surface text-label-md px-md py-sm rounded-md flex items-center gap-sm hover:bg-surface-container-low transition-colors ambient-shadow';

export default function ObraAuditoriaPage() {
  return (
    <div className="space-y-xl">
      {/* Header */}
      <div className="bg-primary-container text-on-primary-container rounded-xl p-lg ambient-shadow flex flex-col md:flex-row justify-between items-start md:items-center border border-tertiary-container relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="space-y-sm z-10">
          <div className="flex items-center gap-md flex-wrap">
            <h2 className="text-display-lg text-white">Edifício Horizonte — Torre A</h2>
            <span className="bg-[#ffdad6]/20 text-[#ffdad6] text-label-sm px-2 py-1 rounded border border-[#ffdad6]/30 flex items-center gap-xs">
              <span className="material-symbols-outlined text-[14px]">warning</span> Em risco
            </span>
          </div>
          <div className="flex items-center gap-gutter text-body-sm text-on-primary-container flex-wrap">
            <span className="flex items-center gap-xs"><span className="material-symbols-outlined text-[16px]">domain</span> Cliente: Construtora Meridional S.A.</span>
            <span className="flex items-center gap-xs"><span className="material-symbols-outlined text-[16px]">person</span> Responsável: Eng. Carlos Motta</span>
          </div>
        </div>
      </div>

      <ObraTabs />

      {/* Controles */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-md">
        <div className="flex gap-md flex-wrap">
          <button className={CTRL}><span className="material-symbols-outlined text-[18px]">filter_list</span> Filtros <span className="material-symbols-outlined text-[16px]">expand_more</span></button>
          <button className={CTRL}>Ação <span className="material-symbols-outlined text-[16px]">expand_more</span></button>
          <button className={CTRL}>Usuário <span className="material-symbols-outlined text-[16px]">expand_more</span></button>
        </div>
        <button className="bg-primary text-on-primary text-label-md px-md py-sm rounded-md flex items-center gap-sm hover:bg-primary/90 transition-colors ambient-shadow">
          <span className="material-symbols-outlined text-[18px]">download</span> Exportar CSV
        </button>
      </div>

      {/* Timeline */}
      <div className="bg-surface rounded-xl border border-outline-variant ambient-shadow p-xl">
        <h3 className="text-headline-sm text-on-surface mb-xl border-b border-outline-variant pb-md">Histórico de Auditoria</h3>
        <div className="relative pl-6 border-l-2 border-surface-container-high space-y-xl">
          {EVENTOS.map((e) => (
            <div key={e.data} className="relative group">
              <div className={`absolute -left-[35px] top-1 bg-surface rounded-full p-1 border-2 ${e.border}`}>
                <span className="material-symbols-outlined text-[16px]" data-weight={e.fill ? 'fill' : undefined}>{e.icon}</span>
              </div>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full gap-sm">
                <div>
                  <h4 className={`text-label-md font-semibold ${e.tituloClass || 'text-on-surface'}`}>{e.titulo}</h4>
                  <p className="text-body-md text-on-surface-variant mt-1">{e.desc}</p>
                </div>
                <span className="text-label-sm text-secondary-fixed-dim whitespace-nowrap">{e.data}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

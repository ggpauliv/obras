import React, { useState, useEffect } from 'react';
import ObraHeader from '../components/ObraHeader';
import { listarEventos, getObraAtivaId } from '../store';
import type { EventoAuditoria } from '../store';

interface Evento { icon: string; fill?: boolean; border: string; text?: string; titulo: string; desc: string; data: string; tituloClass?: string; }

const EVENTOS_EXEMPLO: Evento[] = [
  { icon: 'check_circle', fill: true, border: 'border-primary text-primary', titulo: 'Registro de Progresso', desc: 'Eng. Ricardo Silva registrou 15% de avanço na fase de Alvenaria', data: '15/05/2024 10:30' },
  { icon: 'verified', fill: true, border: 'border-[#16A34A] text-[#16A34A]', titulo: 'Aprovação', desc: 'Gestor aprovou relatório de medição #452', data: '14/05/2024 16:45' },
  { icon: 'warning', fill: true, border: 'border-error text-error', titulo: 'Alerta do Sistema', desc: 'Atraso crítico detectado na entrega de materiais', data: '13/05/2024 09:00', tituloClass: 'text-error' },
  { icon: 'cancel', fill: true, border: 'border-[#F59E0B] text-[#F59E0B]', titulo: 'Rejeição', desc: 'Foto #4829 rejeitada por Eng. Carlos Motta (Imagem sem nitidez)', data: '12/05/2024 11:20' },
  { icon: 'payments', border: 'border-[#16A34A] text-[#16A34A]', titulo: 'Pagamento Liberado', desc: 'Financeiro liberou pagamento de R$ 50.000 para Fornecedor X', data: '11/05/2024 14:10' },
  { icon: 'event', border: 'border-[#8B5CF6] text-[#8B5CF6]', titulo: 'Alteração de Prazo', desc: 'Prazo da fase de Acabamento prorrogado em 15 dias', data: '10/05/2024 17:30' },
];

const CTRL = 'bg-surface border border-outline-variant text-on-surface text-label-md px-md py-sm rounded-md flex items-center gap-sm hover:bg-surface-container-low transition-colors ambient-shadow';

// Mapeia o tipo de evento do store para o estilo visual da timeline.
const TIPO_ESTILO: Record<string, { icon: string; border: string; fill?: boolean }> = {
  importacao: { icon: 'auto_awesome', border: 'border-primary text-primary', fill: true },
  progresso: { icon: 'check_circle', border: 'border-primary text-primary', fill: true },
  pagamento: { icon: 'payments', border: 'border-[#16A34A] text-[#16A34A]' },
};

export default function ObraAuditoriaPage() {
  const [eventosStore, setEventosStore] = useState<Evento[]>([]);

  useEffect(() => {
    listarEventos(getObraAtivaId()).then((eventos) => {
      const transformados = eventos.map((e: EventoAuditoria) => {
        const est = TIPO_ESTILO[e.tipo] ?? { icon: 'event', border: 'border-[#8B5CF6] text-[#8B5CF6]' };
        return {
          icon: est.icon,
          fill: est.fill,
          border: est.border,
          titulo: e.titulo,
          desc: e.descricao,
          data: new Date(e.data).toLocaleString('pt-BR'),
        };
      });
      setEventosStore(transformados);
    });
  }, []);

  const EVENTOS: Evento[] = [...eventosStore, ...EVENTOS_EXEMPLO];

  return (
    <div className="flex flex-col gap-lg">
      <ObraHeader />

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
          {EVENTOS.map((e, idx) => (
            <div key={idx} className="relative group">
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

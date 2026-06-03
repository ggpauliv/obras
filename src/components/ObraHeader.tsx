import React from 'react';
import ObraTabs from './ObraTabs';
import { getObraAtivaId, obterObra } from '../store';

/**
 * Cabeçalho compacto e consistente da obra, usado em todas as abas
 * (Visão Geral, Fases, Financeiro, Fotos, Auditoria).
 * Apenas o conteúdo abaixo deste cabeçalho muda entre as abas.
 * Os dados refletem a obra ativa (selecionada na lista de obras).
 */

export default function ObraHeader() {
  const obra = obterObra(getObraAtivaId());
  const emRisco = obra?.status === 'atrasada';

  const info: Array<[string, string, string]> = [
    ['domain', 'Cliente', obra?.cliente ?? '—'],
    ['apartment', 'Tipo', obra?.tipo ?? '—'],
    ['calendar_today', 'Início', obra?.inicio ?? '—'],
    ['event', 'Término', obra?.termino ?? '—'],
  ];

  return (
    <div className="flex flex-col gap-lg">
      <div className="bg-primary-container text-on-primary rounded-xl p-lg ambient-shadow relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-sm">
          <div className="flex items-center gap-md flex-wrap">
            <h2 className="text-display-lg-mobile md:text-display-lg text-on-primary">{obra?.nome ?? 'Obra'}</h2>
            {emRisco && (
              <span className="bg-error text-on-error text-label-sm px-sm py-xs rounded flex items-center gap-xs">
                <span className="material-symbols-outlined text-[14px]">warning</span> Em risco
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-lg gap-y-sm text-body-sm text-on-primary/90">
            {info.map(([icon, label, valor]) => (
              <span key={label} className="flex items-center gap-xs">
                <span className="material-symbols-outlined text-[16px]">{icon}</span>
                <span className="text-on-primary/70">{label}:</span> {valor}
              </span>
            ))}
          </div>
        </div>
      </div>

      <ObraTabs />
    </div>
  );
}

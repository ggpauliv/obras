import React, { useState, useEffect } from 'react';
import ObraTabs from './ObraTabs';
import { getObraAtivaId, setObraAtivaId, obterObra, listarObras } from '../store';
import type { Obra } from '../store';

/**
 * Cabeçalho compacto e consistente da obra, usado em todas as abas
 * (Visão Geral, Fases, Financeiro, Fotos, Auditoria).
 * Apenas o conteúdo abaixo deste cabeçalho muda entre as abas.
 * Os dados refletem a obra ativa (selecionada na lista de obras).
 */

export default function ObraHeader() {
  const [obra, setObra] = useState<Obra | undefined>();
  const [obras, setObras] = useState<Obra[]>([]);
  const ativaId = getObraAtivaId();

  useEffect(() => {
    listarObras().then((lista) => {
      setObras(lista);
      // Se a obra ativa estiver vazia ou não pertencer à lista (id antigo / outra
      // empresa), seleciona a primeira obra válida e recarrega para alinhar todas as abas.
      const valida = ativaId && lista.some((o) => o.id === ativaId);
      if (!valida && lista.length > 0) {
        setObraAtivaId(lista[0].id);
        window.location.reload();
        return;
      }
      if (valida) obterObra(ativaId).then(setObra);
    });
  }, [ativaId]);

  const trocarObra = (id: string) => {
    if (id && id !== ativaId) {
      setObraAtivaId(id);
      window.location.reload(); // recarrega a aba atual já com a nova obra
    }
  };

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
          <div className="flex items-center justify-between gap-md flex-wrap">
            <div className="flex items-center gap-md flex-wrap">
              <h2 className="text-display-lg-mobile md:text-display-lg text-on-primary">{obra?.nome ?? 'Obra'}</h2>
              {emRisco && (
                <span className="bg-error text-on-error text-label-sm px-sm py-xs rounded flex items-center gap-xs">
                  <span className="material-symbols-outlined text-[14px]">warning</span> Em risco
                </span>
              )}
            </div>
            {/* Seletor de obra — troca a obra ativa em todas as abas */}
            <div className="flex items-center gap-2 bg-white/15 rounded-lg pl-3 pr-1 py-1 border border-white/30">
              <span className="material-symbols-outlined text-[18px] text-on-primary/80">swap_horiz</span>
              <span className="text-label-sm text-on-primary/80 hidden sm:inline">Obra:</span>
              <select
                value={ativaId}
                onChange={(e) => trocarObra(e.target.value)}
                title="Trocar de obra"
                className="bg-transparent text-on-primary text-body-sm font-medium rounded px-1 py-1 focus:outline-none cursor-pointer max-w-[220px]"
              >
                {obras.map((o) => (
                  <option key={o.id} value={o.id} className="text-on-surface">{o.nome}</option>
                ))}
              </select>
            </div>
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

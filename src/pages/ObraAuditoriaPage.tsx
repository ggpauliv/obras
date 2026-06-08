import React, { useState, useEffect, useMemo } from 'react';
import ObraHeader from '../components/ObraHeader';
import { listarEventos, getObraAtivaId } from '../store';
import type { EventoAuditoria } from '../store';

interface Evento {
  icon: string; fill?: boolean; border: string; titulo: string; desc: string;
  data: string; tipo: string; usuario: string; ts: number;
}

const CTRL = 'bg-surface border border-outline-variant text-on-surface text-label-md px-md py-sm rounded-md focus:outline-none focus:border-primary';

const TIPO_ESTILO: Record<string, { icon: string; border: string; fill?: boolean; rotulo: string }> = {
  importacao: { icon: 'auto_awesome', border: 'border-primary text-primary', fill: true, rotulo: 'Importação' },
  APPROVE: { icon: 'verified', border: 'border-[#16A34A] text-[#16A34A]', fill: true, rotulo: 'Aprovação' },
  CREATE: { icon: 'add_circle', border: 'border-primary text-primary', rotulo: 'Criação' },
  UPDATE: { icon: 'edit', border: 'border-[#8B5CF6] text-[#8B5CF6]', rotulo: 'Atualização' },
  DELETE: { icon: 'delete', border: 'border-error text-error', rotulo: 'Exclusão' },
  pagamento: { icon: 'payments', border: 'border-[#16A34A] text-[#16A34A]', rotulo: 'Pagamento' },
  progresso: { icon: 'check_circle', border: 'border-primary text-primary', fill: true, rotulo: 'Progresso' },
};
const estiloDe = (t: string) => TIPO_ESTILO[t] || { icon: 'event', border: 'border-[#8B5CF6] text-[#8B5CF6]', rotulo: t || 'Evento' };

export default function ObraAuditoriaPage() {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');

  useEffect(() => {
    listarEventos(getObraAtivaId()).then((lista) => {
      setEventos(lista.map((e: EventoAuditoria) => {
        const est = estiloDe(e.tipo);
        return {
          icon: est.icon, fill: est.fill, border: est.border,
          titulo: e.titulo, desc: e.descricao, tipo: e.tipo, usuario: (e as any).usuario || '',
          data: new Date(e.data).toLocaleString('pt-BR'), ts: new Date(e.data).getTime(),
        };
      }));
    });
  }, []);

  const tipos = useMemo(() => Array.from(new Set(eventos.map(e => e.tipo))).filter(Boolean), [eventos]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return eventos.filter(e => {
      const okBusca = !q || e.titulo.toLowerCase().includes(q) || e.desc.toLowerCase().includes(q) || e.usuario.toLowerCase().includes(q);
      const okTipo = !filtroTipo || e.tipo === filtroTipo;
      return okBusca && okTipo;
    });
  }, [eventos, busca, filtroTipo]);

  const exportarCSV = () => {
    const linhas = [['Data', 'Ação', 'Título', 'Descrição', 'Usuário'],
      ...filtrados.map(e => [e.data, estiloDe(e.tipo).rotulo, e.titulo, e.desc, e.usuario])];
    const csv = linhas.map(l => l.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = 'auditoria.csv'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-lg">
      <ObraHeader />

      {/* Controles */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-md">
        <div className="flex gap-md flex-wrap flex-1">
          <div className="relative flex-1 min-w-[200px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar no histórico…" className={`w-full pl-10 ${CTRL}`} />
          </div>
          <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className={CTRL}>
            <option value="">Todas as ações</option>
            {tipos.map(t => <option key={t} value={t}>{estiloDe(t).rotulo}</option>)}
          </select>
        </div>
        <button onClick={exportarCSV} disabled={filtrados.length === 0} className="bg-primary text-on-primary text-label-md px-md py-sm rounded-md flex items-center gap-sm hover:bg-primary/90 transition-colors disabled:opacity-50 shrink-0">
          <span className="material-symbols-outlined text-[18px]">download</span> Exportar CSV
        </button>
      </div>

      {/* Timeline */}
      <div className="bg-surface rounded-xl border border-outline-variant ambient-shadow p-xl">
        <h3 className="text-headline-sm text-on-surface mb-xl border-b border-outline-variant pb-md">
          Histórico de Auditoria <span className="text-body-sm font-normal text-on-surface-variant">({filtrados.length})</span>
        </h3>
        {filtrados.length === 0 ? (
          <p className="text-body-md text-on-surface-variant text-center py-lg">Nenhum evento registrado para esta obra{busca || filtroTipo ? ' com os filtros atuais' : ''}.</p>
        ) : (
          <div className="relative pl-6 border-l-2 border-surface-container-high space-y-xl">
            {filtrados.map((e, idx) => (
              <div key={idx} className="relative group">
                <div className={`absolute -left-[35px] top-1 bg-surface rounded-full p-1 border-2 ${e.border}`}>
                  <span className="material-symbols-outlined text-[16px]" data-weight={e.fill ? 'fill' : undefined}>{e.icon}</span>
                </div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full gap-sm">
                  <div>
                    <h4 className="text-label-md font-semibold text-on-surface">{e.titulo}</h4>
                    <p className="text-body-md text-on-surface-variant mt-1">{e.desc}</p>
                  </div>
                  <span className="text-label-sm text-secondary-fixed-dim whitespace-nowrap">{e.data}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

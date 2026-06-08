import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ObraHeader from '../components/ObraHeader';
import { getObraAtivaId, obterObra, listarFases, listarDespesas } from '../store';
import type { Obra, Fase, Despesa, FaseStatus } from '../store';

const STATUS_INFO: Record<FaseStatus, { label: string; bar: string; text: string; iconWrap: string; icon: string }> = {
  concluida: { label: 'Concluída', bar: 'bg-[#16A34A]', text: 'text-[#16A34A] font-bold', iconWrap: 'bg-[#16A34A]/10 text-[#16A34A]', icon: 'check' },
  andamento: { label: 'Em andamento', bar: 'bg-primary', text: 'text-primary font-bold', iconWrap: 'bg-primary/10 text-primary', icon: 'progress_activity' },
  atrasada: { label: 'Atrasada', bar: 'bg-error', text: 'text-error font-bold', iconWrap: 'bg-error/10 text-error', icon: 'warning' },
  nao_iniciada: { label: 'Não iniciada', bar: 'bg-outline-variant', text: 'text-on-surface-variant', iconWrap: 'bg-surface-container-highest text-on-surface-variant', icon: 'schedule' },
};

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function parseBR(s: string): number | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{2,4})$/.exec((s || '').trim());
  if (!m) return null;
  let ano = +m[3]; if (ano < 100) ano += 2000;
  const d = new Date(ano, +m[2] - 1, +m[1]);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

function Kpi({ children }: { children: React.ReactNode }) {
  return <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md ambient-shadow flex flex-col gap-sm">{children}</div>;
}

export default function ObraDetalhePage() {
  const navigate = useNavigate();
  const obraId = getObraAtivaId();
  const [obra, setObra] = useState<Obra | undefined>();
  const [fases, setFases] = useState<Fase[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setCarregando(true);
    setErro(null);
    Promise.all([
      obterObra(obraId).then(setObra).catch(err => {
        console.error('Erro ao carregar obra:', err);
        setErro('Erro ao carregar dados da obra');
        setObra(undefined);
      }),
      listarFases(obraId).then(setFases).catch(err => {
        console.error('Erro ao carregar fases:', err);
        setFases([]);
      }),
      listarDespesas(obraId).then(setDespesas).catch(err => {
        console.error('Erro ao carregar despesas:', err);
        setDespesas([]);
      }),
    ]).finally(() => setCarregando(false));
  }, [obraId]);

  const totalDespesas = despesas.reduce((s, d) => s + (Number(d.valor) || 0), 0);
  const concluidas = fases.filter((f) => f.status === 'concluida').length;
  const atrasadas = fases.filter((f) => f.status === 'atrasada').length;

  // Progresso real = média do progresso das fases (reflete o que já aconteceu);
  // se não houver fases, usa o % da obra.
  const pct = fases.length
    ? Math.round(fases.reduce((s, f) => s + (f.pct || 0), 0) / fases.length)
    : (obra?.pct ?? 0);

  // Timeline considera as datas da obra E das fases (pega o início mais cedo e o término mais tarde)
  const iniCand = [parseBR(obra?.inicio || ''), ...fases.map((f) => parseBR(f.inicio))].filter((n): n is number => n != null);
  const fimCand = [parseBR(obra?.termino || ''), ...fases.map((f) => parseBR(f.termino))].filter((n): n is number => n != null);
  const ini = iniCand.length ? Math.min(...iniCand) : null;
  const fim = fimCand.length ? Math.max(...fimCand) : null;
  const hoje = Date.now();
  const totalDias = ini && fim ? Math.max(1, Math.round((fim - ini) / 86400000)) : null;
  const diasCorridos = ini ? Math.max(0, Math.round((hoje - ini) / 86400000)) : null;
  const pctTempo = totalDias && diasCorridos != null ? Math.min(100, (diasCorridos / totalDias) * 100) : null;

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-xl">
        <span className="material-symbols-outlined animate-spin text-primary text-3xl">progress_activity</span>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="bg-error-container text-on-error-container rounded-lg p-lg">
        <h3 className="text-headline-sm mb-2">Erro ao Carregar</h3>
        <p className="text-body-md">{erro}</p>
      </div>
    );
  }

  if (!obra) {
    return (
      <div className="bg-surface-container-lowest rounded-lg p-lg text-center">
        <p className="text-on-surface-variant">Nenhuma obra selecionada</p>
      </div>
    );
  }

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
            <span className="text-display-lg text-on-surface font-bold">{pct}%</span>
            {pctTempo != null && pct < pctTempo - 5 && (
              <span className="text-label-sm text-error flex items-center mb-1"><span className="material-symbols-outlined text-[14px] mr-1">trending_down</span> Atrás do tempo</span>
            )}
          </div>
          <div className="w-full bg-surface-container-highest rounded-full h-1.5 mt-1 relative overflow-hidden">
            <div className="bg-primary h-1.5 rounded-full absolute top-0 left-0" style={{ width: `${pct}%` }} />
            {pctTempo != null && <div className="bg-outline h-1.5 w-1 absolute top-0" style={{ left: `${pctTempo}%` }} title={`Tempo decorrido ${pctTempo.toFixed(0)}%`} />}
          </div>
          <p className="text-body-sm text-on-surface-variant mt-1">{pctTempo != null ? `Tempo decorrido: ${pctTempo.toFixed(0)}%` : 'Sem datas para comparar'}</p>
        </Kpi>
        <Kpi>
          <div className="flex justify-between items-start">
            <h3 className="text-label-md text-on-surface-variant uppercase tracking-wider">Dias Corridos</h3>
            <div className="p-1.5 bg-surface-container rounded-md text-primary"><span className="material-symbols-outlined text-[18px]">calendar_today</span></div>
          </div>
          <div className="flex items-end gap-sm">
            <span className="text-display-lg text-on-surface font-bold">{diasCorridos ?? '—'}</span>
            {totalDias && <span className="text-body-md text-on-surface-variant mb-1">de {totalDias}</span>}
          </div>
          <div className="w-full bg-surface-container-highest rounded-full h-1.5 mt-1">
            <div className="bg-tertiary h-1.5 rounded-full" style={{ width: `${pctTempo ?? 0}%` }} />
          </div>
          <p className="text-body-sm text-on-surface-variant mt-1">{pctTempo != null ? `${pctTempo.toFixed(0)}% do prazo` : '—'}</p>
        </Kpi>
        <Kpi>
          <div className="flex justify-between items-start">
            <h3 className="text-label-md text-on-surface-variant uppercase tracking-wider">Despesas Lançadas</h3>
            <div className="p-1.5 bg-surface-container rounded-md text-primary"><span className="material-symbols-outlined text-[18px]">payments</span></div>
          </div>
          <div className="flex items-end gap-sm"><span className="text-display-lg text-on-surface font-bold">{fmt(totalDespesas)}</span></div>
          <p className="text-body-sm text-on-surface-variant mt-1">{despesas.length} lançamento(s) · veja em Financeiro</p>
        </Kpi>
      </div>

      {/* Resumo de fases */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant ambient-shadow overflow-hidden">
        <div className="p-md border-b border-outline-variant flex justify-between items-center bg-surface-bright">
          <h2 className="text-headline-sm font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">account_tree</span> Resumo de Fases
            <span className="text-body-sm font-normal text-on-surface-variant">({concluidas} concluídas · {atrasadas} atrasadas)</span>
          </h2>
          <button onClick={() => navigate('/obra-fases')} className="text-primary hover:text-primary-container text-label-sm transition-colors">Ver detalhamento completo</button>
        </div>
        <div className="flex flex-col">
          {fases.length === 0 && (
            <div className="p-lg text-center text-on-surface-variant text-body-sm">Nenhuma fase cadastrada para esta obra.</div>
          )}
          {fases.map((f) => {
            const s = STATUS_INFO[f.status];
            return (
              <div key={f.id} className="p-md border-b border-outline-variant/50 flex flex-col sm:flex-row sm:items-center gap-md hover:bg-surface-container-low transition-colors">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${s.iconWrap}`}>
                  <span className="material-symbols-outlined text-[20px]">{s.icon}</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-label-md text-on-surface font-bold">{f.nome}</h4>
                  <p className="text-body-sm text-on-surface-variant">{f.inicio || '—'} → {f.termino || '—'}</p>
                </div>
                <div className="sm:w-1/3 flex flex-col gap-1">
                  <div className="flex justify-between text-label-sm"><span className={s.text}>{f.pct}% {s.label}</span></div>
                  <div className="w-full bg-surface-container-highest rounded-full h-2">
                    <div className={`h-2 rounded-full ${s.bar}`} style={{ width: `${f.pct}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

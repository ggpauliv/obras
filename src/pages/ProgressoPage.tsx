import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import { listarObras } from '../store';
import type { Obra } from '../store';

interface Fase {
  id: string;
  nome: string;
  pct?: number;
}

interface HistoricoItem {
  dot: string;
  meta: string;
  titulo: string;
  desc: string;
}

const READONLY = 'px-sm py-sm bg-surface-container-low border border-outline-variant rounded text-on-surface text-body-md flex items-center gap-sm';

export default function ProgressoPage() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [fases, setFases] = useState<Fase[]>([]);
  const [obraId, setObraId] = useState('');
  const [faseId, setFaseId] = useState('');
  const [pct, setPct] = useState(0);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    listarObras().then(setObras);
  }, []);

  useEffect(() => {
    if (!obraId) {
      setFases([]);
      setFaseId('');
      return;
    }
    setCarregando(true);
    apiClient.listarFases(obraId)
      .then(f => {
        setFases(f || []);
        if (f && f.length > 0) setFaseId(f[0].id);
      })
      .catch(err => {
        console.error('Erro ao carregar fases:', err);
        setFases([]);
      })
      .finally(() => setCarregando(false));
  }, [obraId]);

  useEffect(() => {
    if (!faseId) {
      setHistorico([]);
      return;
    }
    const faseAtual = fases.find(f => f.id === faseId);
    if (faseAtual) {
      setPct(faseAtual.pct || 0);
      setHistorico([
        { dot: 'bg-primary-container', meta: 'Última atualização', titulo: `Avanço para ${faseAtual.pct || 0}%`, desc: faseAtual.nome },
      ]);
    }
  }, [faseId, fases]);

  const obraAtual = obras.find(o => o.id === obraId);
  const faseAtual = fases.find(f => f.id === faseId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
      {/* Coluna esquerda — formulário */}
      <div className="lg:col-span-7 flex flex-col gap-gutter">
        <div className="bg-surface-container-lowest rounded-lg border border-outline-variant shadow-sm overflow-hidden flex flex-col">
          <div className="px-lg py-md border-b border-outline-variant bg-surface">
            <h3 className="text-headline-sm text-on-surface flex items-center gap-sm">
              <span className="material-symbols-outlined text-primary">edit_document</span>Detalhes do Registro
            </h3>
          </div>
          <div className="p-lg flex-1 flex flex-col gap-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
              <div>
                <label className="block text-label-sm text-on-surface-variant mb-xs">Obra</label>
                <select value={obraId} onChange={(e) => setObraId(e.target.value)} className="w-full px-sm py-2 border border-outline-variant rounded text-on-surface text-body-md bg-surface-container-lowest focus:border-primary">
                  <option value="">Selecione uma obra…</option>
                  {obras.map(o => <option key={o.id} value={o.id}>{o.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-label-sm text-on-surface-variant mb-xs">Fase Atual</label>
                <select value={faseId} onChange={(e) => setFaseId(e.target.value)} disabled={!obraId} className="w-full px-sm py-2 border border-outline-variant rounded text-on-surface text-body-md bg-surface-container-lowest focus:border-primary disabled:opacity-50">
                  <option value="">Selecione uma fase…</option>
                  {fases.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                </select>
              </div>
            </div>
            <hr className="border-outline-variant" />
            <div>
              <label className="block text-label-sm text-on-surface mb-sm">Novo Percentual de Conclusão</label>
              <div className="flex items-center gap-md">
                <input type="range" min={0} max={100} value={pct} onChange={(e) => setPct(Number(e.target.value))}
                  className="flex-1 h-2 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary" />
                <div className="flex items-center border border-outline-variant rounded overflow-hidden w-24">
                  <input type="number" value={pct} onChange={(e) => setPct(Number(e.target.value))}
                    className="w-full px-sm py-xs text-center border-none focus:ring-0 text-body-md text-on-surface bg-surface-container-lowest" />
                  <span className="bg-surface-container px-sm py-xs border-l border-outline-variant text-secondary text-label-md">%</span>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-label-sm text-on-surface mb-xs">Motivo da Atualização</label>
              <select className="w-full px-sm py-2 border border-outline-variant rounded text-on-surface text-body-md bg-surface-container-lowest focus:border-primary">
                <option>Avanço Regular Diário</option>
                <option>Conclusão de Etapa Parcial</option>
                <option>Revisão de Medição</option>
                <option>Outros</option>
              </select>
            </div>
            <div>
              <label className="block text-label-sm text-on-surface mb-xs">Observações</label>
              <textarea rows={3} placeholder="Descreva os principais trabalhos realizados neste período..."
                className="w-full px-sm py-sm border border-outline-variant rounded text-on-surface text-body-md bg-surface-container-lowest placeholder:text-secondary" />
            </div>
            <hr className="border-outline-variant" />
            <div className="bg-surface-container rounded-lg p-md border border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-md">
              <div className="flex items-start gap-sm">
                <span className="material-symbols-outlined text-primary mt-1">location_on</span>
                <div>
                  <p className="text-label-md text-on-surface">Validação de Localização</p>
                  <p className="text-body-sm text-secondary font-mono">Coordenadas: -23.5505, -46.6333</p>
                </div>
              </div>
              <div className="px-sm py-xs bg-primary-fixed text-primary text-label-sm rounded-full inline-flex items-center gap-xs whitespace-nowrap border border-primary-fixed-dim">
                <span className="material-symbols-outlined text-[14px]">check_circle</span>Dentro do limite da obra
              </div>
            </div>
            <div>
              <label className="block text-label-sm text-on-surface mb-xs flex items-center justify-between">
                <span>Evidências Fotográficas <span className="text-error">*</span></span>
                <span className="text-body-sm text-secondary">Mínimo 1 foto</span>
              </label>
              <div className="border-2 border-dashed border-outline-variant rounded-lg p-lg text-center bg-surface hover:bg-surface-container transition-colors cursor-pointer mb-md">
                <span className="material-symbols-outlined text-primary text-3xl mb-xs">cloud_upload</span>
                <p className="text-label-md text-on-surface">Arraste e solte arquivos aqui</p>
                <p className="text-body-sm text-secondary mt-xs">ou clique para procurar (JPG, PNG, máx 5MB)</p>
              </div>
              <div className="flex gap-md overflow-x-auto pb-sm" id="fotos-container" />
              <p className="text-body-sm text-on-surface-variant">Nenhuma foto anexada ainda</p>
            </div>
          </div>
          <div className="px-lg py-md border-t border-outline-variant bg-surface flex justify-end gap-md">
            <button type="button" className="px-md py-sm rounded border border-outline text-on-surface-variant text-label-md hover:bg-surface-container-high transition-colors">Cancelar</button>
            <button type="button" className="px-md py-sm rounded bg-primary-container text-on-primary-container text-label-md hover:opacity-90 shadow-sm flex items-center gap-xs">
              <span className="material-symbols-outlined text-[18px]">save</span>Salvar Registro
            </button>
          </div>
        </div>
      </div>

      {/* Coluna direita — impacto + histórico */}
      <div className="lg:col-span-5 flex flex-col gap-gutter">
        {!faseAtual ? (
          <div className="bg-surface-container-lowest rounded-lg border border-outline-variant p-md shadow-sm text-center text-on-surface-variant">
            Selecione uma fase para visualizar análise
          </div>
        ) : (faseAtual.pct || 0) < 50 ? (
          <div className="bg-error-container text-on-error-container rounded-lg border border-[#ffb4ab] p-md shadow-sm flex items-start gap-md">
            <span className="material-symbols-outlined text-error text-2xl mt-1">warning</span>
            <div>
              <h4 className="text-headline-sm mb-xs">Atenção ao Cronograma</h4>
              <p className="text-body-md opacity-90">A fase está <strong>{50 - (faseAtual.pct || 0)}% abaixo do esperado</strong>. Recomenda-se revisão urgente de recursos.</p>
            </div>
          </div>
        ) : (faseAtual.pct || 0) < 80 ? (
          <div className="bg-[#FEF3C7] text-[#92400E] rounded-lg border border-[#FCD34D] p-md shadow-sm flex items-start gap-md">
            <span className="material-symbols-outlined text-[#F59E0B] text-2xl mt-1">info</span>
            <div>
              <h4 className="text-headline-sm mb-xs">Fase em Risco</h4>
              <p className="text-body-md opacity-90">A fase está com progresso de <strong>{faseAtual.pct}%</strong>. Acompanhamento continuo é recomendado.</p>
            </div>
          </div>
        ) : (
          <div className="bg-[#DCFCE7] text-[#166534] rounded-lg border border-[#86EFAC] p-md shadow-sm flex items-start gap-md">
            <span className="material-symbols-outlined text-[#16A34A] text-2xl mt-1">check_circle</span>
            <div>
              <h4 className="text-headline-sm mb-xs">No Prazo</h4>
              <p className="text-body-md opacity-90">A fase está <strong>no prazo</strong> com {faseAtual.pct}% de progresso. Excelente desempenho!</p>
            </div>
          </div>
        )}
        <div className="bg-surface-container-lowest rounded-lg border border-outline-variant shadow-sm p-lg">
          <h3 className="text-headline-sm text-on-surface mb-md flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary">event_available</span>Status da Fase
          </h3>
          {!faseAtual ? (
            <p className="text-body-sm text-on-surface-variant text-center py-4">Selecione uma fase para visualizar detalhes</p>
          ) : (
            <div className="grid grid-cols-2 gap-md text-center">
              <div className="p-md rounded-lg bg-surface-container border border-outline-variant">
                <p className="text-label-sm text-secondary mb-xs">Progresso Atual</p>
                <p className="text-headline-md text-on-surface">{faseAtual.pct || 0}%</p>
                <p className="text-body-sm text-secondary mt-1">{faseAtual.nome}</p>
              </div>
              <div className={`p-md rounded-lg ${(faseAtual.pct || 0) >= 80 ? 'bg-[#16A34A]/10 border border-[#16A34A]' : (faseAtual.pct || 0) >= 50 ? 'bg-[#F59E0B]/10 border border-[#F59E0B]' : 'bg-error/10 border border-error'}`}>
                <p className="text-label-sm text-secondary mb-xs">Status</p>
                <p className={`text-headline-md font-bold ${(faseAtual.pct || 0) >= 80 ? 'text-[#16A34A]' : (faseAtual.pct || 0) >= 50 ? 'text-[#F59E0B]' : 'text-error'}`}>
                  {(faseAtual.pct || 0) >= 80 ? 'No Prazo' : (faseAtual.pct || 0) >= 50 ? 'Em Risco' : 'Com Atraso'}
                </p>
                <p className="text-body-sm text-secondary mt-1">da fase</p>
              </div>
            </div>
          )}
        </div>
        <div className="bg-surface-container-lowest rounded-lg border border-outline-variant shadow-sm p-lg flex-1">
          <h3 className="text-headline-sm text-on-surface mb-md flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary">history</span>Histórico desta Fase
          </h3>
          <div className="relative border-l-2 border-surface-container-highest ml-sm mt-md">
            {historico.length === 0 ? (
              <p className="text-body-sm text-on-surface-variant">Selecione uma fase para ver o histórico</p>
            ) : (
              historico.map((h, i) => (
                <div key={h.meta} className={`pl-lg relative ${i < historico.length - 1 ? 'mb-lg' : ''}`}>
                  <div className={`absolute w-4 h-4 rounded-full -left-[9px] top-1 border-2 border-surface-container-lowest ${h.dot}`} />
                  <p className="text-label-sm text-secondary mb-xs">{h.meta}</p>
                  <p className="text-body-md text-on-surface font-medium">{h.titulo}</p>
                  <p className="text-body-sm text-on-surface-variant mt-xs">{h.desc}</p>
                </div>
              ))
            )}
          </div>
          <button className="w-full mt-lg py-sm text-label-md text-primary hover:bg-surface-container rounded transition-colors">Ver histórico completo</button>
        </div>
      </div>
    </div>
  );
}

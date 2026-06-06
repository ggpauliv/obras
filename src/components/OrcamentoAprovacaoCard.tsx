import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';

interface Props {
  orcamento: any;
  tiposDisp: string[];
  onAprovado: (orcamentoId: string, tipoOrcamento: string) => void;
}

const fmt = (v: any) =>
  Number(v)?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? '—';

export function OrcamentoAprovacaoCard({ orcamento, tiposDisp, onAprovado }: Props) {
  const [expandido, setExpandido] = useState(false);
  const [linhas, setLinhas] = useState<any[]>([]);
  const [carregandoLinhas, setCarregandoLinhas] = useState(false);
  const [tipoSelecionado, setTipoSelecionado] = useState(orcamento.tipo_orcamento || '');
  const [aprovando, setAprovando] = useState(false);

  const carregarLinhas = async () => {
    if (linhas.length > 0) return;
    setCarregandoLinhas(true);
    try {
      const dados = await apiClient.obterOrcamento(orcamento.id);
      setLinhas(dados.linhas || []);
    } catch (err) {
      console.error('Erro ao carregar linhas:', err);
    }
    setCarregandoLinhas(false);
  };

  const handleExpand = () => {
    if (!expandido && linhas.length === 0) {
      carregarLinhas();
    }
    setExpandido(!expandido);
  };

  const handleAprovar = async () => {
    if (!tipoSelecionado.trim()) {
      alert('Selecione um tipo de orçamento');
      return;
    }
    setAprovando(true);
    try {
      await onAprovado(orcamento.id, tipoSelecionado);
    } finally {
      setAprovando(false);
    }
  };

  const categorias = Array.from(new Set(linhas.map((l: any) => l.categoria || 'Outros'))).sort();
  const totalLinhas = linhas.length;

  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Header do card */}
      <div className="p-lg border-b border-outline-variant/50">
        <div className="flex items-start justify-between gap-md">
          <div className="flex-1">
            <h3 className="text-label-lg font-semibold text-on-surface truncate">
              {orcamento.nome || 'Orçamento sem nome'}
            </h3>
            {orcamento.fornecedor_nome && (
              <p className="text-body-sm text-on-surface-variant mt-xs">
                Fornecedor: <span className="font-medium">{orcamento.fornecedor_nome}</span>
              </p>
            )}
          </div>
          <span className="px-xs py-0.5 bg-amber-100 text-amber-700 rounded-full text-label-sm border border-amber-200 shrink-0">
            Pendente
          </span>
        </div>

        {/* Valor e prazo */}
        <div className="flex items-center gap-lg mt-md flex-wrap">
          <div>
            <p className="text-body-sm text-on-surface-variant">Valor Total</p>
            <p className="text-headline-sm font-bold text-on-surface">{fmt(orcamento.valor_total)}</p>
          </div>
          {orcamento.prazo_dias && (
            <div>
              <p className="text-body-sm text-on-surface-variant">Prazo</p>
              <p className="text-headline-sm font-bold text-on-surface">{orcamento.prazo_dias} dias</p>
            </div>
          )}
          {totalLinhas > 0 && (
            <div>
              <p className="text-body-sm text-on-surface-variant">Itens</p>
              <p className="text-headline-sm font-bold text-on-surface">{totalLinhas}</p>
            </div>
          )}
        </div>
      </div>

      {/* Seletor de tipo */}
      <div className="px-lg py-md border-b border-outline-variant/50 bg-surface">
        <label className="block text-label-sm text-on-surface-variant mb-xs">
          Tipo de Orçamento <span className="text-error">*</span>
        </label>
        <select
          value={tipoSelecionado}
          onChange={e => setTipoSelecionado(e.target.value)}
          className="w-full rounded-lg border border-outline-variant text-body-sm text-on-surface focus:border-primary py-2 px-3 bg-surface-container-lowest"
        >
          <option value="">Selecione o tipo…</option>
          {tiposDisp.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Botão expandir */}
      <button
        onClick={handleExpand}
        className="w-full px-lg py-md text-left flex items-center justify-between hover:bg-surface-container-low transition-colors border-b border-outline-variant/50"
      >
        <span className="text-label-md text-on-surface font-medium">
          Categorias ({categorias.length > 0 ? categorias.length : '?'})
        </span>
        <span
          className="material-symbols-outlined text-outline transition-transform"
          style={{ transform: expandido ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          expand_more
        </span>
      </button>

      {/* Detalhes expandidos */}
      {expandido && (
        <div className="p-lg bg-surface border-b border-outline-variant/50">
          {carregandoLinhas ? (
            <div className="flex items-center gap-sm text-on-surface-variant">
              <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
              Carregando itens…
            </div>
          ) : linhas.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant">Nenhum item neste orçamento</p>
          ) : (
            <div className="space-y-md">
              {/* Resumo por categoria */}
              {categorias.map(cat => {
                const itemsCat = linhas.filter((l: any) => (l.categoria || 'Outros') === cat);
                const totalCat = itemsCat.reduce((s: number, l: any) => s + (Number(l.valor_total) || 0), 0);
                return (
                  <div key={cat} className="bg-surface-container-lowest rounded-lg p-md border border-outline-variant/30">
                    <div className="flex items-center justify-between mb-sm">
                      <p className="text-label-sm font-semibold text-on-surface">{cat}</p>
                      <span className="text-label-sm text-on-surface-variant">
                        {itemsCat.length} {itemsCat.length === 1 ? 'item' : 'itens'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-xs text-body-sm text-on-surface-variant">
                      {itemsCat.map((l: any, i: number) => (
                        <div key={i} className="flex items-center justify-between px-sm py-xs bg-surface rounded">
                          <span className="truncate text-xs">{l.descricao}</span>
                          <span className="font-medium text-on-surface ml-sm shrink-0">{fmt(l.valor_total)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-sm pt-sm border-t border-outline-variant/30 flex items-center justify-between">
                      <span className="text-label-sm text-on-surface-variant">Subtotal</span>
                      <span className="text-label-md font-bold text-on-surface">{fmt(totalCat)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Botões de ação */}
      <div className="p-lg bg-surface-container-low flex items-center gap-sm">
        <button
          onClick={handleAprovar}
          disabled={!tipoSelecionado || aprovando}
          className="flex-1 px-lg py-2 bg-primary text-on-primary rounded-lg hover:bg-primary/90 text-label-md font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-sm"
        >
          {aprovando ? (
            <>
              <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
              Aprovando…
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              Aprovar
            </>
          )}
        </button>
      </div>
    </div>
  );
}

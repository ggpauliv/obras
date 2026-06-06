import React, { useEffect, useState, useMemo } from 'react';
import { listarObras } from '../store';
import type { Obra } from '../store';
import { apiClient } from '../api/client';

const TIPOS_ORCAMENTO = [
  'Obra Geral',
  'Terraplanagem',
  'Fundações',
  'Estrutura',
  'Cobertura',
  'Alvenaria',
  'Instalações Elétricas',
  'Instalações Hidráulicas',
  'Acabamento',
  'Pintura',
  'Serviços Gerais',
];

const fmt = (v: any) =>
  Number(v)?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? '—';

export function OrcamentosAprovacaoPage() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraId, setObraId] = useState('');
  const [orcamentos, setOrcamentos] = useState<any[]>([]);
  const [linhasPorOrc, setLinhasPorOrc] = useState<Record<string, any[]>>({});
  const [carregando, setCarregando] = useState(false);
  const [carregandoLinhas, setCarregandoLinhas] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [abaAtiva, setAbaAtiva] = useState<string>('');
  const [removendo, setRemovendo] = useState(false);
  const [tipoSelecionado, setTipoSelecionado] = useState<Record<string, string>>({});
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('');

  useEffect(() => {
    listarObras().then(setObras);
  }, []);

  useEffect(() => {
    if (!obraId) {
      setOrcamentos([]);
      setAbaAtiva('');
      setLinhasPorOrc({});
      return;
    }
    setCarregando(true);
    apiClient.listarOrcamentos(obraId)
      .then(data => {
        // Mostra todos os orçamentos (não filtra por status)
        // Usuário pode ver aprovados anteriormente também
        setOrcamentos(data || []);
        if (data && data.length > 0) {
          setAbaAtiva(data[0].id);
        }
      })
      .catch(() => setOrcamentos([]))
      .finally(() => setCarregando(false));
  }, [obraId]);

  // Carrega linhas quando muda de aba
  useEffect(() => {
    if (!abaAtiva || linhasPorOrc[abaAtiva]) return;
    setCategoriaFiltro(''); // Reset filter when changing tab
    setCarregandoLinhas(true);
    apiClient.obterOrcamento(abaAtiva)
      .then(d => {
        console.log('Orçamento carregado:', d);
        const linhas = d.linhas || [];
        console.log('Linhas:', linhas);
        setLinhasPorOrc(prev => ({ ...prev, [abaAtiva]: linhas }));
      })
      .catch(err => {
        console.error('Erro ao carregar orçamento:', err);
        setLinhasPorOrc(prev => ({ ...prev, [abaAtiva]: [] }));
      })
      .finally(() => setCarregandoLinhas(false));
  }, [abaAtiva]);

  const handleAprovar = async (orcamentoId: string) => {
    const tipo = tipoSelecionado[orcamentoId];
    if (!tipo?.trim()) {
      setToastMsg('Selecione um tipo de orçamento');
      setTimeout(() => setToastMsg(''), 4000);
      return;
    }

    // Itens a aprovar: apenas os filtrados por categoria (se houver filtro) e com preço
    let linhasAprovar = linhasPorOrc[orcamentoId] || [];
    linhasAprovar = linhasAprovar.filter(l => {
      // Filtrar por categoria se selecionada
      if (categoriaFiltro && l.categoria !== categoriaFiltro) return false;
      // Filtrar itens sem preço
      return parseFloat(String(l.valorTotal || '0')) || 0 > 0;
    });
    if (linhasAprovar.length === 0) {
      setToastMsg('Nenhum item para aprovar');
      setTimeout(() => setToastMsg(''), 4000);
      return;
    }

    try {
      const res = await apiClient.aprovarOrcamento(orcamentoId, tipo, linhasAprovar);
      setToastMsg(`✅ ${linhasAprovar.length} item(ns) de ${tipo} aprovado(s)!`);
      // Manter toast visível por mais tempo
      const timeout = setTimeout(() => setToastMsg(''), 6000);
      return () => clearTimeout(timeout);

      // Remove linhas aprovadas do estado
      setLinhasPorOrc(prev => {
        const nova = { ...prev };
        if (nova[orcamentoId]) {
          nova[orcamentoId] = nova[orcamentoId].filter(
            linha => !linhasAprovar.find(l => l.id === linha.id)
          );
        }
        return nova;
      });

      // Se não há mais linhas, remove o orçamento
      if (linhasPorOrc[orcamentoId]?.length === linhasAprovar.length) {
        setOrcamentos(prev => prev.filter(o => o.id !== orcamentoId));
        if (orcamentos.length > 1) {
          setAbaAtiva(orcamentos.find(o => o.id !== orcamentoId)?.id || '');
        } else {
          setAbaAtiva('');
        }
      } else {
        // Limpa filtro para ver itens restantes
        setTipoSelecionado(prev => {
          const novo = { ...prev };
          delete novo[orcamentoId];
          return novo;
        });
      }
    } catch (err: any) {
      setToastMsg(`Erro: ${err.message}`);
      setTimeout(() => setToastMsg(''), 4000);
    }
  };

  const handleRemover = async (orcamentoId: string) => {
    const orc = orcamentos.find(o => o.id === orcamentoId);
    if (!window.confirm(`Remover orçamento "${orc?.nome || 'Sem nome'}"?\n\nEsta ação não pode ser desfeita.`)) {
      return;
    }

    setRemovendo(true);
    try {
      await apiClient.deletarOrcamento(orcamentoId);
      setOrcamentos(prev => prev.filter(o => o.id !== orcamentoId));
      setLinhasPorOrc(prev => { const n = { ...prev }; delete n[orcamentoId]; return n; });

      if (orcamentos.length > 1) {
        setAbaAtiva(orcamentos.find(o => o.id !== orcamentoId)?.id || '');
      } else {
        setAbaAtiva('');
      }

      setToastMsg('Orçamento removido com sucesso');
      setTimeout(() => setToastMsg(''), 4000);
    } catch (err: any) {
      setToastMsg(`Erro: ${err.message}`);
      setTimeout(() => setToastMsg(''), 4000);
    } finally {
      setRemovendo(false);
    }
  };

  const FIELD = 'w-full rounded-lg border border-outline-variant text-body-sm text-on-surface focus:border-primary py-2 px-3 bg-surface-container-lowest';
  const orcAtivo = orcamentos.find(o => o.id === abaAtiva);
  const linhasAtivas = linhasPorOrc[abaAtiva] || [];

  // Encontra o menor valor entre todos os orçamentos
  const menorValor = useMemo(() => {
    if (orcamentos.length === 0) return 0;
    return Math.min(...orcamentos.map(o => parseFloat(String(o.valorTotal || '0')) || 0));
  }, [orcamentos]);

  const ehMelhorPreco = orcAtivo && parseFloat(String(orcAtivo.valorTotal || '0')) === menorValor && menorValor > 0;

  return (
    <div className="flex flex-col gap-lg">
      {/* Header */}
      <div>
        <h2 className="text-headline-md font-bold text-on-surface">Aprovação de Orçamentos</h2>
        <p className="text-body-sm text-on-surface-variant mt-1">Analise e aprove orçamentos individuais para gerar despesas e fases automaticamente</p>
      </div>

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-lg right-lg z-50 px-lg py-sm bg-primary text-on-primary rounded-lg shadow-lg text-label-md animate-pulse">
          {toastMsg}
        </div>
      )}

      {/* Seletor de obra */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg">
        <label className="block text-label-sm text-on-surface mb-1">Obra</label>
        <select className={FIELD} value={obraId} onChange={e => setObraId(e.target.value)}>
          <option value="">Selecione a obra…</option>
          {obras.map(o => <option key={o.id} value={o.id}>{o.nome} — {o.cliente}</option>)}
        </select>
      </div>

      {/* Estado vazio */}
      {!obraId && (
        <div className="flex flex-col items-center gap-md py-2xl text-center bg-surface-container-lowest border border-outline-variant rounded-xl">
          <span className="material-symbols-outlined text-[56px] text-outline">approval</span>
          <p className="text-headline-sm text-on-surface">Selecione uma obra para começar</p>
        </div>
      )}

      {obraId && carregando && (
        <div className="flex items-center gap-sm p-xl text-on-surface-variant">
          <span className="material-symbols-outlined animate-spin text-[22px]">progress_activity</span> Carregando…
        </div>
      )}

      {obraId && !carregando && orcamentos.length === 0 && (
        <div className="flex flex-col items-center gap-md py-2xl text-center bg-surface-container-lowest border border-outline-variant rounded-xl">
          <span className="material-symbols-outlined text-[56px] text-outline">check_circle</span>
          <p className="text-headline-sm text-on-surface">Nenhum orçamento pendente</p>
          <p className="text-body-sm text-on-surface-variant">Todos os orçamentos desta obra já foram processados</p>
        </div>
      )}

      {/* Abas de orçamentos */}
      {orcamentos.length > 0 && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
          {/* Headers das abas */}
          <div className="flex gap-0 border-b border-outline-variant overflow-x-auto">
            {orcamentos.map(orc => {
              const ehMelhor = parseFloat(String(orc.valorTotal || '0')) === menorValor && menorValor > 0;
              return (
                <button
                  key={orc.id}
                  onClick={() => setAbaAtiva(orc.id)}
                  className={`px-lg py-sm text-label-sm whitespace-nowrap transition-colors border-b-2 -mb-px flex items-center gap-xs ${
                    abaAtiva === orc.id
                      ? ehMelhor
                        ? 'border-emerald-500 text-emerald-600 font-semibold'
                        : 'border-primary text-primary font-semibold'
                      : ehMelhor
                        ? 'border-transparent text-emerald-600/70 hover:text-emerald-600'
                        : 'border-transparent text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {orc.fornecedor_nome || orc.nome}
                  {ehMelhor && <span className="material-symbols-outlined text-[16px]">emoji_events</span>}
                </button>
              );
            })}
          </div>

          {/* Conteúdo da aba ativa */}
          {orcAtivo && (
            <div className="p-lg space-y-lg">
              {/* Resumo */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
                <div className="bg-surface border border-outline-variant rounded-lg p-md">
                  <p className="text-label-sm text-on-surface-variant">Fornecedor</p>
                  <p className="text-label-md font-semibold text-on-surface mt-xs">{orcAtivo.fornecedor_nome || orcAtivo.nome}</p>
                </div>
                <div className={`rounded-lg p-md ${
                  ehMelhorPreco
                    ? 'bg-emerald-50 border-2 border-emerald-400'
                    : 'bg-surface border border-outline-variant'
                }`}>
                  <div className="flex items-center justify-between">
                    <p className={`text-label-sm ${ehMelhorPreco ? 'text-emerald-700 font-semibold' : 'text-on-surface-variant'}`}>
                      Valor Total
                    </p>
                    {ehMelhorPreco && <span className="material-symbols-outlined text-emerald-600">emoji_events</span>}
                  </div>
                  <p className={`text-label-md font-semibold mt-xs ${ehMelhorPreco ? 'text-emerald-700' : 'text-on-surface'}`}>
                    {fmt(orcAtivo.valorTotal)}
                  </p>
                </div>
                <div className="bg-surface border border-outline-variant rounded-lg p-md">
                  <p className="text-label-sm text-on-surface-variant">Prazo</p>
                  <p className="text-label-md font-semibold text-on-surface mt-xs">{orcAtivo.prazo_dias || '—'} dias</p>
                </div>
                <div className="bg-surface border border-outline-variant rounded-lg p-md">
                  <p className="text-label-sm text-on-surface-variant">Itens</p>
                  <p className="text-label-md font-semibold text-on-surface mt-xs">{linhasAtivas.length}</p>
                </div>
              </div>

              {/* Seletor de categoria (filtro) - OPCIONAL */}
              <div className="p-md bg-surface-container-lowest rounded-lg border border-outline-variant/50">
                <label className="block text-label-sm text-on-surface-variant mb-2">
                  Filtrar por Categoria <span className="text-outline text-xs">(opcional — deixe em branco para aprovar tudo)</span>
                </label>
                <select
                  value={categoriaFiltro}
                  onChange={e => setCategoriaFiltro(e.target.value)}
                  className={FIELD}
                >
                  <option value="">✓ Aprovar TODOS os {linhasAtivas.filter(l => parseFloat(String(l.valorTotal || '0')) || 0 > 0).length} itens</option>
                  {Array.from(new Set(linhasAtivas.map(l => l.categoria).filter(Boolean)))
                    .sort()
                    .map(cat => {
                      const qtd = linhasAtivas.filter(l => l.categoria === cat && (parseFloat(String(l.valorTotal || '0')) || 0 > 0)).length;
                      return <option key={cat} value={cat}>Apenas {cat} ({qtd} itens)</option>;
                    })}
                </select>
              </div>

              {/* Itens do orçamento */}
              {carregandoLinhas ? (
                <div className="flex items-center gap-sm p-lg text-on-surface-variant">
                  <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  Carregando itens…
                </div>
              ) : linhasAtivas.length > 0 ? (
                <div className="border border-outline-variant rounded-lg overflow-hidden">
                  <table className="w-full text-body-sm">
                    <thead className="bg-surface-container-low border-b border-outline-variant">
                      <tr>
                        <th className="py-xs px-md text-label-sm text-on-surface-variant font-semibold text-left">Descrição</th>
                        <th className="py-xs px-md text-label-sm text-on-surface-variant font-semibold text-left">Categoria</th>
                        <th className="py-xs px-md text-label-sm text-on-surface-variant font-semibold text-center">Qtd</th>
                        <th className="py-xs px-md text-label-sm text-on-surface-variant font-semibold text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/30">
                      {linhasAtivas
                        .filter(linha => {
                          // Filtrar por categoria se selecionada
                          if (categoriaFiltro && linha.categoria !== categoriaFiltro) return false;
                          // Filtrar itens sem preço
                          const valorTotal = parseFloat(String(linha.valorTotal || '0')) || 0;
                          return valorTotal > 0;
                        })
                        .map((linha, idx) => {
                          const valorTotal = parseFloat(String(linha.valorTotal || '0')) || 0;
                          return (
                            <tr key={idx} className="hover:bg-surface-container-low/50">
                              <td className="py-xs px-md text-on-surface">{linha.descricao}</td>
                              <td className="py-xs px-md text-on-surface-variant">{linha.categoria || '—'}</td>
                              <td className="py-xs px-md text-on-surface-variant text-center">{Number(linha.quantidade) || 0}</td>
                              <td className="py-xs px-md text-on-surface font-medium text-right">
                                {fmt(valorTotal)}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                    <tfoot className="bg-surface-container-low border-t border-outline-variant">
                      <tr>
                        <td colSpan={3} className="py-sm px-md text-label-sm font-semibold text-on-surface">
                          Total ({linhasAtivas
                            .filter(l => {
                              if (categoriaFiltro && l.categoria !== categoriaFiltro) return false;
                              return parseFloat(String(l.valorTotal || '0')) || 0 > 0;
                            })
                            .length} itens {categoriaFiltro && `de ${categoriaFiltro}`})
                        </td>
                        <td className="py-sm px-md text-right text-label-md font-bold text-on-surface">
                          {fmt(linhasAtivas
                            .filter(l => {
                              if (categoriaFiltro && l.categoria !== categoriaFiltro) return false;
                              return parseFloat(String(l.valorTotal || '0')) || 0 > 0;
                            })
                            .reduce((sum, l) => sum + (parseFloat(String(l.valorTotal || '0')) || 0), 0))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <p className="text-body-sm text-on-surface-variant text-center py-lg">Nenhum item neste orçamento</p>
              )}

              {/* Tipo de Orçamento + Botões de ação */}
              <div className="space-y-md">
                <div>
                  <label className="block text-label-sm text-on-surface-variant mb-2">
                    Tipo de Orçamento <span className="text-error">*</span>
                  </label>
                  <select
                    value={tipoSelecionado[orcAtivo.id] || ''}
                    onChange={e => setTipoSelecionado(prev => ({ ...prev, [orcAtivo.id]: e.target.value }))}
                    className={FIELD}
                  >
                    <option value="">Selecione o tipo…</option>
                    {TIPOS_ORCAMENTO.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-md pt-lg border-t border-outline-variant">
                  <button
                    onClick={() => handleAprovar(orcAtivo.id)}
                    disabled={!tipoSelecionado[orcAtivo.id]}
                    className="flex-1 px-lg py-2 bg-primary text-on-primary rounded-lg hover:bg-primary/90 text-label-md font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">check_circle</span>
                    Aprovar
                  </button>
                  <button
                    onClick={() => handleRemover(orcAtivo.id)}
                    disabled={removendo}
                    className="px-lg py-2 bg-error/10 text-error rounded-lg hover:bg-error/20 text-label-md font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">{removendo ? 'progress_activity' : 'delete'}</span>
                    {removendo ? 'Removendo…' : 'Remover'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

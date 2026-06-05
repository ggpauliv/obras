import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { listarObras } from '../store';
import type { Obra } from '../store';
import { apiClient } from '../api/client';
import { exportarComparativoPDF } from '../utils/exportar';

// ────────────────────────────────────────────────────────────────────────────
// Constantes
// ────────────────────────────────────────────────────────────────────────────
const CORES = [
  '#2563EB', '#DC2626', '#16A34A', '#EA580C', '#7C3AED', '#0891B2',
  '#CA8A04', '#DB2777', '#4F46E5', '#65A30D', '#0D9488', '#9333EA',
];
const ABAS = ['Visão Geral', 'Por Categorias', 'Itens Detalhados'] as const;
type Aba = typeof ABAS[number];

const CATEGORIAS = [
  'Estrutura', 'Alvenaria', 'Cobertura', 'Instalações Elétricas', 'Instalações Hidráulicas',
  'Acabamento', 'Pintura', 'Fundações', 'Terraplanagem', 'Serviços Gerais', 'Materiais', 'Mão de Obra',
];

// Nome exibido do orçamento (prefere o nome editável do próprio orçamento).
const nomeDe = (o: any) => (o?.nome && String(o.nome).trim()) || o?.fornecedorNome || 'Fornecedor';

const fmt = (v: any) =>
  Number(v)?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? '—';
const fmtK = (v: number) =>
  v >= 1_000_000 ? `R$${(v / 1_000_000).toFixed(1)}M` : v >= 1_000 ? `R$${(v / 1_000).toFixed(0)}K` : fmt(v);

// ────────────────────────────────────────────────────────────────────────────
// Componente principal
// ────────────────────────────────────────────────────────────────────────────
export function OrcamentosComparativaPage() {
  const navigate = useNavigate();
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraId, setObraId] = useState('');
  const [todos, setTodos] = useState<any[]>([]);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [linhasPorOrc, setLinhasPorOrc] = useState<Record<string, any[]>>({});
  const [carregandoLinhas, setCarregandoLinhas] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [aba, setAba] = useState<Aba>('Visão Geral');
  const [expandidoTabela, setExpandidoTabela] = useState<string | null>(null);
  const [removendo, setRemovendo] = useState<string | null>(null);

  useEffect(() => { listarObras().then(setObras); }, []);

  useEffect(() => {
    if (!obraId) { setTodos([]); setSelecionados(new Set()); setLinhasPorOrc({}); return; }
    setCarregando(true);
    apiClient.listarOrcamentos(obraId)
      .then(data => { setTodos(data); setSelecionados(new Set(data.map((o: any) => o.id))); })
      .catch(() => setTodos([]))
      .finally(() => setCarregando(false));
  }, [obraId]);

  // Carrega linhas de todos os orçamentos selecionados quando muda de aba
  useEffect(() => {
    if (aba === 'Visão Geral') return;
    const faltando = Array.from(selecionados).filter(id => !linhasPorOrc[id]);
    if (faltando.length === 0) return;
    setCarregandoLinhas(true);
    Promise.all(faltando.map(id =>
      apiClient.obterOrcamento(id).then(d => ({ id, linhas: d.linhas || [] })).catch(() => ({ id, linhas: [] }))
    )).then(results => {
      const novo: Record<string, any[]> = {};
      results.forEach(r => { novo[r.id] = r.linhas; });
      setLinhasPorOrc(prev => ({ ...prev, ...novo }));
    }).finally(() => setCarregandoLinhas(false));
  }, [aba, selecionados]);

  const remover = async (id: string, nome: string) => {
    if (!window.confirm(`Remover orçamento de "${nome}"? Esta ação não pode ser desfeita.`)) return;
    setRemovendo(id);
    try {
      await apiClient.deletarOrcamento(id);
      setTodos(prev => prev.filter(o => o.id !== id));
      setSelecionados(prev => { const s = new Set(prev); s.delete(id); return s; });
      setLinhasPorOrc(prev => { const n = { ...prev }; delete n[id]; return n; });
    } catch (err: any) {
      alert('Erro ao remover: ' + err.message);
    }
    setRemovendo(null);
  };

  const lista = useMemo(() =>
    todos.filter(o => selecionados.has(o.id)).sort((a, b) => Number(a.valorTotal) - Number(b.valorTotal)),
    [todos, selecionados]
  );

  const coresPorId = useMemo(() => {
    const m: Record<string, string> = {};
    todos.forEach((o, i) => { m[o.id] = CORES[i % CORES.length]; });
    return m;
  }, [todos]);

  const melhor = Number(lista[0]?.valorTotal) || 0;
  const maior = Number(lista[lista.length - 1]?.valorTotal) || 0;
  const economia = maior > 0 ? ((maior - melhor) / maior * 100).toFixed(1) : '0';

  // ── Exportação ──
  const exportRef = useRef<HTMLDivElement>(null);
  const [menuExport, setMenuExport] = useState(false);
  const [exportando, setExportando] = useState(false);
  const nomeObra = obras.find(o => o.id === obraId)?.nome || 'orcamentos';
  const slug = nomeObra.normalize('NFD').replace(/[^\w]+/g, '_').replace(/_+/g, '_').toLowerCase();

  const exportarPDF = async () => {
    setMenuExport(false);
    setExportando(true);
    try {
      // Garante que as linhas (itens) estejam carregadas
      const faltando = lista.filter(o => !linhasPorOrc[o.id]);
      const carregadas: Record<string, any[]> = { ...linhasPorOrc };
      if (faltando.length) {
        const res = await Promise.all(faltando.map(o =>
          apiClient.obterOrcamento(o.id).then(dd => ({ id: o.id, linhas: dd.linhas || [] })).catch(() => ({ id: o.id, linhas: [] }))
        ));
        res.forEach(r => { carregadas[r.id] = r.linhas; });
        setLinhasPorOrc(carregadas);
      }
      const fornecedores = lista.map(o => ({
        nome: nomeDe(o), valorTotal: Number(o.valorTotal) || 0, prazoDias: o.prazoDias || null, cor: coresPorId[o.id],
      }));
      const categorias = matrizCategorias.map(row => ({
        categoria: row.categoria,
        valores: lista.map(o => (row[o.id]?.presente ? (row[o.id].total || 0) : null)),
      }));
      const itens: (string | number)[][] = [];
      lista.forEach(o => (carregadas[o.id] || []).forEach((l: any) =>
        itens.push([nomeDe(o), l.itemNumero || '', l.descricao || '', l.categoria || '', Number(l.quantidade) || 0, Number(l.valorUnitario) || 0, Number(l.valorTotal) || 0])
      ));
      exportarComparativoPDF({ arquivo: `comparativo_${slug}`, obra: nomeObra, economia, fornecedores, categorias, itens });
    } catch (e: any) {
      alert('Erro ao gerar PDF: ' + e.message);
    }
    setExportando(false);
  };

  const exportarXLSX = async () => {
    setMenuExport(false);
    setExportando(true);
    try {
      // Garante que as linhas de todos os selecionados estejam carregadas
      const faltando = lista.filter(o => !linhasPorOrc[o.id]);
      const carregadas: Record<string, any[]> = { ...linhasPorOrc };
      if (faltando.length) {
        const res = await Promise.all(faltando.map(o =>
          apiClient.obterOrcamento(o.id).then(d => ({ id: o.id, linhas: d.linhas || [] })).catch(() => ({ id: o.id, linhas: [] }))
        ));
        res.forEach(r => { carregadas[r.id] = r.linhas; });
        setLinhasPorOrc(carregadas);
      }

      // Monta o payload para o gerador Python (gráficos nativos no Excel)
      const fornecedores = lista.map(o => ({
        nome: nomeDe(o),
        valorTotal: Number(o.valorTotal) || 0,
        prazoDias: o.prazoDias || null,
      }));
      const categorias = matrizCategorias.map(row => ({
        categoria: row.categoria,
        valores: lista.map(o => (row[o.id]?.presente ? (row[o.id].total || 0) : null)),
      }));
      const itens: any[][] = [];
      lista.forEach(o => {
        (carregadas[o.id] || []).forEach((l: any) => {
          itens.push([nomeDe(o), l.itemNumero || '', l.descricao || '', l.categoria || '', Number(l.quantidade) || 0, Number(l.valorUnitario) || 0, Number(l.valorTotal) || 0]);
        });
      });

      const blob = await apiClient.exportarOrcamentosExcel({
        nomeArquivo: `comparativo_${slug}`,
        fornecedores, categorias, itens,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `comparativo_${slug}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert('Erro ao gerar Excel: ' + e.message);
    }
    setExportando(false);
  };

  // Renomeia um orçamento já salvo.
  const renomear = async (o: any) => {
    const atual = nomeDe(o);
    const novo = window.prompt('Novo nome do orçamento:', atual);
    if (novo == null || !novo.trim() || novo.trim() === atual) return;
    try {
      await apiClient.renomearOrcamento(o.id, novo.trim());
      setTodos(prev => prev.map(x => x.id === o.id ? { ...x, nome: novo.trim() } : x));
    } catch (err: any) {
      alert('Erro ao renomear: ' + err.message);
    }
  };

  // Altera a categoria de um item em TODOS os orçamentos (itens compartilhados).
  const mudarCategoriaItem = async (itemNumero: string, categoria: string) => {
    try {
      await apiClient.atualizarCategoriaItem(obraId, itemNumero, categoria);
      setLinhasPorOrc(prev => {
        const novo: Record<string, any[]> = {};
        for (const [id, linhas] of Object.entries(prev)) {
          novo[id] = linhas.map((l: any) => l.itemNumero === itemNumero ? { ...l, categoria } : l);
        }
        return novo;
      });
    } catch (err: any) {
      alert('Erro ao atualizar categoria: ' + err.message);
    }
  };

  // ── Dados para gráfico por categoria ──
  const dadosCategorias = useMemo(() => {
    if (lista.length === 0) return [];
    const cats = new Set<string>();
    lista.forEach(o => (linhasPorOrc[o.id] || []).forEach((l: any) => cats.add(l.categoria || 'Outros')));
    return Array.from(cats).sort().map(cat => {
      const entry: any = { categoria: cat };
      lista.forEach(o => {
        const nome = nomeDe(o) || o.id.slice(0, 6);
        const total = (linhasPorOrc[o.id] || [])
          .filter((l: any) => (l.categoria || 'Outros') === cat)
          .reduce((s: number, l: any) => s + (Number(l.valorTotal) || 0), 0);
        entry[nome] = total || null;
      });
      return entry;
    });
  }, [lista, linhasPorOrc]);

  // ── Matriz de cobertura ──
  const matrizCategorias = useMemo(() => {
    if (lista.length === 0) return [];
    const cats = new Set<string>();
    lista.forEach(o => (linhasPorOrc[o.id] || []).forEach((l: any) => cats.add(l.categoria || 'Outros')));
    return Array.from(cats).sort().map(cat => {
      const row: any = { categoria: cat };
      lista.forEach(o => {
        const nome = nomeDe(o) || o.id.slice(0, 6);
        const itens = (linhasPorOrc[o.id] || []).filter((l: any) => (l.categoria || 'Outros') === cat);
        row[o.id] = {
          presente: itens.length > 0,
          total: itens.reduce((s: number, l: any) => s + (Number(l.valorTotal) || 0), 0),
          qtd: itens.length,
          nome,
        };
      });
      return row;
    });
  }, [lista, linhasPorOrc]);

  const FIELD = 'w-full rounded-lg border border-outline-variant text-body-sm text-on-surface focus:border-primary py-2 px-3 bg-surface-container-lowest';

  return (
    <div className="flex flex-col gap-lg">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-md">
        <div>
          <h2 className="text-headline-md font-bold text-on-surface">Comparativo de Orçamentos</h2>
          <p className="text-body-sm text-on-surface-variant mt-1">Analise e compare propostas de fornecedores</p>
        </div>
        <div className="flex items-center gap-sm">
          {lista.length > 0 && (
            <div className="relative">
              <button onClick={() => setMenuExport(v => !v)} disabled={exportando}
                className="flex items-center gap-xs px-lg py-2 bg-primary text-on-primary rounded-lg hover:bg-primary/90 text-label-md transition-colors disabled:opacity-50">
                <span className="material-symbols-outlined text-[18px]">{exportando ? 'progress_activity' : 'download'}</span>
                {exportando ? 'Gerando…' : 'Exportar'}
                {!exportando && <span className="material-symbols-outlined text-[18px]">expand_more</span>}
              </button>
              {menuExport && (
                <div className="absolute right-0 top-full mt-1 z-30 bg-surface border border-outline-variant rounded-lg shadow-lg py-1 w-48">
                  <button onClick={exportarPDF} className="w-full px-md py-2 text-left text-body-sm text-on-surface hover:bg-surface-container-low flex items-center gap-sm">
                    <span className="material-symbols-outlined text-[18px] text-error">picture_as_pdf</span> PDF (apresentação)
                  </button>
                  <button onClick={exportarXLSX} className="w-full px-md py-2 text-left text-body-sm text-on-surface hover:bg-surface-container-low flex items-center gap-sm">
                    <span className="material-symbols-outlined text-[18px] text-emerald-600">table_view</span> Excel (dados)
                  </button>
                </div>
              )}
            </div>
          )}
          <button onClick={() => navigate('/orcamentos/upload')}
            className="flex items-center gap-xs px-lg py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 text-label-md transition-colors">
            <span className="material-symbols-outlined text-[18px]">upload_file</span> Importar
          </button>
        </div>
      </div>

      {/* Filtros: obra + chips fornecedores */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg flex flex-wrap gap-lg items-end">
        <div className="flex-1 min-w-[220px]">
          <label className="block text-label-sm text-on-surface mb-1">Obra</label>
          <select className={FIELD} value={obraId} onChange={e => setObraId(e.target.value)}>
            <option value="">Selecione a obra…</option>
            {obras.map(o => <option key={o.id} value={o.id}>{o.nome} — {o.cliente}</option>)}
          </select>
        </div>
        {todos.length > 0 && (
          <div className="flex flex-wrap gap-sm">
            {todos.map((o, i) => {
              const nome = nomeDe(o) || `Orc. ${i + 1}`;
              const sel = selecionados.has(o.id);
              const cor = CORES[i % CORES.length];
              return (
                <button key={o.id} onClick={() => {
                  setSelecionados(prev => { const s = new Set(prev); s.has(o.id) ? s.delete(o.id) : s.add(o.id); return s; });
                  setLinhasPorOrc(prev => { const n = { ...prev }; delete n[o.id]; return n; });
                }}
                  className="flex items-center gap-xs px-md py-xs rounded-full text-label-sm border transition-all"
                  style={sel ? { background: cor, borderColor: cor, color: 'white' } : { borderColor: '#e0e0e0', color: '#666' }}>
                  <span className="material-symbols-outlined text-[14px]">{sel ? 'check' : 'add'}</span>
                  {nome}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Estado vazio */}
      {!obraId && (
        <div className="flex flex-col items-center gap-md py-2xl text-center bg-surface-container-lowest border border-outline-variant rounded-xl">
          <span className="material-symbols-outlined text-[56px] text-outline">compare_arrows</span>
          <p className="text-headline-sm text-on-surface">Selecione uma obra para começar</p>
        </div>
      )}

      {obraId && carregando && (
        <div className="flex items-center gap-sm p-xl text-on-surface-variant">
          <span className="material-symbols-outlined animate-spin text-[22px]">progress_activity</span> Carregando…
        </div>
      )}

      {obraId && !carregando && todos.length === 0 && (
        <div className="flex flex-col items-center gap-md py-2xl text-center bg-surface-container-lowest border border-outline-variant rounded-xl">
          <span className="material-symbols-outlined text-[56px] text-outline">inbox</span>
          <p className="text-headline-sm text-on-surface">Nenhum orçamento para esta obra</p>
          <button onClick={() => navigate('/orcamentos/upload')} className="px-xl py-2 bg-primary text-on-primary rounded-lg text-label-md">Importar</button>
        </div>
      )}

      {lista.length > 0 && (
        <div ref={exportRef} className="flex flex-col gap-lg bg-surface-container-lowest">
          {/* KPIs sempre visíveis */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg">
              <p className="text-label-sm text-on-surface-variant">Propostas</p>
              <p className="text-display-lg font-bold text-on-surface mt-xs">{lista.length}</p>
              <p className="text-body-sm text-on-surface-variant mt-xs">{todos.length - lista.length > 0 ? `${todos.length - lista.length} ocultas` : 'todas visíveis'}</p>
            </div>
            <div className="bg-primary rounded-xl p-lg text-on-primary">
              <div className="flex items-center justify-between">
                <p className="text-label-sm opacity-80">Melhor Proposta</p>
                <span className="material-symbols-outlined text-[20px] opacity-70">emoji_events</span>
              </div>
              <p className="text-headline-sm font-bold mt-xs">{fmt(melhor)}</p>
              <p className="text-body-sm opacity-90 mt-xs leading-snug break-words pb-1">{nomeDe(lista[0])}</p>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg">
              <p className="text-label-sm text-on-surface-variant">Diferença</p>
              <p className="text-headline-sm font-bold text-error mt-xs">{fmt(maior - melhor)}</p>
              <p className="text-body-sm text-on-surface-variant mt-xs">menor vs. maior</p>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg">
              <p className="text-label-sm text-on-surface-variant">Economia Potencial</p>
              <p className="text-headline-sm font-bold text-emerald-600 mt-xs">{economia}%</p>
              <p className="text-body-sm text-on-surface-variant mt-xs">ao escolher o melhor</p>
            </div>
          </div>

          {/* Abas */}
          <div className="flex gap-0 border-b border-outline-variant">
            {ABAS.map(a => (
              <button key={a} onClick={() => setAba(a)}
                className={`px-lg py-sm text-label-md transition-colors border-b-2 -mb-px ${aba === a ? 'border-primary text-primary font-semibold' : 'border-transparent text-on-surface-variant hover:text-on-surface'}`}>
                {a}
              </button>
            ))}
          </div>

          {/* ── ABA 1: Visão Geral ── */}
          {aba === 'Visão Geral' && (
            <>
              {/* Cards de fornecedores */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-md">
                {lista.map((o, idx) => {
                  const nome = nomeDe(o) || `Fornecedor ${idx + 1}`;
                  const diff = Number(o.valorTotal) - melhor;
                  const pctDiff = melhor > 0 ? ((diff / melhor) * 100).toFixed(1) : '0';
                  const cor = coresPorId[o.id];
                  return (
                    <div key={o.id}
                      className={`bg-surface-container-lowest rounded-xl border overflow-hidden transition-shadow hover:shadow-md ${idx === 0 ? 'border-emerald-400' : 'border-outline-variant'}`}>
                      <div className="h-1.5" style={{ background: cor }} />
                      <div className="p-lg flex flex-col gap-sm">
                        <div className="flex items-start justify-between gap-sm">
                          <div className="flex items-center gap-sm min-w-0">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-label-sm font-bold text-white shrink-0" style={{ background: cor }}>
                              {idx === 0 ? '🏆' : idx + 1}
                            </div>
                            <p className="text-label-md font-semibold text-on-surface leading-snug truncate">{nome}</p>
                            <button onClick={() => renomear(o)} title="Renomear orçamento"
                              className="shrink-0 text-outline hover:text-primary transition-colors">
                              <span className="material-symbols-outlined text-[16px]">edit</span>
                            </button>
                          </div>
                          {idx === 0 && <span className="shrink-0 px-xs py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-label-sm border border-emerald-200">Melhor</span>}
                        </div>
                        <p className="text-headline-sm font-bold text-on-surface">{fmt(o.valorTotal)}</p>
                        {diff > 0
                          ? <p className="text-body-sm text-error">+{fmt(diff)} (+{pctDiff}% acima)</p>
                          : <p className="text-body-sm text-emerald-600">Menor preço entre os selecionados</p>}
                        {o.prazoDias && (
                          <div className="flex items-center gap-xs text-body-sm text-on-surface-variant">
                            <span className="material-symbols-outlined text-[16px]">schedule</span>{o.prazoDias} dias
                          </div>
                        )}
                        <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden mt-auto">
                          <div className="h-full rounded-full" style={{ width: `${maior > 0 ? (Number(o.valorTotal) / maior) * 100 : 0}%`, background: cor }} />
                        </div>
                        <div className="flex items-center justify-between pt-sm border-t border-outline-variant/50">
                          <button onClick={() => { setAba('Itens Detalhados'); setExpandidoTabela(o.id); }}
                            className="flex items-center gap-xs text-body-sm text-primary hover:text-primary/80 transition-colors">
                            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                            <span>Ver itens</span>
                          </button>
                          <button
                            onClick={() => remover(o.id, nomeDe(o) || 'orçamento')}
                            disabled={removendo === o.id}
                            className="flex items-center gap-xs text-body-sm text-error hover:text-error/80 transition-colors disabled:opacity-50"
                            title="Remover orçamento">
                            <span className="material-symbols-outlined text-[18px]">
                              {removendo === o.id ? 'progress_activity' : 'delete'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Gráfico de barras lateral rápido */}
              <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg">
                <h3 className="text-label-lg font-semibold text-on-surface mb-lg">Valores por Fornecedor</h3>
                <div className="flex flex-col gap-md">
                  {lista.map((o, idx) => {
                    const nome = nomeDe(o) || `F${idx + 1}`;
                    const pct = maior > 0 ? (Number(o.valorTotal) / maior) * 100 : 0;
                    const cor = coresPorId[o.id];
                    return (
                      <div key={o.id} className="flex items-center gap-md">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-label-sm font-bold text-white shrink-0" style={{ background: cor }}>{idx + 1}</div>
                        <div className="min-w-[160px] text-body-sm font-medium text-on-surface truncate">{nome}</div>
                        <div className="flex-1 h-8 bg-surface-container-highest rounded-lg overflow-hidden">
                          <div className="h-full rounded-lg" style={{ width: `${pct}%`, background: cor }} />
                        </div>
                        <div className="text-label-md font-bold text-on-surface w-36 text-right shrink-0">{fmt(o.valorTotal)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* ── ABA 2: Por Categorias ── */}
          {aba === 'Por Categorias' && (
            <div className="flex flex-col gap-lg">
              {carregandoLinhas && (
                <div className="flex items-center gap-sm p-lg text-on-surface-variant">
                  <span className="material-symbols-outlined animate-spin text-[22px]">progress_activity</span> Carregando itens de todos os orçamentos…
                </div>
              )}

              {!carregandoLinhas && dadosCategorias.length > 0 && (
                <>
                  {/* Comparativo por categoria — small multiples (um painel por categoria) */}
                  <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg">
                    <div className="flex items-center justify-between flex-wrap gap-sm mb-md">
                      <h3 className="text-label-lg font-semibold text-on-surface">Comparativo por Categoria</h3>
                      {/* Legenda horizontal: cor — fornecedor */}
                      <div className="flex flex-wrap items-center gap-x-md gap-y-xs">
                        {lista.map((o, i) => (
                          <span key={o.id} className="flex items-center gap-xs text-body-sm text-on-surface-variant">
                            <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: coresPorId[o.id] }} />
                            {nomeDe(o) || `F${i + 1}`}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">
                      {matrizCategorias.map(row => {
                        const presentes = lista.map(o => row[o.id]).filter((c: any) => c?.presente && c.total > 0);
                        const maxCat = Math.max(0, ...presentes.map((c: any) => c.total));
                        const minCat = presentes.length ? Math.min(...presentes.map((c: any) => c.total)) : 0;
                        return (
                          <div key={row.categoria} className="border border-outline-variant rounded-lg p-md bg-surface">
                            <p className="text-label-md font-semibold text-on-surface mb-sm">{row.categoria}</p>
                            <div className="flex flex-col gap-xs">
                              {lista.map((o, i) => {
                                const cel = row[o.id];
                                const cor = coresPorId[o.id];
                                if (!cel?.presente || !cel.total) {
                                  return (
                                    <div key={o.id} className="flex items-center gap-sm text-body-sm">
                                      <span className="w-2.5 h-2.5 rounded-sm shrink-0 opacity-30" style={{ background: cor }} />
                                      <span className="flex-1 h-5 rounded bg-surface-container-highest/30" />
                                      <span className="w-28 text-right shrink-0 text-error text-label-sm">Ausente</span>
                                    </div>
                                  );
                                }
                                const pct = maxCat > 0 ? (cel.total / maxCat) * 100 : 0;
                                const ehMelhor = cel.total === minCat;
                                const difPct = minCat > 0 ? ((cel.total - minCat) / minCat) * 100 : 0;
                                return (
                                  <div key={o.id} className="flex items-center gap-sm text-body-sm" title={`${nomeDe(o) || `F${i + 1}`}: ${fmt(cel.total)}`}>
                                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: cor }} />
                                    <div className="flex-1 h-5 bg-surface-container-highest rounded overflow-hidden">
                                      <div className="h-full rounded" style={{ width: `${pct}%`, background: cor }} />
                                    </div>
                                    <span className="w-24 text-right shrink-0 text-on-surface font-medium">{fmtK(cel.total)}</span>
                                    <span className={`w-14 text-right shrink-0 text-label-sm font-semibold ${ehMelhor ? 'text-emerald-600' : 'text-error'}`}>
                                      {ehMelhor ? 'menor' : `+${difPct.toFixed(0)}%`}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Matriz de cobertura */}
                  <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
                    <div className="px-lg py-md border-b border-outline-variant">
                      <h3 className="text-label-lg font-semibold text-on-surface">Cobertura por Categoria</h3>
                      <p className="text-body-sm text-on-surface-variant mt-xs">O que cada fornecedor contempla — células vermelhas indicam categoria ausente</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-body-sm min-w-[600px]">
                        <thead className="bg-surface-container-low border-b border-outline-variant">
                          <tr>
                            <th className="py-sm px-md text-label-sm text-on-surface-variant font-semibold text-left w-48">Categoria</th>
                            {lista.map((o, i) => {
                              const nome = nomeDe(o) || `F${i + 1}`;
                              return (
                                <th key={o.id} className="py-sm px-md text-label-sm font-semibold text-center whitespace-nowrap">
                                  <span style={{ color: coresPorId[o.id] }}>{nome}</span>
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/40">
                          {matrizCategorias.map(row => {
                            const ausentes = lista.filter(o => !row[o.id]?.presente).length;
                            return (
                              <tr key={row.categoria} className="hover:bg-surface-container-low/50">
                                <td className="py-sm px-md font-medium text-on-surface">
                                  <div className="flex items-center gap-xs">
                                    {ausentes > 0 && <span className="material-symbols-outlined text-error text-[16px]" title={`${ausentes} fornecedor(es) sem este item`}>warning</span>}
                                    {row.categoria}
                                  </div>
                                </td>
                                {lista.map(o => {
                                  const cell = row[o.id];
                                  return (
                                    <td key={o.id} className="py-sm px-md text-center">
                                      {cell?.presente ? (
                                        <div className="flex flex-col items-center gap-0.5">
                                          <span className="text-label-sm font-semibold text-on-surface">{fmt(cell.total)}</span>
                                          <span className="text-label-sm text-on-surface-variant">{cell.qtd} {cell.qtd === 1 ? 'item' : 'itens'}</span>
                                        </div>
                                      ) : (
                                        <div className="flex flex-col items-center gap-0.5">
                                          <span className="material-symbols-outlined text-error text-[18px]">block</span>
                                          <span className="text-label-sm text-error">Ausente</span>
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── ABA 3: Itens Detalhados ── */}
          {aba === 'Itens Detalhados' && (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
              <div className="px-lg py-md border-b border-outline-variant flex items-center justify-between">
                <h3 className="text-label-lg font-semibold text-on-surface">Detalhamento por Fornecedor</h3>
                <span className="text-body-sm text-on-surface-variant">Clique em um fornecedor para expandir</span>
              </div>
              {carregandoLinhas && (
                <div className="flex items-center gap-sm p-lg text-on-surface-variant">
                  <span className="material-symbols-outlined animate-spin text-[22px]">progress_activity</span> Carregando itens…
                </div>
              )}
              <div className="divide-y divide-outline-variant">
                {lista.map((o, idx) => {
                  const nome = nomeDe(o) || `Fornecedor ${idx + 1}`;
                  const diff = Number(o.valorTotal) - melhor;
                  const pctDiff = melhor > 0 ? ((diff / melhor) * 100).toFixed(1) : '0';
                  const cor = coresPorId[o.id];
                  const aberto = expandidoTabela === o.id;
                  const itens = linhasPorOrc[o.id];

                  return (
                    <div key={o.id}>
                      {/* Linha do fornecedor (clicável) */}
                      <button
                        onClick={() => setExpandidoTabela(aberto ? null : o.id)}
                        className="w-full flex items-center gap-md px-lg py-md hover:bg-surface-container-low transition-colors text-left">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-label-sm font-bold text-white shrink-0" style={{ background: cor }}>
                          {idx === 0 ? '🏆' : idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-sm flex-wrap">
                            <span className="text-label-md font-semibold text-on-surface">{nome}</span>
                            {idx === 0 && <span className="px-xs py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-label-sm border border-emerald-200">Melhor preço</span>}
                          </div>
                          <div className="flex items-center gap-lg mt-xs flex-wrap">
                            <span className="text-label-md font-bold text-on-surface">{fmt(o.valorTotal)}</span>
                            {diff > 0 && <span className="text-body-sm text-error">+{pctDiff}% acima do melhor</span>}
                            {o.prazoDias && <span className="text-body-sm text-on-surface-variant">{o.prazoDias} dias</span>}
                            {itens && <span className="text-body-sm text-on-surface-variant">{itens.length} itens</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-sm shrink-0">
                          <button
                            onClick={(e) => { e.stopPropagation(); remover(o.id, nome); }}
                            disabled={removendo === o.id}
                            className="p-xs text-outline hover:text-error transition-colors rounded disabled:opacity-50"
                            title="Remover orçamento">
                            <span className="material-symbols-outlined text-[20px]">
                              {removendo === o.id ? 'progress_activity' : 'delete'}
                            </span>
                          </button>
                          <span className="material-symbols-outlined text-outline text-[22px] transition-transform" style={{ transform: aberto ? 'rotate(180deg)' : '' }}>
                            expand_more
                          </span>
                        </div>
                      </button>

                      {/* Tabela de itens expandida */}
                      {aberto && (
                        <div className="border-t border-outline-variant/50">
                          {!itens
                            ? <div className="flex items-center gap-sm p-lg text-on-surface-variant"><span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span> Carregando…</div>
                            : itens.length === 0
                              ? <p className="p-lg text-body-sm text-on-surface-variant">Nenhum item registrado</p>
                              : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-body-sm">
                                    <thead className="bg-surface-container-low/80">
                                      <tr>
                                        {['Item', 'Descrição', 'Categoria', 'Qtd', 'Valor Unit.', 'Total'].map(h => (
                                          <th key={h} className="py-xs px-md text-label-sm text-on-surface-variant font-semibold text-left whitespace-nowrap">{h}</th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-outline-variant/30">
                                      {itens.map((l: any, i: number) => (
                                        <tr key={i} className="hover:bg-surface-container-low/50">
                                          <td className="py-xs px-md text-on-surface-variant whitespace-nowrap">{l.itemNumero}</td>
                                          <td className="py-xs px-md text-on-surface max-w-xs">{l.descricao}</td>
                                          <td className="py-xs px-md">
                                            <select
                                              value={l.categoria || ''}
                                              onChange={e => mudarCategoriaItem(l.itemNumero, e.target.value)}
                                              title="Alterar categoria (aplica a todos os fornecedores)"
                                              className="px-xs py-0.5 rounded text-label-sm border border-transparent hover:border-outline-variant focus:border-primary outline-none cursor-pointer"
                                              style={{ background: cor + '20', color: cor }}
                                            >
                                              {CATEGORIAS.map(c => <option key={c} value={c} style={{ color: '#111' }}>{c}</option>)}
                                            </select>
                                          </td>
                                          <td className="py-xs px-md text-on-surface-variant text-right whitespace-nowrap">{l.quantidade}</td>
                                          <td className="py-xs px-md text-on-surface-variant text-right whitespace-nowrap">{fmt(l.valorUnitario)}</td>
                                          <td className="py-xs px-md font-semibold text-on-surface text-right whitespace-nowrap">{fmt(l.valorTotal)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                    <tfoot className="border-t border-outline-variant bg-surface-container-low">
                                      <tr>
                                        <td colSpan={5} className="py-sm px-md text-label-sm font-semibold text-on-surface">Total ({itens.length} itens)</td>
                                        <td className="py-sm px-md text-right font-bold text-on-surface whitespace-nowrap">{fmt(o.valorTotal)}</td>
                                      </tr>
                                    </tfoot>
                                  </table>
                                </div>
                              )
                          }
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listarObras } from '../store';
import type { Obra } from '../store';
import { apiClient } from '../api/client';
import { exportarComparativoPDF } from '../utils/exportar';

const CORES = [
  '#2563EB', '#DC2626', '#16A34A', '#EA580C', '#7C3AED', '#0891B2',
  '#CA8A04', '#DB2777', '#4F46E5', '#65A30D', '#0D9488', '#9333EA',
];
const fmt = (v: any) => 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtK = (v: number) => v >= 1_000_000 ? `R$ ${(v / 1e6).toFixed(1)}M` : v >= 1000 ? `R$ ${(v / 1000).toFixed(0)}K` : fmt(v);
const nomeDe = (o: any) => (o?.nome && String(o.nome).trim()) || o?.fornecedorNome || 'Fornecedor';
const numero = (v: any) => Number(v) || 0;
// Status REAL derivado dos itens aprovados (despesas existentes), não do campo salvo
const statusReal = (o: any): 'ativo' | 'parcial' | 'aceito' => {
  const ap = Number(o?.aprovadas) || 0, it = Number(o?.itens) || 0;
  if (ap === 0) return 'ativo';
  return ap >= it && it > 0 ? 'aceito' : 'parcial';
};
const rotuloStatus = (s: string) => s === 'aceito' ? 'Aprovado' : s === 'parcial' ? 'Parcial' : 'Pendente';

export function OrcamentosPage() {
  const navigate = useNavigate();
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraId, setObraId] = useState('');
  const [todos, setTodos] = useState<any[]>([]);
  const [linhasPorOrc, setLinhasPorOrc] = useState<Record<string, any[]>>({});
  const [carregando, setCarregando] = useState(false);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [itensSel, setItensSel] = useState<Set<string>>(new Set());
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [ordenar, setOrdenar] = useState<'valor' | 'nome'>('valor');
  const [toast, setToast] = useState('');
  const [acao, setAcao] = useState(false);            // aprovando/removendo
  const [menuExport, setMenuExport] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [expandComp, setExpandComp] = useState<Set<string>>(new Set());
  const reimportRef = React.useRef<HTMLInputElement>(null);

  const aviso = (m: string) => { setToast(m); setTimeout(() => setToast(''), 5000); };

  useEffect(() => { listarObras().then(setObras); }, []);
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('obraId');
    if (p) setObraId(p);
  }, []);

  const recarregar = (oid = obraId) => {
    if (!oid) { setTodos([]); return Promise.resolve(); }
    setCarregando(true);
    return apiClient.listarOrcamentos(oid)
      .then(d => setTodos(d || []))
      .catch(() => setTodos([]))
      .finally(() => setCarregando(false));
  };
  useEffect(() => { setSel(new Set()); setItensSel(new Set()); setLinhasPorOrc({}); recarregar(obraId); /* eslint-disable-next-line */ }, [obraId]);

  // Carrega linhas dos selecionados
  useEffect(() => {
    const faltam = Array.from(sel).filter(id => !linhasPorOrc[id]);
    if (faltam.length === 0) return;
    Promise.all(faltam.map(id =>
      apiClient.obterOrcamento(id).then(d => ({ id, linhas: d.linhas || [] })).catch(() => ({ id, linhas: [] }))
    )).then(res => {
      const novo: Record<string, any[]> = {};
      res.forEach(r => { novo[r.id] = r.linhas; });
      setLinhasPorOrc(prev => ({ ...prev, ...novo }));
    });
  }, [sel]); // eslint-disable-line

  const toggleSel = (id: string) => setSel(prev => {
    const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s;
  });

  // Lista filtrada/ordenada
  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    let l = todos.filter(o => {
      const nome = nomeDe(o).toLowerCase();
      const okBusca = !q || nome.includes(q);
      const okStatus = !filtroStatus || statusReal(o) === filtroStatus;
      return okBusca && okStatus;
    });
    l = [...l].sort((a, b) => ordenar === 'valor' ? numero(a.valorTotal) - numero(b.valorTotal) : nomeDe(a).localeCompare(nomeDe(b)));
    return l;
  }, [todos, busca, filtroStatus, ordenar]);

  const menorGlobal = useMemo(() => todos.length ? Math.min(...todos.map(o => numero(o.valorTotal))) : 0, [todos]);

  const selecionados = useMemo(() => todos.filter(o => sel.has(o.id)).sort((a, b) => numero(a.valorTotal) - numero(b.valorTotal)), [todos, sel]);
  const coresPorId = useMemo(() => {
    const m: Record<string, string> = {};
    selecionados.forEach((o, i) => { m[o.id] = CORES[i % CORES.length]; });
    return m;
  }, [selecionados]);

  const modo = sel.size === 0 ? 'vazio' : sel.size === 1 ? 'analise' : 'comparar';

  // ───────── Aprovação (modo análise) ─────────
  const orcAtivo = sel.size === 1 ? selecionados[0] : null;
  const linhasAtivo = orcAtivo ? (linhasPorOrc[orcAtivo.id] || []) : [];
  const categoriasAtivo = useMemo(() => {
    const map = new Map<string, any[]>();
    linhasAtivo.forEach(l => { const c = l.categoria || 'Outros'; if (!map.has(c)) map.set(c, []); map.get(c)!.push(l); });
    return Array.from(map.entries());
  }, [linhasAtivo]);

  const aprovar = async (opts: { linhaIds?: string[]; categorias?: string[] }) => {
    if (!orcAtivo) return;
    setAcao(true);
    try {
      const r = await apiClient.aprovarOrcamento(orcAtivo.id, opts);
      aviso(`✅ ${r?.mensagem || 'Aprovado!'}`);
      const d = await apiClient.obterOrcamento(orcAtivo.id);
      setLinhasPorOrc(prev => ({ ...prev, [orcAtivo.id]: d.linhas || [] }));
      setItensSel(new Set());
      await recarregar();
    } catch (e: any) { aviso('Erro: ' + e.message); }
    setAcao(false);
  };

  const excluirItens = async () => {
    if (!orcAtivo || itensSel.size === 0) return;
    if (!window.confirm(`Excluir ${itensSel.size} item(ns) deste orçamento? Esta ação não pode ser desfeita.`)) return;
    setAcao(true);
    try {
      await apiClient.excluirItensOrcamento(orcAtivo.id, Array.from(itensSel));
      aviso('Itens removidos');
      const d = await apiClient.obterOrcamento(orcAtivo.id);
      setLinhasPorOrc(prev => ({ ...prev, [orcAtivo.id]: d.linhas || [] }));
      setItensSel(new Set());
      await recarregar();
    } catch (e: any) { aviso('Erro: ' + e.message); }
    setAcao(false);
  };

  const remover = async (o: any) => {
    if (!window.confirm(`Remover orçamento "${nomeDe(o)}"?`)) return;
    setAcao(true);
    try {
      await apiClient.deletarOrcamento(o.id);
      setSel(prev => { const s = new Set(prev); s.delete(o.id); return s; });
      await recarregar();
      aviso('Orçamento removido');
    } catch (e: any) { aviso('Erro: ' + e.message); }
    setAcao(false);
  };

  const excluirSelecionados = async () => {
    if (!window.confirm(`Excluir ${sel.size} orçamento(s)? Esta ação não pode ser desfeita.`)) return;
    setAcao(true);
    try {
      for (const id of Array.from(sel)) await apiClient.deletarOrcamento(id);
      setSel(new Set());
      await recarregar();
      aviso('Orçamentos removidos');
    } catch (e: any) { aviso('Erro: ' + e.message); }
    setAcao(false);
  };

  // ───────── Comparação ─────────
  const melhor = numero(selecionados[0]?.valorTotal);
  const maior = numero(selecionados[selecionados.length - 1]?.valorTotal);
  const economia = maior > 0 ? (((maior - melhor) / maior) * 100).toFixed(1) : '0';
  const matriz = useMemo(() => {
    const cats = new Set<string>();
    selecionados.forEach(o => (linhasPorOrc[o.id] || []).forEach((l: any) => cats.add(l.categoria || 'Outros')));
    return Array.from(cats).sort().map(cat => ({
      categoria: cat,
      valores: selecionados.map(o => {
        const ls = (linhasPorOrc[o.id] || []).filter((l: any) => (l.categoria || 'Outros') === cat);
        return ls.length ? ls.reduce((s: number, l: any) => s + numero(l.valorTotal), 0) : null;
      }),
    }));
  }, [selecionados, linhasPorOrc]);

  // ───────── Export / Reimport ─────────
  const slug = (obras.find(o => o.id === obraId)?.nome || 'orcamentos').normalize('NFD').replace(/[^\w]+/g, '_').toLowerCase();
  const carregarTodasLinhas = async () => {
    const carregadas: Record<string, any[]> = { ...linhasPorOrc };
    const faltam = selecionados.filter(o => !carregadas[o.id]);
    if (faltam.length) {
      const r = await Promise.all(faltam.map(o => apiClient.obterOrcamento(o.id).then(d => ({ id: o.id, linhas: d.linhas || [] })).catch(() => ({ id: o.id, linhas: [] }))));
      r.forEach(x => { carregadas[x.id] = x.linhas; });
      setLinhasPorOrc(carregadas);
    }
    return carregadas;
  };
  const exportarPDF = async () => {
    setMenuExport(false); setExportando(true);
    try {
      const carregadas = await carregarTodasLinhas();
      const fornecedores = selecionados.map(o => ({
        nome: nomeDe(o), valorTotal: numero(o.valorTotal), prazoDias: o.prazoDias || null, cor: coresPorId[o.id],
        itens: (carregadas[o.id] || []).map((l: any) => [l.itemNumero || '', l.descricao || '', l.categoria || '', numero(l.quantidade), numero(l.valorUnitario), numero(l.valorTotal)]),
      }));
      const cats = Array.from(new Set(selecionados.flatMap(o => (carregadas[o.id] || []).map((l: any) => l.categoria || 'Outros')))).sort();
      const categorias = cats.map(cat => ({ categoria: cat, valores: selecionados.map(o => { const ls = (carregadas[o.id] || []).filter((l: any) => (l.categoria || 'Outros') === cat); return ls.length ? ls.reduce((s: number, l: any) => s + numero(l.valorTotal), 0) : null; }) }));
      exportarComparativoPDF({ arquivo: `comparativo_${slug}`, obra: obras.find(o => o.id === obraId)?.nome || '', economia, fornecedores, categorias });
    } catch (e: any) { aviso('Erro ao gerar PDF: ' + e.message); }
    setExportando(false);
  };
  const exportarXLSX = async () => {
    setMenuExport(false); setExportando(true);
    try {
      const carregadas = await carregarTodasLinhas();
      const fornecedores = selecionados.map(o => ({
        id: o.id, obraId, nome: nomeDe(o), prazoDias: o.prazoDias || null,
        itens: (carregadas[o.id] || []).map((l: any) => [l.itemNumero || '', l.descricao || '', l.categoria || '', numero(l.quantidade), numero(l.valorUnitario), numero(l.valorTotal)]),
      }));
      const blob = await apiClient.exportarOrcamentosExcel({ nomeArquivo: `comparativo_${slug}`, fornecedores });
      const url = URL.createObjectURL(blob); const a = document.createElement('a');
      a.href = url; a.download = `comparativo_${slug}.xlsx`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    } catch (e: any) { aviso('Erro ao gerar Excel: ' + e.message); }
    setExportando(false);
  };
  const reimportar = async (file?: File) => {
    if (!file) return; setExportando(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = e => resolve((e.target?.result as string).split(',')[1]); r.onerror = reject; r.readAsDataURL(file); });
      const res = await apiClient.reimportarOrcamentosExcel(base64);
      setLinhasPorOrc({}); await recarregar();
      aviso(`${res.atualizados} orçamento(s) atualizado(s).`);
    } catch (e: any) { aviso('Erro ao reimportar: ' + e.message); }
    setExportando(false);
    if (reimportRef.current) reimportRef.current.value = '';
  };

  const FIELD = 'rounded-lg border border-outline-variant text-body-sm text-on-surface focus:border-primary py-2 px-3 bg-surface-container-lowest';
  const statusChip = (s: string) => s === 'aceito' ? 'bg-emerald-100 text-emerald-700' : s === 'parcial' ? 'bg-amber-100 text-amber-700' : 'bg-surface-container-high text-on-surface-variant';

  return (
    <div className="flex flex-col gap-lg">
      {toast && <div className="fixed bottom-lg right-lg z-50 px-lg py-sm bg-primary text-on-primary rounded-lg shadow-lg text-label-md">{toast}</div>}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-md">
        <div>
          <h2 className="text-headline-md font-bold text-on-surface">Orçamentos — Análise &amp; Aprovação</h2>
          <p className="text-body-sm text-on-surface-variant mt-1">Selecione 1 para analisar/aprovar, ou 2+ para comparar</p>
        </div>
        <div className="flex items-center gap-sm">
          {selecionados.length >= 2 && (
            <div className="relative">
              <button onClick={() => setMenuExport(v => !v)} disabled={exportando} className="flex items-center gap-xs px-lg py-2 bg-primary text-on-primary rounded-lg hover:bg-primary/90 text-label-md disabled:opacity-50">
                <span className="material-symbols-outlined text-[18px]">{exportando ? 'progress_activity' : 'download'}</span>{exportando ? 'Gerando…' : 'Exportar'}
              </button>
              {menuExport && (
                <div className="absolute right-0 top-full mt-1 z-30 bg-surface border border-outline-variant rounded-lg shadow-lg py-1 w-48">
                  <button onClick={exportarPDF} className="w-full px-md py-2 text-left text-body-sm hover:bg-surface-container-low flex items-center gap-sm"><span className="material-symbols-outlined text-[18px] text-error">picture_as_pdf</span> PDF</button>
                  <button onClick={exportarXLSX} className="w-full px-md py-2 text-left text-body-sm hover:bg-surface-container-low flex items-center gap-sm"><span className="material-symbols-outlined text-[18px] text-emerald-600">table_view</span> Excel</button>
                </div>
              )}
            </div>
          )}
          {sel.size >= 2 && (
            <button onClick={excluirSelecionados} disabled={acao} className="flex items-center gap-xs px-lg py-2 bg-error/10 text-error rounded-lg hover:bg-error/20 text-label-md disabled:opacity-50">
              <span className="material-symbols-outlined text-[18px]">delete</span> Excluir ({sel.size})
            </button>
          )}
          <input ref={reimportRef} type="file" accept=".xlsx" className="hidden" onChange={e => reimportar(e.target.files?.[0])} />
          <button onClick={() => reimportRef.current?.click()} disabled={exportando} className="flex items-center gap-xs px-lg py-2 border border-outline-variant rounded-lg hover:bg-surface-container-low text-label-md disabled:opacity-50"><span className="material-symbols-outlined text-[18px]">sync</span> Reimportar</button>
          <button onClick={() => navigate('/orcamentos/upload')} className="flex items-center gap-xs px-lg py-2 border border-primary text-primary rounded-lg hover:bg-primary/5 text-label-md"><span className="material-symbols-outlined text-[18px]">upload_file</span> Importar</button>
        </div>
      </div>

      {/* Obra */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg">
        <label className="block text-label-sm text-on-surface mb-1">Obra</label>
        <select className={`w-full ${FIELD}`} value={obraId} onChange={e => setObraId(e.target.value)}>
          <option value="">Selecione a obra…</option>
          {obras.map(o => <option key={o.id} value={o.id}>{o.nome} — {o.cliente}</option>)}
        </select>
      </div>

      {!obraId && (
        <div className="flex flex-col items-center gap-md py-2xl text-center bg-surface-container-lowest border border-outline-variant rounded-xl">
          <span className="material-symbols-outlined text-[56px] text-outline">request_quote</span>
          <p className="text-headline-sm text-on-surface">Selecione uma obra para começar</p>
        </div>
      )}

      {obraId && (
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-lg items-start">
          {/* LISTA */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-md flex flex-col gap-sm">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar fornecedor…" className={`w-full pl-8 ${FIELD}`} />
            </div>
            <div className="flex gap-sm">
              <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)} className={`flex-1 ${FIELD}`}>
                <option value="">Todos status</option>
                <option value="ativo">Pendente</option>
                <option value="parcial">Parcial</option>
                <option value="aceito">Aprovado</option>
              </select>
              <select value={ordenar} onChange={e => setOrdenar(e.target.value as any)} className={`flex-1 ${FIELD}`}>
                <option value="valor">Menor preço</option>
                <option value="nome">Nome</option>
              </select>
            </div>
            <div className="flex items-center justify-between text-label-sm text-on-surface-variant px-1">
              <span>{filtrados.length} orçamento(s)</span>
              <div className="flex gap-sm">
                <button onClick={() => setSel(new Set(filtrados.map(o => o.id)))} className="hover:text-primary">Todos</button>
                <button onClick={() => setSel(new Set())} className="hover:text-primary">Limpar</button>
              </div>
            </div>
            <div className="flex flex-col gap-xs max-h-[60vh] overflow-y-auto">
              {carregando && <p className="text-body-sm text-on-surface-variant p-sm">Carregando…</p>}
              {!carregando && filtrados.length === 0 && <p className="text-body-sm text-on-surface-variant p-sm">Nenhum orçamento.</p>}
              {filtrados.map((o, i) => {
                const ativo = sel.has(o.id);
                const ehMelhor = numero(o.valorTotal) === menorGlobal && menorGlobal > 0;
                return (
                  <button key={o.id} onClick={() => toggleSel(o.id)}
                    className={`text-left p-sm rounded-lg border transition-colors ${ativo ? 'border-primary bg-primary/5' : 'border-outline-variant hover:bg-surface-container-low'}`}>
                    <div className="flex items-center gap-sm">
                      <span className={`material-symbols-outlined text-[18px] ${ativo ? 'text-primary' : 'text-outline'}`}>{ativo ? 'check_box' : 'check_box_outline_blank'}</span>
                      <span className="flex-1 text-body-sm font-medium text-on-surface truncate">{nomeDe(o)}</span>
                      {ehMelhor && <span className="material-symbols-outlined text-[16px] text-emerald-600">emoji_events</span>}
                    </div>
                    <div className="flex items-center justify-between mt-xs pl-7">
                      <span className="text-body-sm text-on-surface-variant">{fmt(o.valorTotal)}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${statusChip(statusReal(o))}`}>{rotuloStatus(statusReal(o))}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PAINEL */}
          <div className="min-w-0">
            {modo === 'vazio' && (
              <div className="flex flex-col items-center gap-md py-2xl text-center bg-surface-container-lowest border border-outline-variant rounded-xl">
                <span className="material-symbols-outlined text-[48px] text-outline">touch_app</span>
                <p className="text-headline-sm text-on-surface">Selecione um orçamento</p>
                <p className="text-body-sm text-on-surface-variant">1 para analisar e aprovar · 2+ para comparar</p>
              </div>
            )}

            {/* ── ANÁLISE / APROVAÇÃO (1 selecionado) ── */}
            {modo === 'analise' && orcAtivo && (
              <div className="flex flex-col gap-md">
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg flex items-center justify-between flex-wrap gap-md">
                  <div>
                    <h3 className="text-headline-sm font-bold text-on-surface">{nomeDe(orcAtivo)}</h3>
                    <p className="text-body-sm text-on-surface-variant">{fmt(orcAtivo.valorTotal)} · {linhasAtivo.length} itens · {orcAtivo.prazoDias || '—'} dias</p>
                  </div>
                  <div className="flex gap-sm">
                    <button onClick={() => aprovar({})} disabled={acao} className="px-lg py-2 bg-primary text-on-primary rounded-lg hover:bg-primary/90 text-label-md disabled:opacity-50 flex items-center gap-xs">
                      <span className={`material-symbols-outlined text-[18px] ${acao ? 'animate-spin' : ''}`}>{acao ? 'progress_activity' : 'task_alt'}</span> Aprovar tudo
                    </button>
                    {itensSel.size > 0 && (
                      <>
                        <button onClick={() => aprovar({ linhaIds: Array.from(itensSel) })} disabled={acao} className="px-lg py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-label-md disabled:opacity-50">
                          Aprovar {itensSel.size} selecionado(s)
                        </button>
                        <button onClick={excluirItens} disabled={acao} className="px-lg py-2 bg-error/10 text-error rounded-lg hover:bg-error/20 text-label-md disabled:opacity-50 flex items-center gap-xs">
                          <span className="material-symbols-outlined text-[18px]">delete_sweep</span> Excluir {itensSel.size}
                        </button>
                      </>
                    )}
                    <button onClick={() => remover(orcAtivo)} disabled={acao} className="px-lg py-2 bg-error/10 text-error rounded-lg hover:bg-error/20 text-label-md disabled:opacity-50"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                  </div>
                </div>

                {categoriasAtivo.map(([cat, items]) => {
                  const totalCat = items.reduce((s: number, l: any) => s + numero(l.valorTotal), 0);
                  const todosAprovados = items.every((l: any) => l.aprovada);
                  return (
                    <div key={cat} className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
                      <div className="px-lg py-md flex items-center justify-between bg-surface-container-low border-b border-outline-variant">
                        <div className="flex items-center gap-sm">
                          <span className="text-label-md font-semibold text-on-surface">{cat}</span>
                          <span className="text-body-sm text-on-surface-variant">{items.length} itens · {fmt(totalCat)}</span>
                          {todosAprovados && <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">aprovada</span>}
                        </div>
                        <button onClick={() => aprovar({ categorias: [cat] })} disabled={acao} className="px-md py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 text-label-sm disabled:opacity-50">
                          {todosAprovados ? 'Reaprovar categoria' : 'Aprovar categoria'}
                        </button>
                      </div>
                      <table className="w-full text-body-sm">
                        <tbody className="divide-y divide-outline-variant/30">
                          {items.map((l: any) => {
                            const checked = itensSel.has(l.id);
                            return (
                              <tr key={l.id} className="hover:bg-surface-container-low/50">
                                <td className="py-xs px-md w-8">
                                  <button onClick={() => setItensSel(prev => { const s = new Set(prev); s.has(l.id) ? s.delete(l.id) : s.add(l.id); return s; })}>
                                    <span className={`material-symbols-outlined text-[18px] ${checked ? 'text-primary' : 'text-outline'}`}>{checked ? 'check_box' : 'check_box_outline_blank'}</span>
                                  </button>
                                </td>
                                <td className="py-xs px-md text-on-surface">{l.descricao}</td>
                                <td className="py-xs px-md text-on-surface-variant text-center whitespace-nowrap">{numero(l.quantidade)}</td>
                                <td className="py-xs px-md text-on-surface font-medium text-right whitespace-nowrap">{fmt(l.valorTotal)}</td>
                                <td className="py-xs px-md w-24 text-right">
                                  {l.aprovada
                                    ? <span className="text-[11px] text-emerald-600 inline-flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">check_circle</span>aprovado</span>
                                    : <button onClick={() => aprovar({ linhaIds: [l.id] })} disabled={acao} className="text-[11px] text-primary hover:underline">aprovar</button>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── COMPARAÇÃO (2+ selecionados) ── */}
            {modo === 'comparar' && (
              <div className="flex flex-col gap-lg">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
                  <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg"><p className="text-label-sm text-on-surface-variant">Selecionados</p><p className="text-display-lg font-bold text-on-surface mt-xs">{selecionados.length}</p></div>
                  <div className="bg-primary rounded-xl p-lg text-on-primary"><p className="text-label-sm opacity-80">Melhor</p><p className="text-headline-sm font-bold mt-xs">{fmt(melhor)}</p><p className="text-body-sm opacity-90 mt-xs leading-snug break-words">{nomeDe(selecionados[0])}</p></div>
                  <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg"><p className="text-label-sm text-on-surface-variant">Diferença</p><p className="text-headline-sm font-bold text-error mt-xs">{fmt(maior - melhor)}</p></div>
                  <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg"><p className="text-label-sm text-on-surface-variant">Economia</p><p className="text-headline-sm font-bold text-emerald-600 mt-xs">{economia}%</p></div>
                </div>

                {/* Valores por fornecedor */}
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg">
                  <h3 className="text-label-lg font-semibold text-on-surface mb-md">Valores por Fornecedor</h3>
                  <div className="flex flex-col gap-sm">
                    {selecionados.map((o) => {
                      const pct = maior > 0 ? (numero(o.valorTotal) / maior) * 100 : 0;
                      return (
                        <div key={o.id} className="flex items-center gap-md">
                          <div className="min-w-[160px] text-body-sm font-medium text-on-surface truncate">{nomeDe(o)}</div>
                          <div className="flex-1 h-7 bg-surface-container-highest rounded-lg overflow-hidden"><div className="h-full rounded-lg" style={{ width: `${pct}%`, background: coresPorId[o.id] }} /></div>
                          <div className="w-32 text-right text-label-md font-bold text-on-surface">{fmt(o.valorTotal)}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Small multiples por categoria */}
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg">
                  <div className="flex items-center justify-between flex-wrap gap-sm mb-md">
                    <h3 className="text-label-lg font-semibold text-on-surface">Comparativo por Categoria</h3>
                    <div className="flex flex-wrap gap-x-md gap-y-xs">
                      {selecionados.map(o => <span key={o.id} className="flex items-center gap-xs text-body-sm text-on-surface-variant"><span className="w-3 h-3 rounded-sm" style={{ background: coresPorId[o.id] }} />{nomeDe(o)}</span>)}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">
                    {matriz.map(row => {
                      const presentes = row.valores.filter((v): v is number => v != null);
                      const maxC = presentes.length ? Math.max(...presentes) : 0;
                      const minC = presentes.length ? Math.min(...presentes) : 0;
                      return (
                        <div key={row.categoria} className="border border-outline-variant rounded-lg p-md bg-surface">
                          <p className="text-label-md font-semibold text-on-surface mb-sm">{row.categoria}</p>
                          <div className="flex flex-col gap-xs">
                            {selecionados.map((o, i) => {
                              const v = row.valores[i];
                              return (
                                <div key={o.id} className="flex items-center gap-sm text-body-sm">
                                  <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: coresPorId[o.id], opacity: v == null ? 0.3 : 1 }} />
                                  <div className="flex-1 h-4 bg-surface-container-highest rounded overflow-hidden">{v != null && maxC > 0 && <div className="h-full" style={{ width: `${(v / maxC) * 100}%`, background: coresPorId[o.id] }} />}</div>
                                  {v == null
                                    ? <span className="w-24 text-right text-error text-label-sm">Ausente</span>
                                    : <span className={`w-24 text-right text-label-sm font-semibold ${v === minC ? 'text-emerald-600' : 'text-on-surface'}`}>{fmtK(v)}</span>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* Itens por fornecedor (detalhe) */}
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg">
                  <h3 className="text-label-lg font-semibold text-on-surface mb-md">Itens por Fornecedor</h3>
                  <div className="flex flex-col gap-sm">
                    {selecionados.map(o => {
                      const aberto = expandComp.has(o.id);
                      const linhas = linhasPorOrc[o.id] || [];
                      return (
                        <div key={o.id} className="border border-outline-variant rounded-lg overflow-hidden">
                          <button onClick={() => setExpandComp(prev => { const s = new Set(prev); s.has(o.id) ? s.delete(o.id) : s.add(o.id); return s; })}
                            className="w-full flex items-center justify-between px-md py-sm hover:bg-surface-container-low">
                            <span className="flex items-center gap-sm min-w-0">
                              <span className="w-3 h-3 rounded-sm shrink-0" style={{ background: coresPorId[o.id] }} />
                              <span className="text-label-md font-medium text-on-surface truncate">{nomeDe(o)}</span>
                              <span className="text-body-sm text-on-surface-variant whitespace-nowrap">{linhas.length} itens · {fmt(o.valorTotal)}</span>
                            </span>
                            <span className="material-symbols-outlined text-outline transition-transform" style={{ transform: aberto ? 'rotate(180deg)' : 'none' }}>expand_more</span>
                          </button>
                          {aberto && (
                            <div className="overflow-x-auto border-t border-outline-variant">
                              <table className="w-full text-body-sm min-w-[560px]">
                                <thead className="bg-surface-container-low">
                                  <tr>
                                    {['Item', 'Descrição', 'Categoria', 'Qtd', 'Total'].map(h => <th key={h} className="py-xs px-md text-left text-label-sm text-on-surface-variant whitespace-nowrap">{h}</th>)}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-outline-variant/30">
                                  {linhas.map((l: any, i: number) => (
                                    <tr key={i} className="hover:bg-surface-container-low/50">
                                      <td className="py-xs px-md text-on-surface-variant whitespace-nowrap">{l.itemNumero}</td>
                                      <td className="py-xs px-md text-on-surface">{l.descricao}</td>
                                      <td className="py-xs px-md text-on-surface-variant">{l.categoria}</td>
                                      <td className="py-xs px-md text-on-surface-variant text-right whitespace-nowrap">{numero(l.quantidade)}</td>
                                      <td className="py-xs px-md text-on-surface font-medium text-right whitespace-nowrap">{fmt(l.valorTotal)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <p className="text-body-sm text-on-surface-variant text-center">Para aprovar itens/categorias, selecione apenas <strong>um</strong> orçamento na lista.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

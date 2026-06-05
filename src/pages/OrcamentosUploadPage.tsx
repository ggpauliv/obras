import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listarObras } from '../store';
import type { Obra } from '../store';
import { apiClient } from '../api/client';

interface DadosAnalisados {
  arquivo: string;
  fornecedor: string;
  cnpj: string | null;
  numeroCotacao: string | null;
  dataEmissao: string | null;
  prazoDias: number | null;
  valorTotal: number;
  linhas: any[];
  avisos: string[];
  salvo?: boolean;
}

const fmt = (v: number) => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? '—';
const FIELD = 'w-full rounded-lg border border-outline-variant text-body-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary py-2 px-3 bg-surface-container-lowest';

const CATEGORIAS = [
  'Estrutura', 'Alvenaria', 'Cobertura', 'Instalações Elétricas', 'Instalações Hidráulicas',
  'Acabamento', 'Pintura', 'Fundações', 'Terraplanagem', 'Serviços Gerais', 'Materiais', 'Mão de Obra',
];

export function OrcamentosUploadPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraId, setObraId] = useState('');
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [analisando, setAnalisando] = useState(false);
  const [progresso, setProgresso] = useState<Record<string, 'aguardando' | 'analisando' | 'pronto' | 'erro'>>({});
  const [resultados, setResultados] = useState<DadosAnalisados[]>([]);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [etapa, setEtapa] = useState<'upload' | 'revisao'>('upload');
  const [salvando, setSalvando] = useState<Record<string, boolean>>({});
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => { listarObras().then(setObras); }, []);

  const addArquivos = (files: FileList | null) => {
    if (!files) return;
    const novos = Array.from(files).filter(f => f.name.match(/\.(xlsx|xls|pdf)$/i));
    setArquivos(prev => [...prev, ...novos.filter(f => !prev.find(p => p.name === f.name))]);
  };

  const analisar = async () => {
    if (!obraId) { alert('Selecione uma obra'); return; }
    if (arquivos.length === 0) { alert('Selecione arquivos'); return; }

    setAnalisando(true);
    setResultados([]);
    setErros({});
    const novosResultados: DadosAnalisados[] = [];
    const novosErros: Record<string, string> = {};

    for (const arquivo of arquivos) {
      setProgresso(prev => ({ ...prev, [arquivo.name]: 'analisando' }));
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const r = new FileReader();
          r.onload = e => resolve((e.target?.result as string).split(',')[1]);
          r.onerror = reject;
          r.readAsDataURL(arquivo);
        });

        const resp = await apiClient.analisarOrcamento(base64);
        const lista: any[] = (resp.orcamentos && resp.orcamentos.length)
          ? resp.orcamentos
          : (resp.dados ? [resp.dados] : []);
        if (lista.length === 0) throw new Error('Nenhum fornecedor identificado no arquivo.');
        lista.forEach((d, i) => {
          const rotulo = lista.length > 1
            ? `${arquivo.name} — ${d.fornecedor || `Fornecedor ${i + 1}`}`
            : arquivo.name;
          novosResultados.push({ arquivo: rotulo, ...d, salvo: false });
        });
        setProgresso(prev => ({ ...prev, [arquivo.name]: 'pronto' }));
      } catch (err: any) {
        novosErros[arquivo.name] = err.message;
        setProgresso(prev => ({ ...prev, [arquivo.name]: 'erro' }));
      }
      setResultados([...novosResultados]);
      setErros({ ...novosErros });
    }

    setAnalisando(false);
    if (novosResultados.length > 0) setEtapa('revisao');
  };

  const salvarUm = async (idx: number) => {
    const d = resultados[idx];
    setSalvando(prev => ({ ...prev, [d.arquivo]: true }));
    try {
      await apiClient.salvarOrcamento(obraId, d);
      setResultados(prev => prev.map((r, i) => i === idx ? { ...r, salvo: true } : r));
    } catch (err: any) {
      alert('Erro ao salvar: ' + err.message);
    }
    setSalvando(prev => ({ ...prev, [d.arquivo]: false }));
  };

  const salvarTodos = async () => {
    for (let i = 0; i < resultados.length; i++) {
      if (!resultados[i].salvo) await salvarUm(i);
    }
  };

  // Edições na revisão (antes de salvar)
  const renomear = (idx: number, nome: string) =>
    setResultados(prev => prev.map((r, i) => i === idx ? { ...r, fornecedor: nome } : r));

  const removerCard = (idx: number) =>
    setResultados(prev => prev.filter((_, i) => i !== idx));

  // Como os itens são compartilhados, mudar a categoria de um item vale para
  // todos os fornecedores (mesmo itemNumero).
  const mudarCategoria = (itemNumero: string, categoria: string) =>
    setResultados(prev => prev.map(r => ({
      ...r,
      linhas: (r.linhas || []).map((l: any) => l.itemNumero === itemNumero ? { ...l, categoria } : l),
    })));

  const todosSalvos = resultados.length > 0 && resultados.every(r => r.salvo);

  // ---- ETAPA UPLOAD ----
  if (etapa === 'upload') return (
    <div className="flex flex-col gap-lg max-w-3xl mx-auto">
      <div>
        <h2 className="text-headline-md font-bold text-on-surface">Importar Orçamentos</h2>
        <p className="text-body-sm text-on-surface-variant mt-1">A IA analisa cada planilha e extrai fornecedor, itens e valores para revisão antes de salvar</p>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg">
        <label className="block text-label-sm text-on-surface mb-2">Obra de destino *</label>
        <select className={FIELD} value={obraId} onChange={e => setObraId(e.target.value)}>
          <option value="">Selecione a obra…</option>
          {obras.map(o => <option key={o.id} value={o.id}>{o.nome} — {o.cliente}</option>)}
        </select>
      </div>

      <div
        className={`border-2 border-dashed rounded-xl p-2xl flex flex-col items-center gap-md cursor-pointer transition-colors ${dragOver ? 'border-primary bg-primary/5' : 'border-outline-variant hover:border-primary bg-surface-container-lowest'}`}
        onDrop={e => { e.preventDefault(); setDragOver(false); addArquivos(e.dataTransfer.files); }}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => fileInputRef.current?.click()}
      >
        <span className="material-symbols-outlined text-[48px] text-outline">upload_file</span>
        <p className="text-label-lg text-on-surface font-medium">Arraste planilhas ou PDFs, ou clique para selecionar</p>
        <p className="text-body-sm text-on-surface-variant">Aceita .xlsx, .xls e .pdf — múltiplos arquivos. PDFs de equalização com vários fornecedores são separados automaticamente.</p>
        <input ref={fileInputRef} type="file" multiple accept=".xlsx,.xls,.pdf" onChange={e => addArquivos(e.target.files)} className="hidden" />
      </div>

      {arquivos.length > 0 && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg flex flex-col gap-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-label-lg font-semibold text-on-surface">{arquivos.length} arquivo(s)</h3>
            <button onClick={() => setArquivos([])} className="text-body-sm text-error hover:underline">Limpar</button>
          </div>
          {arquivos.map(f => (
            <div key={f.name} className="flex items-center justify-between py-sm px-md bg-surface-container rounded-lg">
              <div className="flex items-center gap-sm min-w-0">
                <span className="material-symbols-outlined text-outline text-[20px]">description</span>
                <span className="text-body-sm text-on-surface truncate">{f.name}</span>
              </div>
              <div className="flex items-center gap-sm">
                {progresso[f.name] === 'analisando' && <span className="text-body-sm text-primary animate-pulse">Analisando…</span>}
                {progresso[f.name] === 'pronto' && <span className="material-symbols-outlined text-emerald-600 text-[20px]">check_circle</span>}
                {progresso[f.name] === 'erro' && <span className="material-symbols-outlined text-error text-[20px]">error</span>}
                {!analisando && (
                  <button onClick={() => setArquivos(prev => prev.filter(x => x.name !== f.name))}
                    className="p-xs text-outline hover:text-error rounded">
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                )}
              </div>
            </div>
          ))}

          {Object.entries(erros).map(([nome, msg]) => (
            <p key={nome} className="text-body-sm text-error px-md">⚠️ {nome}: {msg}</p>
          ))}

          <button
            onClick={analisar}
            disabled={analisando || !obraId}
            className="mt-sm w-full py-3 rounded-lg bg-primary text-on-primary text-label-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-sm"
          >
            {analisando
              ? <><span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span> Analisando com IA…</>
              : <><span className="material-symbols-outlined text-[20px]">auto_awesome</span> Analisar {arquivos.length} planilha(s)</>
            }
          </button>
        </div>
      )}
    </div>
  );

  // ---- ETAPA REVISÃO ----
  return (
    <div className="flex flex-col gap-lg max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-headline-md font-bold text-on-surface">Revisar Orçamentos Extraídos</h2>
          <p className="text-body-sm text-on-surface-variant mt-1">Confira os dados extraídos pela IA antes de salvar no banco</p>
        </div>
        <button onClick={() => { setEtapa('upload'); setResultados([]); setProgresso({}); }}
          className="flex items-center gap-xs text-body-sm text-on-surface-variant hover:text-primary transition-colors">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span> Voltar
        </button>
      </div>

      {resultados.map((d, idx) => (
        <div key={d.arquivo} className={`bg-surface-container-lowest border rounded-xl overflow-hidden ${d.salvo ? 'border-emerald-300' : 'border-outline-variant'}`}>
          {/* Cabeçalho do card */}
          <div className={`px-lg py-md flex items-center justify-between ${d.salvo ? 'bg-emerald-50' : 'bg-surface-container-low'}`}>
            <div className="flex items-center gap-sm min-w-0 flex-1">
              {d.salvo
                ? <span className="material-symbols-outlined text-emerald-600 text-[22px]">check_circle</span>
                : <span className="material-symbols-outlined text-outline text-[22px]">description</span>
              }
              <div className="min-w-0 flex-1">
                {d.salvo ? (
                  <p className="text-label-md font-semibold text-on-surface truncate">{d.fornecedor || d.arquivo}</p>
                ) : (
                  <input
                    value={d.fornecedor || ''}
                    onChange={e => renomear(idx, e.target.value)}
                    placeholder="Nome do fornecedor/orçamento"
                    className="w-full max-w-md text-label-md font-semibold text-on-surface bg-transparent border-b border-outline-variant focus:border-primary outline-none py-0.5"
                  />
                )}
                <p className="text-body-sm text-on-surface-variant truncate">{d.salvo ? 'Salvo no banco' : `de ${d.arquivo}`}</p>
              </div>
            </div>
            {!d.salvo && (
              <div className="shrink-0 flex items-center gap-sm">
                <button
                  onClick={() => removerCard(idx)}
                  title="Remover este orçamento"
                  className="p-2 rounded-lg text-outline hover:text-error hover:bg-error-container/30 transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">delete</span>
                </button>
                <button
                  onClick={() => salvarUm(idx)}
                  disabled={salvando[d.arquivo]}
                  className="px-lg py-2 rounded-lg bg-primary text-on-primary text-label-md hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-xs"
                >
                  {salvando[d.arquivo]
                    ? <><span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span> Salvando…</>
                    : <><span className="material-symbols-outlined text-[18px]">save</span> Salvar</>
                  }
                </button>
              </div>
            )}
          </div>

          {/* Resumo */}
          <div className="px-lg py-md grid grid-cols-2 sm:grid-cols-4 gap-md border-b border-outline-variant">
            <div>
              <p className="text-label-sm text-on-surface-variant">Fornecedor</p>
              <p className="text-body-sm font-medium text-on-surface">{d.fornecedor || '—'}</p>
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant">Valor Total</p>
              <p className="text-body-sm font-bold text-primary">{fmt(d.valorTotal)}</p>
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant">Itens</p>
              <p className="text-body-sm text-on-surface">{d.linhas?.length ?? 0} linhas</p>
            </div>
            <div>
              <p className="text-label-sm text-on-surface-variant">Prazo</p>
              <p className="text-body-sm text-on-surface">{d.prazoDias ? `${d.prazoDias} dias` : '—'}</p>
            </div>
          </div>

          {/* Avisos */}
          {d.avisos?.length > 0 && (
            <div className="px-lg py-sm bg-yellow-50 border-b border-yellow-200 flex gap-sm items-start">
              <span className="material-symbols-outlined text-yellow-600 text-[18px] mt-0.5">warning</span>
              <div className="flex flex-col gap-xs">
                {d.avisos.map((a, i) => <p key={i} className="text-body-sm text-yellow-800">{a}</p>)}
              </div>
            </div>
          )}

          {/* Tabela de itens (primeiros 8) */}
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full text-left text-body-sm min-w-[640px]">
              <thead className="bg-surface-container-low border-b border-outline-variant sticky top-0 z-10">
                <tr>
                  {['Item', 'Descrição', 'Categoria', 'Qtd', 'Unit.', 'Total'].map(h => (
                    <th key={h} className="py-sm px-md text-label-sm text-on-surface-variant font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/40">
                {(d.linhas || []).map((l: any, i: number) => (
                  <tr key={i} className="hover:bg-surface-container-low/50">
                    <td className="py-xs px-md text-on-surface-variant whitespace-nowrap">{l.itemNumero}</td>
                    <td className="py-xs px-md text-on-surface max-w-xs truncate" title={l.descricao}>{l.descricao}</td>
                    <td className="py-xs px-md">
                      {d.salvo ? (
                        <span className="px-xs py-0.5 bg-primary/10 text-primary rounded text-label-sm whitespace-nowrap">{l.categoria}</span>
                      ) : (
                        <select
                          value={l.categoria || ''}
                          onChange={e => mudarCategoria(l.itemNumero, e.target.value)}
                          className="text-label-sm bg-primary/10 text-primary rounded px-xs py-0.5 border border-transparent hover:border-primary/40 focus:border-primary outline-none cursor-pointer"
                        >
                          {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      )}
                    </td>
                    <td className="py-xs px-md text-on-surface-variant text-right whitespace-nowrap">{l.quantidade}</td>
                    <td className="py-xs px-md text-on-surface-variant text-right whitespace-nowrap">{fmt(l.valorUnitario)}</td>
                    <td className="py-xs px-md font-medium text-on-surface text-right whitespace-nowrap">{fmt(l.valorTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Botões de ação globais */}
      <div className="flex gap-md justify-end">
        {!todosSalvos && (
          <button
            onClick={salvarTodos}
            disabled={Object.values(salvando).some(Boolean)}
            className="px-xl py-3 rounded-lg bg-primary text-on-primary text-label-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-sm"
          >
            <span className="material-symbols-outlined text-[20px]">save_all</span>
            Salvar todos ({resultados.filter(r => !r.salvo).length} pendentes)
          </button>
        )}
        {todosSalvos && (
          <button
            onClick={() => navigate('/orcamentos/comparativa')}
            className="px-xl py-3 rounded-lg bg-primary text-on-primary text-label-lg font-medium hover:bg-primary/90 transition-colors flex items-center gap-sm"
          >
            <span className="material-symbols-outlined text-[20px]">compare_arrows</span>
            Ver Comparativa
          </button>
        )}
      </div>
    </div>
  );
}

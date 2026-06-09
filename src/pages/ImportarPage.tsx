import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listarObras, setObraAtivaId } from '../store';
import type { Obra } from '../store';
import { apiClient } from '../api/client';

const STEPS = ['Upload', 'Processamento', 'Revisão'];

const fmt = (v: number) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const TIPO_INFO: Record<string, { label: string; icon: string; cls: string; descricao: string }> = {
  orcamento: { label: 'Orçamento de fornecedor', icon: 'request_quote', cls: 'bg-blue-100 text-blue-800', descricao: 'Vai para Orçamentos para comparar e aprovar.' },
  nfe: { label: 'NF-e (compra de material)', icon: 'receipt_long', cls: 'bg-emerald-100 text-emerald-800', descricao: 'Compra realizada — será lançada como despesa no Financeiro.' },
  nfse: { label: 'NFS-e (serviço)', icon: 'engineering', cls: 'bg-teal-100 text-teal-800', descricao: 'Serviço realizado — será lançado como despesa no Financeiro.' },
  documento: { label: 'Documento da obra', icon: 'description', cls: 'bg-amber-100 text-amber-800', descricao: 'Contrato, ART, licença, projeto… Os dados serão registrados na obra.' },
};

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-center max-w-3xl mx-auto">
      {STEPS.map((label, i) => (
        <React.Fragment key={label}>
          {i > 0 && <div className={`h-[2px] flex-grow -mt-6 ${i <= step ? 'bg-primary' : 'bg-outline-variant'}`} />}
          <div className="flex flex-col items-center flex-1">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
              i < step ? 'bg-primary-container text-on-primary-container'
                : i === step ? 'bg-primary text-on-primary'
                : 'bg-surface-container-high text-outline'}`}>
              {i < step ? <span className="material-symbols-outlined text-xl">check</span> : i + 1}
            </div>
            <span className={`text-label-md mt-2 ${i <= step ? 'text-primary font-bold' : 'text-outline'}`}>{label}</span>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

const INPUT = 'w-full px-3 py-2 border border-outline-variant rounded-lg bg-white text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary';

export default function ImportarPage() {
  const navigate = useNavigate();
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraId, setObraId] = useState('');
  const [step, setStep] = useState(0);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<any | null>(null); // { tipo, ... }

  useEffect(() => { listarObras().then(setObras); }, []);

  const aceitar = (file?: File) => {
    if (!file) return;
    if (!file.name.match(/\.(pdf|xlsx|xls|csv)$/i)) { setErro('Use PDF, XLSX, XLS ou CSV.'); return; }
    setArquivo(file); setErro(null);
  };

  const processar = async () => {
    if (!obraId) { setErro('Selecione a obra de destino.'); return; }
    if (!arquivo) { setErro('Selecione um arquivo.'); return; }
    setCarregando(true); setErro(null); setStep(1);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = e => resolve((e.target?.result as string).split(',')[1]);
        r.onerror = reject;
        r.readAsDataURL(arquivo);
      });
      const resp = await apiClient.importarInteligente(base64, obraId);
      setResultado(resp);
      setStep(2);
    } catch (e: any) {
      setErro(e?.message || 'Erro ao processar.');
      setStep(1);
    } finally {
      setCarregando(false);
    }
  };

  const recomecar = () => { setStep(0); setArquivo(null); setResultado(null); setErro(null); };

  // Edição de campos da despesa (nfe/nfse)
  const setDespesa = (campo: string, valor: any) =>
    setResultado((r: any) => ({ ...r, despesa: { ...r.despesa, [campo]: valor } }));
  const setItemDespesa = (idx: number, campo: string, valor: any) =>
    setResultado((r: any) => ({ ...r, despesa: { ...r.despesa, itens: r.despesa.itens.map((it: any, i: number) => i === idx ? { ...it, [campo]: valor } : it) } }));
  const setDoc = (campo: string, valor: any) =>
    setResultado((r: any) => ({ ...r, documento: { ...r.documento, [campo]: valor } }));

  const confirmar = async () => {
    if (!resultado || !obraId) return;
    setSalvando(true); setErro(null);
    try {
      if (resultado.tipo === 'orcamento') {
        for (const o of (resultado.orcamentos || [])) {
          await apiClient.salvarOrcamento(obraId, o);
        }
        setObraAtivaId(obraId);
        navigate(`/orcamentos/comparativa?obraId=${obraId}`);
        return;
      }
      const tipo = resultado.tipo;
      const dados = tipo === 'documento' ? resultado.documento : resultado.despesa;
      await apiClient.confirmarImportacao(obraId, tipo, dados);
      setObraAtivaId(obraId);
      navigate(tipo === 'documento' ? '/obra-detalhe' : '/obra-financeiro');
    } catch (e: any) {
      setErro(e?.message || 'Erro ao confirmar.');
    } finally {
      setSalvando(false);
    }
  };

  const info = resultado ? TIPO_INFO[resultado.tipo] || TIPO_INFO.documento : null;

  return (
    <div className="space-y-8 max-w-6xl mx-auto w-full">
      <section className="bg-surface-container-lowest rounded-2xl p-8 border border-outline-variant shadow-sm space-y-8">
        <Stepper step={step} />

        {/* Etapa 1 — Upload */}
        {step === 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-primary-container/10 border border-primary/20 p-6 rounded-xl flex gap-4">
                <span className="material-symbols-outlined text-primary text-3xl">psychology</span>
                <div>
                  <p className="text-headline-sm text-primary mb-1">Importador inteligente (IA)</p>
                  <p className="text-body-md text-on-surface-variant">Jogue qualquer documento da obra. A IA detecta o tipo (orçamento, NF-e, NFS-e ou documento) e dá o destino certo.</p>
                </div>
              </div>

              <div>
                <label className="block text-label-sm text-on-surface-variant mb-1">Obra de destino *</label>
                <select value={obraId} onChange={(e) => setObraId(e.target.value)} className={INPUT}>
                  <option value="">Selecione a obra…</option>
                  {obras.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
                </select>
              </div>

              <div
                onDrop={(e) => { e.preventDefault(); aceitar(e.dataTransfer.files?.[0]); }}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-outline-variant bg-surface-container-low rounded-2xl p-10 flex flex-col items-center text-center space-y-3 hover:border-primary transition-all cursor-pointer group relative"
              >
                <input type="file" accept=".pdf,.xlsx,.xls,.csv" onChange={(e) => aceitar(e.target.files?.[0])} className="absolute inset-0 opacity-0 cursor-pointer" />
                <div className="w-16 h-16 bg-primary-container rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-on-primary-container text-4xl">cloud_upload</span>
                </div>
                <p className="text-headline-sm text-on-surface">{arquivo ? `✓ ${arquivo.name}` : 'Arraste o documento aqui'}</p>
                {!arquivo && <p className="text-body-md text-on-surface-variant">ou clique para selecionar</p>}
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  {['PDF', 'XLSX', 'CSV'].map((f) => (
                    <span key={f} className="px-3 py-1 bg-surface-container-lowest border border-outline-variant text-label-sm text-secondary rounded-lg">{f}</span>
                  ))}
                </div>
              </div>

              {arquivo && (
                <button onClick={processar} disabled={carregando} className="w-full px-8 py-4 bg-primary text-on-primary rounded-xl shadow-lg hover:bg-primary/90 disabled:opacity-50 transition-all active:scale-95 font-bold">
                  {carregando ? 'Processando...' : 'Analisar com IA'}
                </button>
              )}
              {erro && <div className="bg-error-container/20 border border-error/20 p-4 rounded-xl"><p className="text-body-sm text-on-surface">{erro}</p></div>}
            </div>

            <div className="bg-surface-container border border-outline-variant rounded-xl p-8 shadow-sm h-full flex flex-col">
              <h3 className="text-headline-md text-on-surface mb-6">O que a IA reconhece?</h3>
              <ul className="space-y-5 flex-grow">
                {Object.values(TIPO_INFO).map((t) => (
                  <li key={t.label} className="flex items-start gap-4">
                    <span className="material-symbols-outlined text-primary text-2xl">{t.icon}</span>
                    <div>
                      <span className="block text-body-lg text-on-surface">{t.label}</span>
                      <span className="block text-body-sm text-on-surface-variant">{t.descricao}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Etapa 2 — Processamento */}
        {step === 1 && (
          <div className="max-w-2xl mx-auto text-center space-y-8 py-8">
            <div className="relative w-24 h-24 mx-auto">
              <div className="absolute inset-0 border-4 border-primary-container rounded-full" />
              <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl text-primary">auto_awesome</span>
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-headline-md text-on-surface">Processando seu arquivo</h2>
              <p className="text-body-lg text-on-surface-variant">A IA está lendo e classificando o documento.</p>
            </div>
            {erro && (
              <div className="bg-error-container/20 border border-error/20 p-6 rounded-xl">
                <p className="text-body-md text-on-surface">{erro}</p>
                <button onClick={recomecar} className="mt-4 px-6 py-2 bg-error text-on-error rounded-lg hover:bg-error/90 transition-all">Tentar novamente</button>
              </div>
            )}
          </div>
        )}

        {/* Etapa 3 — Revisão */}
        {step === 2 && resultado && info && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 flex-wrap">
              <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-label-md font-semibold ${info.cls}`}>
                <span className="material-symbols-outlined text-[18px]">{info.icon}</span>{info.label}
              </span>
              {resultado.confianca != null && (
                <span className="text-body-sm text-on-surface-variant">Confiança: {Math.round((resultado.confianca || 0) * 100)}%</span>
              )}
              <span className="text-body-sm text-on-surface-variant">— {info.descricao}</span>
            </div>

            {/* ORÇAMENTO */}
            {resultado.tipo === 'orcamento' && (
              <div className="space-y-4">
                {(resultado.orcamentos || []).map((o: any, i: number) => (
                  <div key={i} className="border border-outline-variant rounded-xl bg-white shadow-sm p-4">
                    <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                      <p className="text-headline-sm text-on-surface">{o.fornecedor}</p>
                      <span className="text-body-md font-bold text-primary">{fmt(o.valorTotal)}</span>
                    </div>
                    <p className="text-body-sm text-on-surface-variant">{(o.linhas || []).length} itens · prazo {o.prazoDias || '—'} dias</p>
                  </div>
                ))}
                <p className="text-body-sm text-on-surface-variant">Ao confirmar, os orçamentos serão salvos e você vai para a tela de Orçamentos para comparar e aprovar.</p>
              </div>
            )}

            {/* NF-e / NFS-e */}
            {(resultado.tipo === 'nfe' || resultado.tipo === 'nfse') && resultado.despesa && (
              <div className="border border-outline-variant rounded-xl bg-white shadow-sm p-4 space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div><label className="block text-label-sm text-on-surface-variant mb-1">Fornecedor</label><input className={INPUT} value={resultado.despesa.fornecedor || ''} onChange={(e) => setDespesa('fornecedor', e.target.value)} /></div>
                  <div><label className="block text-label-sm text-on-surface-variant mb-1">CNPJ</label><input className={INPUT} value={resultado.despesa.cnpj || ''} onChange={(e) => setDespesa('cnpj', e.target.value)} /></div>
                  <div><label className="block text-label-sm text-on-surface-variant mb-1">Nº da nota</label><input className={INPUT} value={resultado.despesa.numeroNota || ''} onChange={(e) => setDespesa('numeroNota', e.target.value)} /></div>
                  <div><label className="block text-label-sm text-on-surface-variant mb-1">Emissão</label><input className={INPUT} value={resultado.despesa.dataEmissao || ''} onChange={(e) => setDespesa('dataEmissao', e.target.value)} placeholder="AAAA-MM-DD" /></div>
                </div>
                <div className="border border-outline-variant rounded-lg overflow-hidden overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead><tr className="bg-surface-container border-b border-outline-variant">
                      {['Descrição', 'Categoria', 'Qtd', 'Total'].map((h) => <th key={h} className="px-3 py-2 text-label-sm text-on-surface-variant">{h}</th>)}
                    </tr></thead>
                    <tbody className="divide-y divide-outline-variant/50">
                      {(resultado.despesa.itens || []).map((it: any, idx: number) => (
                        <tr key={idx}>
                          <td className="px-3 py-2"><input className="w-full bg-transparent text-body-sm focus:outline-none" value={it.descricao || ''} onChange={(e) => setItemDespesa(idx, 'descricao', e.target.value)} /></td>
                          <td className="px-3 py-2"><input className="w-full bg-transparent text-body-sm focus:outline-none" value={it.categoria || ''} onChange={(e) => setItemDespesa(idx, 'categoria', e.target.value)} /></td>
                          <td className="px-3 py-2 text-body-sm text-on-surface-variant">{it.quantidade ?? '—'}</td>
                          <td className="px-3 py-2 text-body-sm font-medium">{fmt(it.valorTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end"><span className="text-headline-sm text-on-surface">Total: <strong className="text-primary">{fmt(resultado.despesa.valorTotal)}</strong></span></div>
              </div>
            )}

            {/* DOCUMENTO */}
            {resultado.tipo === 'documento' && resultado.documento && (
              <div className="border border-outline-variant rounded-xl bg-white shadow-sm p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="block text-label-sm text-on-surface-variant mb-1">Tipo</label><input className={INPUT} value={resultado.documento.tipoDocumento || ''} onChange={(e) => setDoc('tipoDocumento', e.target.value)} /></div>
                <div><label className="block text-label-sm text-on-surface-variant mb-1">Título</label><input className={INPUT} value={resultado.documento.titulo || ''} onChange={(e) => setDoc('titulo', e.target.value)} /></div>
                <div><label className="block text-label-sm text-on-surface-variant mb-1">Número</label><input className={INPUT} value={resultado.documento.numero || ''} onChange={(e) => setDoc('numero', e.target.value)} /></div>
                <div><label className="block text-label-sm text-on-surface-variant mb-1">Emissor</label><input className={INPUT} value={resultado.documento.emissor || ''} onChange={(e) => setDoc('emissor', e.target.value)} /></div>
                <div><label className="block text-label-sm text-on-surface-variant mb-1">Partes</label><input className={INPUT} value={resultado.documento.partes || ''} onChange={(e) => setDoc('partes', e.target.value)} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-label-sm text-on-surface-variant mb-1">Data</label><input className={INPUT} value={resultado.documento.dataDocumento || ''} onChange={(e) => setDoc('dataDocumento', e.target.value)} placeholder="AAAA-MM-DD" /></div>
                  <div><label className="block text-label-sm text-on-surface-variant mb-1">Validade</label><input className={INPUT} value={resultado.documento.dataValidade || ''} onChange={(e) => setDoc('dataValidade', e.target.value)} placeholder="AAAA-MM-DD" /></div>
                </div>
                <div className="sm:col-span-2"><label className="block text-label-sm text-on-surface-variant mb-1">Resumo</label><textarea className={INPUT} rows={3} value={resultado.documento.resumo || ''} onChange={(e) => setDoc('resumo', e.target.value)} /></div>
              </div>
            )}

            {erro && <div className="bg-error-container/20 border border-error/20 p-4 rounded-xl"><p className="text-body-sm text-on-surface">{erro}</p></div>}

            <div className="flex justify-end gap-4 pt-6 border-t border-outline-variant">
              <button onClick={recomecar} className="px-8 py-3 bg-transparent text-secondary rounded-xl border border-outline-variant hover:bg-surface-container-high transition-all">Descartar</button>
              <button onClick={confirmar} disabled={salvando} className="px-10 py-3 bg-primary text-on-primary rounded-xl shadow-lg hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center gap-3 font-bold">
                <span className="material-symbols-outlined">check_circle</span>
                {salvando ? 'Salvando...'
                  : resultado.tipo === 'orcamento' ? 'Salvar e ir para Orçamentos'
                  : resultado.tipo === 'documento' ? 'Registrar documento'
                  : 'Lançar no Financeiro'}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

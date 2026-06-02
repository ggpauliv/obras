import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { processarDocumento, DocumentExtractionResult, ExtractedPhase } from '../services/geminiDocumentProcessor';
import { OBRAS } from '../data/obras';

const STEPS = ['Upload', 'Processamento', 'Revisão'];

const CATEGORIA_INFO: Record<string, { label: string; cls: string }> = {
  compra: { label: 'Compra', cls: 'bg-blue-100 text-blue-800' },
  instalacao: { label: 'Instalação', cls: 'bg-purple-100 text-purple-800' },
  manutencao: { label: 'Manutenção', cls: 'bg-orange-100 text-orange-800' },
  servico: { label: 'Serviço', cls: 'bg-teal-100 text-teal-800' },
  etapa_obra: { label: 'Etapa de obra', cls: 'bg-green-100 text-green-800' },
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

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 text-label-md text-on-surface"
    >
      <span className={`relative w-10 h-6 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-outline-variant'}`}>
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </span>
      {label}
    </button>
  );
}

export default function ImportarPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [resultado, setResultado] = useState<DocumentExtractionResult | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [fases, setFases] = useState<ExtractedPhase[]>([]);
  const [obraId, setObraId] = useState('');
  const [faseDestino, setFaseDestino] = useState('');
  const [gerarFases, setGerarFases] = useState(true);
  const [gerarDespesa, setGerarDespesa] = useState(true);

  const obraSelecionada = OBRAS.find((o) => o.id === obraId);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setArquivo(file);
      setErro(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setArquivo(file);
      setErro(null);
    }
  };

  const processarArquivo = async () => {
    if (!arquivo) {
      setErro('Selecione um arquivo');
      return;
    }

    setCarregando(true);
    setErro(null);

    try {
      const res = await processarDocumento(arquivo);
      setResultado(res);

      if (res.sucesso) {
        setFases(res.fases);
        setStep(2); // Ir direto para revisão
      } else {
        setErro(res.erro || 'Erro ao processar documento');
        setStep(1);
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full">
      <section className="bg-surface-container-lowest rounded-2xl p-8 border border-outline-variant shadow-sm space-y-8">
        <Stepper step={step} />

        {/* Etapa 1 — Upload */}
        {step === 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-primary-container/10 border border-primary/20 p-6 rounded-xl flex gap-4">
                <span className="material-symbols-outlined text-primary text-3xl">psychology</span>
                <div>
                  <p className="text-headline-sm text-primary mb-1">Potencializado por IA (Gemini)</p>
                  <p className="text-body-md text-on-surface-variant">Nossa IA processa cronogramas e orçamentos complexos automaticamente, reduzindo em até 90% o tempo de inserção de dados manuais.</p>
                </div>
              </div>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-outline-variant bg-surface-container-low rounded-2xl p-12 flex flex-col items-center text-center space-y-4 hover:border-primary transition-all cursor-pointer group relative"
              >
                <input
                  type="file"
                  accept=".pdf,.xlsx,.docx,.csv"
                  onChange={handleFileSelect}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="w-20 h-20 bg-primary-container rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-on-primary-container text-5xl">cloud_upload</span>
                </div>
                <div className="space-y-1">
                  <p className="text-headline-md text-on-surface">
                    {arquivo ? `✓ ${arquivo.name}` : 'Arraste seu documento aqui'}
                  </p>
                  {!arquivo && (
                    <p className="text-body-lg text-on-surface-variant">Ou clique para selecionar de sua pasta</p>
                  )}
                </div>
                <div className="flex flex-wrap justify-center gap-3 pt-4">
                  {['PDF', 'XLSX', 'DOCX', 'CSV'].map((f) => (
                    <span key={f} className="px-4 py-2 bg-surface-container-lowest border border-outline-variant text-label-md text-secondary rounded-lg">{f}</span>
                  ))}
                </div>
              </div>
              {arquivo && (
                <button
                  onClick={processarArquivo}
                  disabled={carregando}
                  className="w-full px-8 py-4 bg-primary text-on-primary rounded-xl shadow-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 font-bold"
                >
                  {carregando ? 'Processando...' : 'Processar com IA'}
                </button>
              )}
              {erro && (
                <div className="bg-error-container/20 border border-error/20 p-4 rounded-xl">
                  <p className="text-body-sm text-on-surface">{erro}</p>
                </div>
              )}
            </div>
            <div className="bg-surface-container border border-outline-variant rounded-xl p-8 shadow-sm h-full flex flex-col">
              <h3 className="text-headline-md text-on-surface mb-6">O que a IA consegue extrair?</h3>
              <ul className="space-y-6 flex-grow">
                {['Cronograma físico-financeiro completo', 'Estrutura Analítica de Projeto (EAP)', 'Memorial descritivo e especificações', 'Cláusulas e prazos contratuais'].map((t) => (
                  <li key={t} className="flex items-center gap-4">
                    <span className="material-symbols-outlined text-primary text-2xl">check_circle</span>
                    <span className="text-body-lg text-on-surface">{t}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8 pt-8 border-t border-outline-variant">
                <p className="text-body-sm text-on-surface-variant">Formatos suportados: .pdf, .xlsx, .docx, .csv (Máximo 50MB)</p>
              </div>
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
              <p className="text-body-lg text-on-surface-variant">Nossa IA está lendo cada detalhe para estruturar sua obra.</p>
            </div>
            {erro && (
              <div className="bg-error-container/20 border border-error/20 p-6 rounded-xl">
                <p className="text-body-md text-on-surface">{erro}</p>
                <button
                  onClick={() => setStep(0)}
                  className="mt-4 px-6 py-2 bg-error text-on-error rounded-lg hover:bg-error/90 transition-all"
                >
                  Tentar novamente
                </button>
              </div>
            )}
          </div>
        )}

        {/* Etapa 3 — Revisão */}
        {step === 2 && resultado && (
          <div className="space-y-8">
            {resultado.sucesso ? (
              fases.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-xl flex gap-4 items-start">
                  <span className="material-symbols-outlined text-yellow-600 text-3xl">warning</span>
                  <div>
                    <p className="text-headline-sm text-yellow-800">Documento Inválido</p>
                    <p className="text-body-md text-yellow-700 mb-3">
                      Não foi possível identificar fases de construção. O documento pode não ser um cronograma ou orçamento de obra.
                    </p>
                    <p className="text-body-sm text-yellow-700 font-semibold">Formatos aceitos:</p>
                    <ul className="text-body-sm text-yellow-700 list-disc list-inside mt-2">
                      <li>Cronograma físico-financeiro</li>
                      <li>Orçamento detalhado</li>
                      <li>Estrutura Analítica de Projeto (EAP)</li>
                      <li>Documento com fases/etapas</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 p-6 rounded-xl flex gap-4 items-center">
                  <span className="material-symbols-outlined text-green-600 text-3xl">verified</span>
                  <div>
                    <p className="text-headline-sm text-green-800">Extração concluída!</p>
                    <p className="text-body-md text-green-700">
                      Identificamos {fases.length} fase{fases.length !== 1 ? 's' : ''} com sucesso.
                      Confiança geral: {resultado.metadados.confiancaGeral}%
                    </p>
                  </div>
                </div>
              )
            ) : (
              <div className="bg-error-container/20 border border-error/20 p-6 rounded-xl flex gap-4 items-center">
                <span className="material-symbols-outlined text-error text-3xl">error</span>
                <div>
                  <p className="text-headline-sm text-on-error-container">Erro no processamento</p>
                  <p className="text-body-md text-on-surface">{resultado.erro}</p>
                </div>
              </div>
            )}
            {fases.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-end px-2">
                <div>
                  <h3 className="text-headline-md text-on-surface">Fases Extraídas</h3>
                  <p className="text-body-sm text-on-surface-variant">Revise as informações abaixo antes de confirmar a importação.</p>
                </div>
                <Toggle checked={gerarFases} onChange={setGerarFases} label="Importar fases para a obra" />
              </div>

              {/* Vínculo com obra/fase (quando não identificado no documento) */}
              <div className="border border-outline-variant rounded-xl bg-surface-container-lowest p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-primary text-xl">link</span>
                  <p className="text-label-lg text-on-surface font-bold">Vincular a uma obra</p>
                  <span className="text-body-sm text-on-surface-variant">— selecione caso o documento não identifique a obra/fase</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-label-sm text-on-surface-variant mb-1">Obra de destino</label>
                    <select
                      value={obraId}
                      onChange={(e) => { setObraId(e.target.value); setFaseDestino(''); }}
                      className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-white text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    >
                      <option value="">Selecione a obra…</option>
                      {OBRAS.map((o) => (
                        <option key={o.id} value={o.id}>{o.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-label-sm text-on-surface-variant mb-1">Fase / etapa</label>
                    <input
                      list="fases-obra"
                      value={faseDestino}
                      onChange={(e) => setFaseDestino(e.target.value)}
                      disabled={!obraId}
                      placeholder={obraId ? 'Selecione ou digite a fase…' : 'Selecione a obra primeiro'}
                      className="w-full px-3 py-2 border border-outline-variant rounded-lg bg-white text-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:bg-surface-container-low disabled:cursor-not-allowed"
                    />
                    <datalist id="fases-obra">
                      {(obraSelecionada?.fases ?? []).map((nome) => (
                        <option key={nome} value={nome} />
                      ))}
                    </datalist>
                  </div>
                </div>
              </div>

              {/* Despesa da obra — extraída de nota fiscal / fatura */}
              {resultado.financeiro && (
                <div className="border border-outline-variant rounded-xl bg-white shadow-sm p-4">
                  <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-xl">request_quote</span>
                      <p className="text-label-lg text-on-surface font-bold">Despesa da obra</p>
                      <span className="text-body-sm text-on-surface-variant">— dados da nota para rastreio da despesa</span>
                    </div>
                    <Toggle checked={gerarDespesa} onChange={setGerarDespesa} label="Registrar despesa da obra" />
                  </div>
                  <div className={`transition-opacity ${gerarDespesa ? '' : 'opacity-40 pointer-events-none'}`}>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {([
                        ['Fornecedor', resultado.financeiro.fornecedor],
                        ['CNPJ', resultado.financeiro.cnpj],
                        ['Nº da nota', resultado.financeiro.numeroNota],
                        ['Série', resultado.financeiro.serie],
                        ['Natureza da operação', resultado.financeiro.naturezaOperacao],
                        ['Emissão', resultado.financeiro.dataEmissao],
                        ['Valor total', resultado.financeiro.valorTotal],
                      ] as Array<[string, string | null]>).map(([label, valor]) => (
                        <div key={label}>
                          <span className="block text-label-sm text-on-surface-variant mb-0.5">{label}</span>
                          <span className="text-body-md text-on-surface">{valor || '—'}</span>
                        </div>
                      ))}
                    </div>
                    {resultado.financeiro.chaveAcesso && (
                      <div className="mt-3">
                        <span className="block text-label-sm text-on-surface-variant mb-0.5">Chave de acesso</span>
                        <span className="text-body-sm text-on-surface font-mono break-all">{resultado.financeiro.chaveAcesso}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div className={`border border-outline-variant rounded-xl overflow-hidden bg-white shadow-sm overflow-x-auto max-h-[60vh] overflow-y-auto transition-opacity ${gerarFases ? '' : 'opacity-40 pointer-events-none'}`}>
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-surface-container border-b border-outline-variant">
                      {['#', 'Nome da Fase', 'Categoria', 'Início', 'Término', 'Orçamento', 'Confiança', 'Ações'].map((h) => (
                        <th key={h} className="px-6 py-4 text-label-md text-on-surface whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {fases.map((f) => {
                      const aviso = resultado.avisos.find((a) => a.campo === f.nome);
                      return (
                        <tr key={f.id} className={aviso ? 'bg-yellow-50/50' : ''}>
                          <td className="px-6 py-4 text-body-md text-outline">{f.id}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <input
                                className={`bg-transparent p-1 w-full text-body-md focus:ring-2 focus:ring-primary/20 rounded ${aviso ? 'border-b border-yellow-400' : 'border-none'}`}
                                defaultValue={f.nome}
                              />
                              {aviso && <span className="text-[10px] text-yellow-800 font-bold mt-1 uppercase">{aviso.mensagem}</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {f.categoria && (() => {
                              const cat = CATEGORIA_INFO[f.categoria] ?? { label: f.categoria, cls: 'bg-gray-100 text-gray-700' };
                              return (
                                <span className={`inline-block px-2 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${cat.cls}`}>
                                  {cat.label}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-6 py-4 text-body-md">{f.inicio}</td>
                          <td className="px-6 py-4 text-body-md">{f.termino}</td>
                          <td className={`px-6 py-4 text-body-md text-right ${aviso ? 'text-error font-bold' : ''}`}>{f.orc}</td>
                          <td className="px-6 py-4">
                            <div className="flex justify-center">
                              <div
                                className={`w-3 h-3 rounded-full shadow-sm ${
                                  f.confianca >= 80
                                    ? 'bg-green-500'
                                    : f.confianca >= 60
                                      ? 'bg-yellow-500'
                                      : 'bg-red-500'
                                }`}
                                title={`Confiança: ${f.confianca}%`}
                              />
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button className={`p-2 rounded-full transition-colors ${aviso ? 'text-primary hover:bg-yellow-100' : 'text-outline hover:text-primary'}`}>
                              <span className="material-symbols-outlined">{aviso ? 'warning' : 'edit'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="p-4 bg-surface-container-low text-center">
                  <span className="text-body-md text-secondary">
                    {fases.length} {fases.length === 1 ? 'item extraído' : 'itens extraídos'}
                  </span>
                </div>
              </div>
            </div>
            )}
            {resultado.avisos.length > 0 && (
              <div className="bg-error-container/20 border border-error/20 p-6 rounded-xl flex gap-4 items-start">
                <span className="material-symbols-outlined text-error text-3xl">report_problem</span>
                <div className="space-y-3">
                  <p className="text-headline-sm text-on-error-container">Atenção: Inconsistências detectadas</p>
                  {resultado.avisos.map((aviso, idx) => (
                    <p key={idx} className="text-body-md text-on-surface">
                      <strong>{aviso.campo}:</strong> {aviso.mensagem}
                    </p>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end gap-4 pt-6 border-t border-outline-variant">
              <button
                onClick={() => {
                  setStep(0);
                  setArquivo(null);
                  setResultado(null);
                  setFases([]);
                  setErro(null);
                }}
                className="px-8 py-4 bg-transparent text-secondary text-headline-sm rounded-xl border border-outline-variant hover:bg-surface-container-high transition-all active:scale-95"
              >
                Descartar e Recomeçar
              </button>
              <button
                onClick={() => {
                  if (resultado) {
                    localStorage.setItem('lastImport', JSON.stringify({
                      fases: gerarFases ? fases : [],
                      resultado,
                      financeiro: gerarDespesa ? resultado.financeiro : null,
                      vinculo: { obraId, obraNome: obraSelecionada?.nome ?? null, fase: faseDestino || null },
                      gerar: { fases: gerarFases, despesa: gerarDespesa && !!resultado.financeiro },
                    }));
                  }
                  navigate('/obra-fases');
                }}
                disabled={!resultado?.sucesso || (!gerarFases && !(gerarDespesa && !!resultado?.financeiro))}
                className="px-10 py-4 bg-primary text-on-primary text-headline-sm rounded-xl shadow-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center gap-3"
              >
                <span className="material-symbols-outlined">check_circle</span> Confirmar e Importar para Obra
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

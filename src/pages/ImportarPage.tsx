import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const STEPS = ['Upload', 'Processamento', 'Revisão'];

const FASES = [
  { id: '01', nome: 'Serviços Preliminares', inicio: '01/10/2023', termino: '15/10/2023', orc: 'R$ 15.400,00', conf: 'bg-green-500', warn: false },
  { id: '02', nome: 'Instalações Hidrossanitárias (?)', inicio: '16/10/2023', termino: '30/11/2023', orc: 'R$ 42.150,00', conf: 'bg-yellow-500', warn: true },
  { id: '03', nome: 'Infraestrutura e Lajes', inicio: '01/12/2023', termino: '15/01/2024', orc: 'R$ 89.900,00', conf: 'bg-green-500', warn: false },
];

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

export default function ImportarPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

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
                  <p className="text-headline-sm text-primary mb-1">Potencializado por IA</p>
                  <p className="text-body-md text-on-surface-variant">Nossa IA processa cronogramas e orçamentos complexos automaticamente, reduzindo em até 90% o tempo de inserção de dados manuais.</p>
                </div>
              </div>
              <div onClick={() => setStep(1)} className="border-2 border-dashed border-outline-variant bg-surface-container-low rounded-2xl p-12 flex flex-col items-center text-center space-y-4 hover:border-primary transition-all cursor-pointer group">
                <div className="w-20 h-20 bg-primary-container rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-on-primary-container text-5xl">cloud_upload</span>
                </div>
                <div className="space-y-1">
                  <p className="text-headline-md text-on-surface">Arraste seu documento aqui</p>
                  <p className="text-body-lg text-on-surface-variant">Ou clique para selecionar de sua pasta</p>
                </div>
                <div className="flex flex-wrap justify-center gap-3 pt-4">
                  {['PDF', 'XLSX', 'DOCX', 'CSV'].map((f) => (
                    <span key={f} className="px-4 py-2 bg-surface-container-lowest border border-outline-variant text-label-md text-secondary rounded-lg">{f}</span>
                  ))}
                </div>
              </div>
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
            <div className="space-y-6 text-left bg-surface-container-low p-8 rounded-xl">
              {[
                { label: 'Digitalizando OCR & Texto', status: 'Concluído', statusClass: 'text-primary font-bold', bar: 'bg-primary w-full', op: '' },
                { label: 'Classificando fases e subfases', status: 'Em progresso (75%)', statusClass: 'text-primary', bar: 'bg-primary w-3/4', op: '' },
                { label: 'Cruzando dados orçamentários', status: 'Aguardando...', statusClass: 'text-outline', bar: 'bg-outline-variant w-0', op: 'opacity-50' },
              ].map((p) => (
                <div key={p.label} className={`space-y-2 ${p.op}`}>
                  <div className="flex items-center justify-between text-label-md">
                    <span className="text-on-surface">{p.label}</span>
                    <span className={p.statusClass}>{p.status}</span>
                  </div>
                  <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden">
                    <div className={`h-full ${p.bar}`} />
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setStep(2)} className="px-8 py-3 bg-primary text-on-primary rounded-xl shadow hover:bg-primary/90 transition-all">Ver resultado da extração</button>
          </div>
        )}

        {/* Etapa 3 — Revisão */}
        {step === 2 && (
          <div className="space-y-8">
            <div className="bg-green-50 border border-green-200 p-6 rounded-xl flex gap-4 items-center">
              <span className="material-symbols-outlined text-green-600 text-3xl">verified</span>
              <div>
                <p className="text-headline-sm text-green-800">Extração concluída!</p>
                <p className="text-body-md text-green-700">Identificamos 7 fases principais e 42 sub-itens com sucesso.</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-end px-2">
                <div>
                  <h3 className="text-headline-md text-on-surface">Fases Extraídas</h3>
                  <p className="text-body-sm text-on-surface-variant">Revise as informações abaixo antes de confirmar a importação.</p>
                </div>
                <button className="px-4 py-2 text-primary hover:bg-primary-container/10 rounded-lg text-label-md flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">edit</span> Editar tudo
                </button>
              </div>
              <div className="border border-outline-variant rounded-xl overflow-hidden bg-white shadow-sm overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-surface-container border-b border-outline-variant">
                      {['#', 'Nome da Fase', 'Início', 'Término', 'Orçamento', 'Confiança', 'Ações'].map((h) => (
                        <th key={h} className="px-6 py-4 text-label-md text-on-surface whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {FASES.map((f) => (
                      <tr key={f.id} className={f.warn ? 'bg-yellow-50/50' : ''}>
                        <td className="px-6 py-4 text-body-md text-outline">{f.id}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <input className={`bg-transparent p-1 w-full text-body-md focus:ring-2 focus:ring-primary/20 rounded ${f.warn ? 'border-b border-yellow-400' : 'border-none'}`} defaultValue={f.nome} />
                            {f.warn && <span className="text-[10px] text-yellow-800 font-bold mt-1 uppercase">Divergência detectada</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-body-md">{f.inicio}</td>
                        <td className="px-6 py-4 text-body-md">{f.termino}</td>
                        <td className={`px-6 py-4 text-body-md text-right ${f.warn ? 'text-error font-bold' : ''}`}>{f.orc}</td>
                        <td className="px-6 py-4"><div className="flex justify-center"><div className={`w-3 h-3 rounded-full shadow-sm ${f.conf}`} /></div></td>
                        <td className="px-6 py-4 text-center">
                          <button className={`p-2 rounded-full transition-colors ${f.warn ? 'text-primary hover:bg-yellow-100' : 'text-outline hover:text-primary'}`}>
                            <span className="material-symbols-outlined">{f.warn ? 'warning' : 'edit'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="p-4 bg-surface-container-low text-center">
                  <button className="text-body-md text-secondary text-label-md hover:text-primary transition-colors flex items-center gap-2 mx-auto">
                    Ver mais 4 fases extraídas <span className="material-symbols-outlined">expand_more</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="bg-error-container/20 border border-error/20 p-6 rounded-xl flex gap-4 items-start">
              <span className="material-symbols-outlined text-error text-3xl">report_problem</span>
              <div>
                <p className="text-headline-sm text-on-error-container mb-1">Atenção aos valores da Fase 2</p>
                <p className="text-body-md text-on-surface">Identificamos que o valor de <strong>R$ 42.150,00</strong> na fase de 'Instalações Hidrossanitárias' não coincide com o total somado dos itens do orçamento base. Recomendamos validação manual.</p>
              </div>
            </div>
            <div className="flex justify-end gap-4 pt-6 border-t border-outline-variant">
              <button onClick={() => setStep(0)} className="px-8 py-4 bg-transparent text-secondary text-headline-sm rounded-xl border border-outline-variant hover:bg-surface-container-high transition-all active:scale-95">Descartar e Recomeçar</button>
              <button onClick={() => navigate('/obra-fases')} className="px-10 py-4 bg-primary text-on-primary text-headline-sm rounded-xl shadow-lg hover:bg-primary/90 transition-all active:scale-95 flex items-center gap-3">
                <span className="material-symbols-outlined">check_circle</span> Confirmar e Importar para Obra
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

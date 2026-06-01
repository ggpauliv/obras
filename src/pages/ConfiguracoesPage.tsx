import React, { useState } from 'react';

const MENU = ['Geral', 'Notificações', 'Regras de Negócio', 'Integrações', 'Segurança'];

const TOGGLES = [
  { titulo: 'Permitir registros retroativos', desc: 'Habilita o preenchimento de diários em datas passadas', on: false },
  { titulo: 'Exigir GPS em fotos', desc: 'Obriga a validação de geolocalização no upload de evidências', on: true },
  { titulo: 'Aprovação automática de sub-fases', desc: 'Valida etapas menores sem necessidade de revisão manual', on: false },
];

const REGRAS = [
  { tipo: 'Desvio Orçamentário', criterio: '> 5%', nivel: 'Crítico', nivelClass: 'bg-error-container text-on-error-container', acao: 'Aprovação Diretor' },
  { tipo: 'Atraso de Cronograma', criterio: '> 3 dias', nivel: 'Moderado', nivelClass: 'bg-tertiary-container text-on-tertiary-container', acao: 'Notificar GP' },
  { tipo: 'Alteração de Escopo', criterio: 'Qualquer valor', nivel: 'Informativo', nivelClass: 'bg-primary-fixed text-primary', acao: 'Documentar Aditivo' },
];

const INPUT = 'w-full border border-outline-variant rounded-lg px-4 py-2 text-body-md focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all';

function Toggle({ defaultOn }: { defaultOn: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button type="button" onClick={() => setOn((v) => !v)} className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${on ? 'bg-primary' : 'bg-outline-variant'}`}>
      <span className={`absolute top-[2px] h-5 w-5 bg-white rounded-full transition-all ${on ? 'left-[22px]' : 'left-[2px]'}`} />
    </button>
  );
}

export default function ConfiguracoesPage() {
  const [active, setActive] = useState('Geral');

  return (
    <div className="max-w-[1200px] mx-auto">
      <div className="flex flex-col lg:flex-row gap-gutter">
        {/* Menu interno */}
        <nav className="lg:w-64 shrink-0 space-y-1">
          {MENU.map((m) => (
            <button key={m} onClick={() => setActive(m)} className={`w-full text-left flex items-center gap-3 px-4 py-3 text-label-md rounded-lg transition-colors ${active === m ? 'text-primary font-bold bg-primary-fixed/30' : 'text-on-surface-variant hover:bg-surface-container-low'}`}>
              {m}
            </button>
          ))}
        </nav>

        {/* Conteúdo */}
        <div className="flex-1 space-y-lg">
          <section className="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-primary">corporate_fare</span>
              <h3 className="text-headline-sm text-on-surface">Dados da Organização</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              <div className="flex flex-col gap-xs">
                <label className="text-label-sm text-on-surface-variant">Nome da Empresa</label>
                <input className={INPUT} type="text" defaultValue="Pawliv Construções LTDA" />
              </div>
              <div className="flex flex-col gap-xs">
                <label className="text-label-sm text-on-surface-variant">CNPJ</label>
                <input className={INPUT} type="text" defaultValue="12.345.678/0001-90" />
              </div>
              <div className="flex flex-col gap-xs md:col-span-2">
                <label className="text-label-sm text-on-surface-variant">Fuso Horário</label>
                <select className={`${INPUT} appearance-none`}>
                  <option>(GMT-3) Brasília, São Paulo</option>
                  <option>(GMT-4) Manaus, La Paz</option>
                  <option>(GMT-5) Lima, Bogota</option>
                </select>
              </div>
            </div>
          </section>

          <section className="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-primary">engineering</span>
              <h3 className="text-headline-sm text-on-surface">Configurações de Obras</h3>
            </div>
            <div className="space-y-md border-b border-outline-variant pb-6 mb-6">
              {TOGGLES.map((t) => (
                <div key={t.titulo} className="flex items-center justify-between gap-md">
                  <div>
                    <p className="text-label-md text-on-surface">{t.titulo}</p>
                    <p className="text-body-sm text-on-surface-variant">{t.desc}</p>
                  </div>
                  <Toggle defaultOn={t.on} />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
              <div className="flex flex-col gap-xs">
                <label className="text-label-sm text-on-surface-variant">Tolerância de prazo (dias)</label>
                <input className={INPUT} type="number" defaultValue={3} />
              </div>
              <div className="flex flex-col gap-xs">
                <label className="text-label-sm text-on-surface-variant">Tolerância orçamentária (%)</label>
                <input className={INPUT} type="number" defaultValue={5} />
              </div>
            </div>
          </section>

          <section className="bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm overflow-hidden">
            <div className="p-lg border-b border-outline-variant flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">rule</span>
              <h3 className="text-headline-sm text-on-surface">Regras de Aprovação</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[640px]">
                <thead className="bg-surface-container-low">
                  <tr>
                    {['Tipo de Desvio', 'Critério', 'Nível de Alerta', 'Ação Requerida'].map((h) => (
                      <th key={h} className="px-6 py-4 text-label-sm text-on-surface-variant uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {REGRAS.map((r) => (
                    <tr key={r.tipo} className="hover:bg-surface-container-low transition-colors">
                      <td className="px-6 py-4 text-body-md text-on-surface">{r.tipo}</td>
                      <td className="px-6 py-4 text-body-md text-on-surface">{r.criterio}</td>
                      <td className="px-6 py-4"><span className={`px-3 py-1 text-label-sm rounded-full ${r.nivelClass}`}>{r.nivel}</span></td>
                      <td className="px-6 py-4 text-body-md text-on-surface">{r.acao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 bg-surface-container-low/50 flex justify-center">
              <button className="flex items-center gap-2 text-primary text-label-md hover:underline">
                <span className="material-symbols-outlined text-[18px]">add</span> Adicionar Nova Regra
              </button>
            </div>
          </section>

          <div className="flex justify-end pt-md">
            <button className="bg-primary text-on-primary px-8 py-3 rounded-lg text-label-md hover:opacity-90 active:scale-95 transition-all flex items-center gap-2">
              <span className="material-symbols-outlined">save</span> Salvar alterações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

type StatusKey = 'andamento' | 'atrasada' | 'planejamento' | 'concluida';

const STATUS: Record<StatusKey, { label: string; chip: string; bar: string; pctText: string }> = {
  andamento: { label: 'Em Andamento', chip: 'bg-primary-container/10 text-primary-container border-primary-container/20', bar: 'bg-primary', pctText: 'text-secondary' },
  atrasada: { label: 'Atrasada', chip: 'bg-error/10 text-error border-error/20', bar: 'bg-error', pctText: 'text-error' },
  planejamento: { label: 'Planejamento', chip: 'bg-outline-variant/30 text-on-surface-variant border-outline-variant', bar: 'bg-outline', pctText: 'text-secondary' },
  concluida: { label: 'Concluída', chip: 'bg-emerald-100 text-emerald-800 border-emerald-200', bar: 'bg-emerald-600', pctText: 'text-emerald-700' },
};

interface Obra { id: string; nome: string; cliente: string; tipo: string; inicio: string; termino: string; pct: number; status: StatusKey; }

const OBRAS: Obra[] = [
  { id: '101', nome: 'Edifício Horizonte', cliente: 'Construtora Alpha S.A.', tipo: 'Residencial', inicio: '15/01/2024', termino: '30/11/2025', pct: 35, status: 'andamento' },
  { id: '102', nome: 'Galpão Logístico Norte', cliente: 'LogisBraz Corp', tipo: 'Comercial', inicio: '05/03/2024', termino: '15/08/2024', pct: 85, status: 'andamento' },
  { id: '103', nome: 'Reforma Shopping Central', cliente: 'Malls Brasil', tipo: 'Comercial', inicio: '10/11/2023', termino: '20/12/2024', pct: 40, status: 'atrasada' },
  { id: '104', nome: 'Viaduto Ayrton Senna', cliente: 'Prefeitura Municipal', tipo: 'Infraestrutura', inicio: '01/05/2024', termino: '30/05/2026', pct: 0, status: 'planejamento' },
  { id: '099', nome: 'Condomínio Vila Verde', cliente: 'Habitar Engenharia', tipo: 'Residencial', inicio: '10/02/2022', termino: '15/12/2023', pct: 100, status: 'concluida' },
  { id: '105', nome: 'Hospital Memorial Sul', cliente: 'Grupo Saúde+', tipo: 'Comercial', inicio: '20/06/2023', termino: '20/06/2025', pct: 22, status: 'andamento' },
  { id: '106', nome: 'Escola Técnica Bandeirantes', cliente: 'Governo Estadual', tipo: 'Infraestrutura', inicio: '01/09/2023', termino: '30/08/2024', pct: 65, status: 'atrasada' },
  { id: '107', nome: 'Praça das Águas', cliente: 'Prefeitura Municipal', tipo: 'Infraestrutura', inicio: '15/07/2024', termino: '15/12/2024', pct: 0, status: 'planejamento' },
];

const SELECT = 'appearance-none pl-4 pr-10 py-2 border border-outline-variant rounded-lg bg-surface-container-lowest focus:outline-none focus:border-primary text-body-sm text-on-surface cursor-pointer';
const FIELD = 'w-full rounded-lg border-outline-variant text-body-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary py-2 px-3';

export default function ObrasPage() {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div>
      {/* Barra de ações */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-md mb-lg bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm">
        <div className="flex flex-wrap items-center gap-sm w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
            <input className="w-full pl-10 pr-4 py-2 border border-outline-variant rounded-lg bg-surface-container-lowest focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-body-sm text-on-surface placeholder:text-outline" placeholder="Buscar obras..." type="text" />
          </div>
          <div className="relative">
            <select className={SELECT}>
              <option value="">Status (Todos)</option>
              <option>Em Andamento</option>
              <option>Concluída</option>
              <option>Atrasada</option>
              <option>Em Planejamento</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[20px]">expand_more</span>
          </div>
          <div className="relative hidden lg:block">
            <select className={SELECT}>
              <option value="">Tipo (Todos)</option>
              <option>Residencial</option>
              <option>Comercial</option>
              <option>Infraestrutura</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[20px]">expand_more</span>
          </div>
        </div>
        <button onClick={() => setModalOpen(true)} className="w-full sm:w-auto flex items-center justify-center gap-xs px-lg py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm text-label-md shrink-0">
          <span className="material-symbols-outlined text-[20px]">add</span> Nova Obra
        </button>
      </div>

      {/* Tabela */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant">
                {['#', 'Nome da Obra', 'Cliente', 'Tipo', 'Início', 'Término Previsto', '% Conclusão', 'Status', 'Ações'].map((h) => (
                  <th key={h} className="py-sm px-md text-label-sm text-on-surface-variant font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-body-sm divide-y divide-outline-variant/50">
              {OBRAS.map((o, idx) => {
                const s = STATUS[o.status];
                return (
                  <tr key={o.id} className={`hover:bg-surface-container-low transition-colors group ${idx % 2 === 1 ? 'bg-surface-bright' : ''}`}>
                    <td className="py-sm px-md text-on-surface-variant text-center">{o.id}</td>
                    <td onClick={() => navigate('/obra-detalhe')} className="py-sm px-md font-medium text-on-surface group-hover:text-primary transition-colors cursor-pointer">{o.nome}</td>
                    <td className="py-sm px-md text-secondary">{o.cliente}</td>
                    <td className="py-sm px-md text-secondary">{o.tipo}</td>
                    <td className="py-sm px-md text-secondary">{o.inicio}</td>
                    <td className="py-sm px-md text-secondary">{o.termino}</td>
                    <td className="py-sm px-md">
                      <div className="flex items-center gap-sm w-full">
                        <span className={`w-8 text-right font-medium ${s.pctText}`}>{o.pct}%</span>
                        <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${o.pct}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="py-sm px-md text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-label-sm border ${s.chip}`}>{s.label}</span>
                    </td>
                    <td className="py-sm px-md text-center">
                      <button className="p-xs text-outline hover:text-primary transition-colors rounded-md hover:bg-primary-container/10"><span className="material-symbols-outlined text-[20px]">more_vert</span></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {/* Paginação */}
        <div className="bg-surface-container-low border-t border-outline-variant p-md flex items-center justify-between text-body-sm text-secondary">
          <p>Mostrando 1 a 8 de 42 obras</p>
          <div className="flex items-center gap-xs">
            <button className="p-1 rounded border border-outline-variant bg-surface text-outline opacity-50" disabled>
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <button className="w-8 h-8 rounded border border-primary bg-primary text-white flex items-center justify-center font-medium">1</button>
            <button className="w-8 h-8 rounded border border-outline-variant bg-surface hover:bg-surface-variant text-on-surface transition-colors flex items-center justify-center">2</button>
            <button className="w-8 h-8 rounded border border-outline-variant bg-surface hover:bg-surface-variant text-on-surface transition-colors flex items-center justify-center">3</button>
            <span className="px-1">...</span>
            <button className="w-8 h-8 rounded border border-outline-variant bg-surface hover:bg-surface-variant text-on-surface transition-colors flex items-center justify-center">6</button>
            <button className="p-1 rounded border border-outline-variant bg-surface hover:bg-surface-variant text-on-surface transition-colors">
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal Nova Obra */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/60 backdrop-blur-sm p-margin-mobile" onClick={() => setModalOpen(false)}>
          <div className="bg-surface-container-lowest w-full max-w-3xl rounded-xl shadow-xl flex flex-col max-h-[90vh] border border-outline-variant overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-lg py-md border-b border-outline-variant flex items-center justify-between bg-surface">
              <h3 className="text-headline-sm font-semibold text-on-surface">Nova Obra</h3>
              <button onClick={() => setModalOpen(false)} className="p-xs text-outline hover:text-error transition-colors rounded-md hover:bg-error-container/50">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-lg overflow-y-auto flex-1 bg-surface-bright space-y-lg">
              <div className="p-md rounded-lg border-2 border-dashed border-primary/40 bg-surface-container hover:border-primary transition-colors cursor-pointer" onClick={() => { setModalOpen(false); navigate('/importar'); }}>
                <div className="flex items-start gap-md">
                  <span className="material-symbols-outlined text-primary-container">auto_awesome</span>
                  <div>
                    <p className="text-label-md font-semibold text-on-surface">Importar via documento (IA)</p>
                    <p className="text-body-sm text-on-surface-variant mt-1">Anexe um cronograma, planilha orçamentária ou memorial descritivo e a IA preencherá as fases e custos automaticamente.</p>
                    <span className="inline-flex items-center gap-2 mt-sm px-3 py-1.5 rounded-md border border-outline-variant bg-surface text-label-sm text-on-surface">
                      <span className="material-symbols-outlined text-[18px]">description</span> Selecionar Arquivo
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-center text-label-sm text-outline tracking-wider">OU PREENCHA MANUALMENTE</div>

              <div className="space-y-md">
                <div>
                  <label className="block text-label-sm text-on-surface mb-1">Nome da Obra *</label>
                  <input className={FIELD} placeholder="Ex: Residencial Flores do Bosque" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                  <div>
                    <label className="block text-label-sm text-on-surface mb-1">Cliente *</label>
                    <select className={`${FIELD} appearance-none`}><option>Selecione um cliente</option></select>
                  </div>
                  <div>
                    <label className="block text-label-sm text-on-surface mb-1">Tipo de Obra</label>
                    <select className={`${FIELD} appearance-none`}><option>Selecione o tipo</option></select>
                  </div>
                  <div>
                    <label className="block text-label-sm text-on-surface mb-1">Data de Início</label>
                    <input type="date" className={FIELD} />
                  </div>
                  <div>
                    <label className="block text-label-sm text-on-surface mb-1">Término Previsto</label>
                    <input type="date" className={FIELD} />
                  </div>
                </div>
                <div>
                  <label className="block text-label-sm text-on-surface mb-1">Orçamento Estimado (R$)</label>
                  <input className={FIELD} placeholder="R$ 0,00" />
                </div>
                <div>
                  <label className="block text-label-sm text-on-surface mb-1">Endereço Completo</label>
                  <input className={FIELD} placeholder="Rua, número, bairro, cidade – UF" />
                </div>
                <div>
                  <label className="block text-label-sm text-on-surface mb-1">Engenheiro/Responsável</label>
                  <select className={`${FIELD} appearance-none`}><option>Selecione um responsável da equipe</option></select>
                </div>
              </div>
            </div>
            <div className="px-lg py-md border-t border-outline-variant flex justify-end gap-sm bg-surface">
              <button onClick={() => setModalOpen(false)} className="px-lg py-2 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-variant transition-colors text-label-md">Cancelar</button>
              <button onClick={() => setModalOpen(false)} className="px-lg py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors text-label-md">Salvar Obra</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

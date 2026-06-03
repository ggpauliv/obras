import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusKey } from '../data/obras';
import { listarObras, salvarObra, removerObra, setObraAtivaId } from '../store';
import type { Obra } from '../store';
import { brParaInput, inputParaBr } from '../utils/datas';

const STATUS: Record<StatusKey, { label: string; chip: string; bar: string; pctText: string }> = {
  andamento: { label: 'Em Andamento', chip: 'bg-primary-container/10 text-primary-container border-primary-container/20', bar: 'bg-primary', pctText: 'text-secondary' },
  atrasada: { label: 'Atrasada', chip: 'bg-error/10 text-error border-error/20', bar: 'bg-error', pctText: 'text-error' },
  planejamento: { label: 'Planejamento', chip: 'bg-outline-variant/30 text-on-surface-variant border-outline-variant', bar: 'bg-outline', pctText: 'text-secondary' },
  concluida: { label: 'Concluída', chip: 'bg-emerald-100 text-emerald-800 border-emerald-200', bar: 'bg-emerald-600', pctText: 'text-emerald-700' },
};

const SELECT = 'appearance-none pl-4 pr-10 py-2 border border-outline-variant rounded-lg bg-surface-container-lowest focus:outline-none focus:border-primary text-body-sm text-on-surface cursor-pointer';
const FIELD = 'w-full rounded-lg border border-outline-variant text-body-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary py-2 px-3';

const VAZIA: Obra = { id: '', nome: '', cliente: '', tipo: 'Residencial', inicio: '', termino: '', pct: 0, status: 'planejamento' };

export default function ObrasPage() {
  const navigate = useNavigate();
  const [obras, setObras] = useState<Obra[]>(() => listarObras());
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Obra>(VAZIA);
  const [menuId, setMenuId] = useState<string | null>(null);

  const recarregar = () => setObras(listarObras());

  const abrirObra = (id: string) => {
    setObraAtivaId(id);
    navigate('/obra-detalhe');
  };

  const novaObra = () => { setForm(VAZIA); setModalOpen(true); };
  const editarObra = (o: Obra) => { setForm(o); setModalOpen(true); setMenuId(null); };

  const excluirObra = (id: string) => {
    if (window.confirm('Excluir esta obra? Esta ação não pode ser desfeita.')) {
      removerObra(id);
      recarregar();
    }
    setMenuId(null);
  };

  const salvar = () => {
    if (!form.nome.trim() || !form.cliente.trim()) {
      window.alert('Preencha pelo menos Nome e Cliente.');
      return;
    }
    salvarObra({ ...form, pct: Number(form.pct) || 0 });
    recarregar();
    setModalOpen(false);
  };

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return obras.filter((o) => {
      const okBusca = !q || o.nome.toLowerCase().includes(q) || o.cliente.toLowerCase().includes(q);
      const okStatus = !filtroStatus || o.status === filtroStatus;
      const okTipo = !filtroTipo || o.tipo === filtroTipo;
      return okBusca && okStatus && okTipo;
    });
  }, [obras, busca, filtroStatus, filtroTipo]);

  const set = (campo: keyof Obra, valor: string | number) => setForm((f) => ({ ...f, [campo]: valor }));

  return (
    <div>
      {/* Barra de ações */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-md mb-lg bg-surface-container-lowest p-md rounded-xl border border-outline-variant shadow-sm">
        <div className="flex flex-wrap items-center gap-sm w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
            <input value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-outline-variant rounded-lg bg-surface-container-lowest focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-body-sm text-on-surface placeholder:text-outline" placeholder="Buscar obras..." type="text" />
          </div>
          <div className="relative">
            <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className={SELECT}>
              <option value="">Status (Todos)</option>
              <option value="andamento">Em Andamento</option>
              <option value="concluida">Concluída</option>
              <option value="atrasada">Atrasada</option>
              <option value="planejamento">Planejamento</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[20px]">expand_more</span>
          </div>
          <div className="relative hidden lg:block">
            <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className={SELECT}>
              <option value="">Tipo (Todos)</option>
              <option value="Residencial">Residencial</option>
              <option value="Comercial">Comercial</option>
              <option value="Infraestrutura">Infraestrutura</option>
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[20px]">expand_more</span>
          </div>
        </div>
        <button onClick={novaObra} className="w-full sm:w-auto flex items-center justify-center gap-xs px-lg py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-sm text-label-md shrink-0">
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
              {filtradas.length === 0 && (
                <tr><td colSpan={9} className="py-xl px-md text-center text-on-surface-variant">Nenhuma obra encontrada.</td></tr>
              )}
              {filtradas.map((o, idx) => {
                const s = STATUS[o.status];
                return (
                  <tr key={o.id} className={`hover:bg-surface-container-low transition-colors group ${idx % 2 === 1 ? 'bg-surface-bright' : ''}`}>
                    <td className="py-sm px-md text-on-surface-variant text-center">{o.id}</td>
                    <td onClick={() => abrirObra(o.id)} className="py-sm px-md font-medium text-on-surface group-hover:text-primary transition-colors cursor-pointer">{o.nome}</td>
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
                    <td className="py-sm px-md text-center relative">
                      <button onClick={() => setMenuId(menuId === o.id ? null : o.id)} className="p-xs text-outline hover:text-primary transition-colors rounded-md hover:bg-primary-container/10"><span className="material-symbols-outlined text-[20px]">more_vert</span></button>
                      {menuId === o.id && (
                        <div className="absolute right-8 top-2 z-20 bg-surface border border-outline-variant rounded-lg shadow-lg py-1 w-40 text-left">
                          <button onClick={() => abrirObra(o.id)} className="w-full px-md py-2 text-body-sm text-on-surface hover:bg-surface-container-low flex items-center gap-sm"><span className="material-symbols-outlined text-[18px]">visibility</span> Abrir</button>
                          <button onClick={() => editarObra(o)} className="w-full px-md py-2 text-body-sm text-on-surface hover:bg-surface-container-low flex items-center gap-sm"><span className="material-symbols-outlined text-[18px]">edit</span> Editar</button>
                          <button onClick={() => excluirObra(o.id)} className="w-full px-md py-2 text-body-sm text-error hover:bg-error-container/30 flex items-center gap-sm"><span className="material-symbols-outlined text-[18px]">delete</span> Excluir</button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="bg-surface-container-low border-t border-outline-variant p-md flex items-center justify-between text-body-sm text-secondary">
          <p>Mostrando {filtradas.length} de {obras.length} obras</p>
        </div>
      </div>

      {/* Modal Nova/Editar Obra */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/60 backdrop-blur-sm p-margin-mobile" onClick={() => setModalOpen(false)}>
          <div className="bg-surface-container-lowest w-full max-w-3xl rounded-xl shadow-xl flex flex-col max-h-[90vh] border border-outline-variant overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-lg py-md border-b border-outline-variant flex items-center justify-between bg-surface">
              <h3 className="text-headline-sm font-semibold text-on-surface">{form.id ? 'Editar Obra' : 'Nova Obra'}</h3>
              <button onClick={() => setModalOpen(false)} className="p-xs text-outline hover:text-error transition-colors rounded-md hover:bg-error-container/50">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-lg overflow-y-auto flex-1 bg-surface-bright space-y-lg">
              {!form.id && (
                <div className="p-md rounded-lg border-2 border-dashed border-primary/40 bg-surface-container hover:border-primary transition-colors cursor-pointer" onClick={() => { setModalOpen(false); navigate('/importar'); }}>
                  <div className="flex items-start gap-md">
                    <span className="material-symbols-outlined text-primary-container">auto_awesome</span>
                    <div>
                      <p className="text-label-md font-semibold text-on-surface">Importar via documento (IA)</p>
                      <p className="text-body-sm text-on-surface-variant mt-1">Anexe um cronograma, planilha orçamentária ou memorial descritivo e a IA preencherá as fases e custos automaticamente.</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-md">
                <div>
                  <label className="block text-label-sm text-on-surface mb-1">Nome da Obra *</label>
                  <input className={FIELD} value={form.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Ex: Residencial Flores do Bosque" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                  <div>
                    <label className="block text-label-sm text-on-surface mb-1">Cliente *</label>
                    <input className={FIELD} value={form.cliente} onChange={(e) => set('cliente', e.target.value)} placeholder="Nome do cliente" />
                  </div>
                  <div>
                    <label className="block text-label-sm text-on-surface mb-1">Tipo de Obra</label>
                    <select className={`${FIELD} appearance-none`} value={form.tipo} onChange={(e) => set('tipo', e.target.value)}>
                      <option>Residencial</option>
                      <option>Comercial</option>
                      <option>Infraestrutura</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-label-sm text-on-surface mb-1">Data de Início</label>
                    <input type="date" className={FIELD} value={brParaInput(form.inicio)} onChange={(e) => set('inicio', inputParaBr(e.target.value))} />
                  </div>
                  <div>
                    <label className="block text-label-sm text-on-surface mb-1">Término Previsto</label>
                    <input type="date" className={FIELD} value={brParaInput(form.termino)} onChange={(e) => set('termino', inputParaBr(e.target.value))} />
                  </div>
                  <div>
                    <label className="block text-label-sm text-on-surface mb-1">Status</label>
                    <select className={`${FIELD} appearance-none`} value={form.status} onChange={(e) => set('status', e.target.value as StatusKey)}>
                      <option value="planejamento">Planejamento</option>
                      <option value="andamento">Em Andamento</option>
                      <option value="atrasada">Atrasada</option>
                      <option value="concluida">Concluída</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-label-sm text-on-surface mb-1">% Conclusão</label>
                    <input type="number" min={0} max={100} className={FIELD} value={form.pct} onChange={(e) => set('pct', Number(e.target.value))} />
                  </div>
                </div>
              </div>
            </div>
            <div className="px-lg py-md border-t border-outline-variant flex justify-end gap-sm bg-surface">
              <button onClick={() => setModalOpen(false)} className="px-lg py-2 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-variant transition-colors text-label-md">Cancelar</button>
              <button onClick={salvar} className="px-lg py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors text-label-md">Salvar Obra</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

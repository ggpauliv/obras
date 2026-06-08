import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { useAuth } from '../auth/AuthContext';

const FIELD = 'w-full rounded-lg border border-outline-variant text-body-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary py-2 px-3';

export default function EmpresasPage() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<any>({ id: '', nome: '', cnpj: '', ativo: true });
  const [ativa, setAtiva] = useState<string>(localStorage.getItem('pawliv.empresaAtiva') || '');

  const recarregar = () => apiClient.listarEmpresas().then(setEmpresas).catch(() => setEmpresas([]));
  useEffect(() => { recarregar(); }, []);

  if (!usuario?.isSuper) {
    return <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg text-center text-on-surface-variant">Acesso restrito ao super-administrador.</div>;
  }

  const trocarAtiva = (id: string) => {
    setAtiva(id);
    localStorage.setItem('pawliv.empresaAtiva', id);
    window.location.reload(); // recarrega tudo no contexto da empresa escolhida
  };

  const novo = () => { setForm({ id: '', nome: '', cnpj: '', ativo: true }); setModalOpen(true); };
  const editar = (e: any) => { setForm({ ...e }); setModalOpen(true); };
  const salvar = async () => {
    if (!form.nome.trim()) { alert('Informe o nome da empresa.'); return; }
    try {
      if (form.id) await apiClient.atualizarEmpresa(form.id, form);
      else await apiClient.criarEmpresa(form);
      await recarregar();
      setModalOpen(false);
    } catch (err: any) { alert('Erro: ' + err.message); }
  };

  return (
    <div className="space-y-lg">
      <div className="flex items-center justify-between flex-wrap gap-md">
        <div>
          <h2 className="text-headline-md font-bold text-on-surface">Empresas</h2>
          <p className="text-body-sm text-on-surface-variant mt-1">Cadastre empresas (clientes) e escolha em qual contexto trabalhar.</p>
        </div>
        <button onClick={novo} className="flex items-center gap-xs px-lg py-2 bg-primary text-white rounded-lg hover:bg-primary/90 text-label-md">
          <span className="material-symbols-outlined text-[20px]">add</span> Nova Empresa
        </button>
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low border-b border-outline-variant">
              {['Empresa', 'CNPJ', 'Status', 'Contexto', 'Ações'].map((h) => (
                <th key={h} className="py-sm px-md text-label-sm text-on-surface-variant font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="text-body-sm divide-y divide-outline-variant/50">
            {empresas.length === 0 && <tr><td colSpan={5} className="py-xl px-md text-center text-on-surface-variant">Nenhuma empresa cadastrada.</td></tr>}
            {empresas.map((e) => (
              <tr key={e.id} className={`hover:bg-surface-container-low transition-colors ${ativa === e.id ? 'bg-primary/5' : ''}`}>
                <td className="py-sm px-md font-medium text-on-surface">{e.nome}</td>
                <td className="py-sm px-md text-secondary">{e.cnpj || '—'}</td>
                <td className="py-sm px-md">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-label-sm ${e.ativo ? 'bg-success/10 text-success' : 'bg-outline-variant/30 text-on-surface-variant'}`}>{e.ativo ? 'Ativa' : 'Inativa'}</span>
                </td>
                <td className="py-sm px-md">
                  {ativa === e.id
                    ? <span className="inline-flex items-center gap-1 text-primary text-label-sm font-semibold"><span className="material-symbols-outlined text-[16px]">check_circle</span> Empresa ativa</span>
                    : <button onClick={() => trocarAtiva(e.id)} className="text-primary hover:underline text-label-sm">Entrar nesta empresa</button>}
                </td>
                <td className="py-sm px-md">
                  <button onClick={() => editar(e)} className="p-xs text-outline hover:text-primary" title="Editar"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                  <button onClick={() => { localStorage.setItem('pawliv.empresaAtiva', e.id); setAtiva(e.id); navigate('/usuarios'); }} className="p-xs text-outline hover:text-primary" title="Gerenciar usuários desta empresa"><span className="material-symbols-outlined text-[18px]">group</span></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-body-sm text-on-surface-variant">
        Dica: "Entrar nesta empresa" define o contexto — todas as telas (obras, orçamentos, usuários…) passam a mostrar os dados dessa empresa. Para cadastrar usuários de uma empresa, entre nela e vá em <strong>Usuários</strong>.
      </p>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/60 backdrop-blur-sm p-4" onClick={() => setModalOpen(false)}>
          <div className="bg-surface-container-lowest w-full max-w-md rounded-xl shadow-xl border border-outline-variant overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-lg py-md border-b border-outline-variant flex items-center justify-between bg-surface">
              <h3 className="text-headline-sm font-semibold text-on-surface">{form.id ? 'Editar Empresa' : 'Nova Empresa'}</h3>
              <button onClick={() => setModalOpen(false)} className="p-xs text-outline hover:text-error"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-lg space-y-md bg-surface-bright">
              <div>
                <label className="block text-label-sm text-on-surface mb-1">Nome *</label>
                <input className={FIELD} value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Construtora XYZ" />
              </div>
              <div>
                <label className="block text-label-sm text-on-surface mb-1">CNPJ</label>
                <input className={FIELD} value={form.cnpj || ''} onChange={e => setForm({ ...form, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
              </div>
              {form.id && (
                <label className="flex items-center gap-sm text-body-sm text-on-surface">
                  <input type="checkbox" checked={form.ativo} onChange={e => setForm({ ...form, ativo: e.target.checked })} /> Empresa ativa
                </label>
              )}
            </div>
            <div className="px-lg py-md border-t border-outline-variant flex justify-end gap-sm bg-surface">
              <button onClick={() => setModalOpen(false)} className="px-lg py-2 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-variant text-label-md">Cancelar</button>
              <button onClick={salvar} className="px-lg py-2 rounded-lg bg-primary text-white hover:bg-primary/90 text-label-md">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

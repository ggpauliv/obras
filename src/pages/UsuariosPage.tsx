import React, { useEffect, useMemo, useState } from 'react';
import { listarUsuarios, salvarUsuario, removerUsuario } from '../store';
import type { Usuario } from '../store';
import type { Papel } from '../auth/users';
import { useAuth } from '../auth/AuthContext';
import { apiClient } from '../api/client';

const ROLE_CHIP: Record<Papel, string> = {
  Admin: 'bg-gray-200 text-gray-800',
  Engenheiro: 'bg-blue-100 text-blue-800',
  Gestor: 'bg-purple-100 text-purple-800',
  Diretor: 'bg-orange-100 text-orange-800',
  Cliente: 'bg-green-100 text-green-800',
};

const ROLE_DESC: Record<Papel, string> = {
  Admin: 'Admin: Controle total do sistema, usuários e configurações globais.',
  Engenheiro: 'Engenheiro: Acesso técnico às obras e registros de progresso.',
  Gestor: 'Gestor: Supervisão financeira e administrativa de múltiplos projetos.',
  Diretor: 'Diretor: Visão estratégica e relatórios consolidados de alta governança.',
  Cliente: 'Cliente: Acesso restrito para acompanhamento visual do cronograma.',
};

const PAPEIS = Object.keys(ROLE_CHIP) as Papel[];
const FIELD = 'w-full px-md py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-body-sm';

function iniciais(nome: string): string {
  return nome.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';
}

const VAZIO: Usuario = { nome: '', email: '', senha: '', papel: 'Engenheiro', ativo: true };

export default function UsuariosPage() {
  const { usuario: logado } = useAuth();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroPapel, setFiltroPapel] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState<Usuario>(VAZIO);
  const [menuKey, setMenuKey] = useState<string | null>(null);

  const [empresaNome, setEmpresaNome] = useState('');
  const recarregar = () => listarUsuarios().then(setUsuarios);
  useEffect(() => {
    recarregar();
    const ativa = localStorage.getItem('pawliv.empresaAtiva');
    apiClient.listarEmpresas().then((es) => {
      const e = es.find((x: any) => x.id === ativa) || es[0];
      setEmpresaNome(e?.nome || '');
    }).catch(() => {});
  }, []);

  const novo = () => { setForm(VAZIO); setEditando(false); setModalOpen(true); };
  const editar = (u: Usuario) => { setForm({ ...u, senha: '' }); setEditando(true); setModalOpen(true); setMenuKey(null); };
  const excluir = async (u: Usuario) => {
    setMenuKey(null);
    if (u.email === logado?.email) { window.alert('Você não pode excluir o usuário com o qual está logado.'); return; }
    if (!window.confirm(`Excluir o usuário "${u.nome}"?`)) return;
    try { await removerUsuario(u.id!); await recarregar(); }
    catch (e) { window.alert('Erro ao excluir: ' + (e instanceof Error ? e.message : 'desconhecido')); }
  };
  const salvar = async () => {
    if (!form.nome.trim() || !form.email.trim()) { window.alert('Informe nome e login (e-mail).'); return; }
    if (!editando && !form.senha?.trim()) { window.alert('Defina uma senha para o novo usuário.'); return; }
    try {
      await salvarUsuario(form);
      await recarregar();
      setModalOpen(false);
    } catch (e) {
      window.alert('Erro ao salvar: ' + (e instanceof Error ? e.message : 'desconhecido'));
    }
  };
  const set = (campo: keyof Usuario, valor: string | boolean) => setForm((f) => ({ ...f, [campo]: valor }));

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return usuarios.filter((u) => {
      const okBusca = !q || u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const okPapel = !filtroPapel || u.papel === filtroPapel;
      const okStatus = !filtroStatus || (filtroStatus === 'ativo' ? u.ativo : !u.ativo);
      return okBusca && okPapel && okStatus;
    });
  }, [usuarios, busca, filtroPapel, filtroStatus]);

  return (
    <div className="space-y-lg">
      <div>
        <h2 className="text-headline-md font-bold text-on-surface">Usuários{empresaNome ? ` · ${empresaNome}` : ''}</h2>
        <p className="text-body-sm text-on-surface-variant mt-1">
          Usuários desta empresa.{logado?.isSuper ? ' Para outra empresa, troque o contexto em Empresas.' : ''}
        </p>
      </div>

      {/* Filtros e ações */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-md bg-white p-md rounded-lg border border-outline-variant shadow-sm">
        <div className="flex flex-1 items-center gap-sm max-w-2xl flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
            <input value={busca} onChange={(e) => setBusca(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-body-sm" placeholder="Buscar por nome, e-mail ou login..." type="text" />
          </div>
          <select value={filtroPapel} onChange={(e) => setFiltroPapel(e.target.value)} className="border border-outline-variant rounded-lg px-3 py-2 text-body-sm outline-none focus:ring-primary focus:border-primary">
            <option value="">Todos Papéis</option>
            {PAPEIS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className="border border-outline-variant rounded-lg px-3 py-2 text-body-sm outline-none focus:ring-primary focus:border-primary">
            <option value="">Status: Todos</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
        </div>
        <button onClick={novo} className="flex items-center gap-sm bg-primary-container text-on-primary px-lg py-2 rounded-lg text-label-md hover:bg-primary transition-all active:scale-95">
          <span className="material-symbols-outlined">person_add</span> Novo Usuário
        </button>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg border border-outline-variant shadow-sm">
        <div>
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-container-low">
              <tr className="border-b border-outline-variant">
                {['Nome', 'Login (e-mail)', 'Papel', 'Status', 'Ações'].map((h) => (
                  <th key={h} className="px-lg py-md text-label-sm text-on-surface-variant uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filtrados.length === 0 && (
                <tr><td colSpan={5} className="py-xl px-lg text-center text-on-surface-variant">Nenhum usuário encontrado.</td></tr>
              )}
              {filtrados.map((u) => (
                <tr key={u.id} className="group">
                  <td className="px-lg py-md">
                    <div className="flex items-center gap-sm">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-surface-container-highest text-primary">{iniciais(u.nome)}</div>
                      <span className="text-label-md text-on-surface">{u.nome}</span>
                    </div>
                  </td>
                  <td className="px-lg py-md text-body-sm text-on-surface-variant">{u.email}</td>
                  <td className="px-lg py-md">
                    <span className={`px-sm py-xs rounded text-[11px] font-bold uppercase ${ROLE_CHIP[u.papel]}`}>{u.papel}</span>
                    {u.isSuper && <span className="ml-1 px-sm py-xs rounded text-[11px] font-bold uppercase bg-amber-100 text-amber-700">Super</span>}
                  </td>
                  <td className="px-lg py-md">
                    {u.ativo ? (
                      <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2 py-0.5 rounded-full text-[11px] font-bold"><span className="w-1.5 h-1.5 rounded-full bg-green-600" /> Ativo</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-0.5 rounded-full text-[11px] font-bold"><span className="w-1.5 h-1.5 rounded-full bg-red-600" /> Inativo</span>
                    )}
                  </td>
                  <td className="px-lg py-md relative">
                    <button onClick={() => setMenuKey(menuKey === u.id ? null : u.id!)} className="text-outline hover:text-primary transition-colors"><span className="material-symbols-outlined">more_vert</span></button>
                    {menuKey === u.id && (
                      <div className="absolute right-8 top-2 z-20 bg-surface border border-outline-variant rounded-lg shadow-lg py-1 w-36 text-left">
                        <button onClick={() => editar(u)} className="w-full px-md py-2 text-body-sm text-on-surface hover:bg-surface-container-low flex items-center gap-sm"><span className="material-symbols-outlined text-[18px]">edit</span> Editar</button>
                        <button onClick={() => excluir(u)} className="w-full px-md py-2 text-body-sm text-error hover:bg-error-container/30 flex items-center gap-sm"><span className="material-symbols-outlined text-[18px]">delete</span> Excluir</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-lg py-md border-t border-outline-variant bg-surface-container-low">
          <p className="text-body-sm text-on-surface-variant">Mostrando {filtrados.length} de {usuarios.length} usuários registrados</p>
        </div>
      </div>

      {/* Modal Novo/Editar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-inverse-surface/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden relative">
            <div className="px-lg py-md border-b border-outline-variant flex justify-between items-center bg-white">
              <h3 className="text-headline-sm text-primary">{editando ? 'Editar Usuário' : 'Novo Usuário'}</h3>
              <button onClick={() => setModalOpen(false)} className="p-sm hover:bg-surface-container-low rounded-full"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-lg space-y-md">
              <div className="space-y-base">
                <label className="text-label-md text-on-surface-variant">Nome completo *</label>
                <input className={FIELD} value={form.nome} onChange={(e) => set('nome', e.target.value)} placeholder="Ex: Roberto Almeida" type="text" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                <div className="space-y-base">
                  <label className="text-label-md text-on-surface-variant">Login (e-mail) *</label>
                  <input className={FIELD} value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="nome@empresa.com.br" type="text" />
                </div>
                <div className="space-y-base">
                  <label className="text-label-md text-on-surface-variant">{editando ? 'Senha (em branco = manter)' : 'Senha *'}</label>
                  <input className={FIELD} value={form.senha || ''} onChange={(e) => set('senha', e.target.value)} type="password" placeholder="••••••" />
                </div>
              </div>
              <div className="space-y-base">
                <label className="text-label-md text-on-surface-variant">Papel</label>
                <select value={form.papel} onChange={(e) => set('papel', e.target.value as Papel)} className={`${FIELD} bg-white`}>
                  {PAPEIS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <p className="text-body-sm text-primary-container bg-primary-fixed/30 p-sm rounded border border-primary-fixed leading-tight">{ROLE_DESC[form.papel]}</p>
              </div>
              <div className="flex items-center gap-sm pt-sm">
                <input checked={form.ativo} onChange={(e) => set('ativo', e.target.checked)} className="w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant" id="ativo" type="checkbox" />
                <label className="text-body-sm text-on-surface" htmlFor="ativo">Usuário ativo (pode acessar o sistema)</label>
              </div>
              {logado?.isSuper && (
                <div className="flex items-center gap-sm">
                  <input checked={!!form.isSuper} onChange={(e) => set('isSuper', e.target.checked)} className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-outline-variant" id="super" type="checkbox" />
                  <label className="text-body-sm text-on-surface" htmlFor="super">Super-admin (acesso geral: cria empresas e gerencia tudo)</label>
                </div>
              )}
            </div>
            <div className="px-lg py-md border-t border-outline-variant bg-surface-container-low flex justify-end gap-md">
              <button onClick={() => setModalOpen(false)} className="px-lg py-2 rounded-lg text-label-md text-primary hover:bg-primary/10 transition-colors">Cancelar</button>
              <button onClick={salvar} className="bg-primary-container text-on-primary px-lg py-2 rounded-lg text-label-md hover:bg-primary transition-all active:scale-95 shadow-md">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

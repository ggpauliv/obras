import React, { useState } from 'react';

interface User { initials: string; avatar: string; nome: string; email: string; papel: keyof typeof ROLE_CHIP; obras: string; acesso: string; ativo: boolean; }

const ROLE_CHIP = {
  Admin: 'bg-gray-200 text-gray-800',
  Engenheiro: 'bg-blue-100 text-blue-800',
  Gestor: 'bg-purple-100 text-purple-800',
  Diretor: 'bg-orange-100 text-orange-800',
  Cliente: 'bg-green-100 text-green-800',
};

const ROLE_DESC: Record<string, string> = {
  Admin: 'Admin: Controle total do sistema, usuários e configurações globais.',
  Engenheiro: 'Engenheiro: Acesso técnico às obras e registros de progresso.',
  Gestor: 'Gestor: Supervisão financeira e administrativa de múltiplos projetos.',
  Diretor: 'Diretor: Visão estratégica e relatórios consolidados de alta governança.',
  Cliente: 'Cliente: Acesso restrito para acompanhamento visual do cronograma.',
};

const USERS: User[] = [
  { initials: 'JS', avatar: 'bg-surface-container-highest text-primary', nome: 'João Silva', email: 'joao.silva@pawliv.com.br', papel: 'Admin', obras: 'Todas', acesso: 'Hoje, 10:45', ativo: true },
  { initials: 'MO', avatar: 'bg-primary-fixed text-primary', nome: 'Maria Oliveira', email: 'm.oliveira@constru.com', papel: 'Engenheiro', obras: 'Edifício Horizon, Vila Olimpia', acesso: 'Ontem, 16:20', ativo: true },
  { initials: 'CS', avatar: 'bg-purple-100 text-purple-800', nome: 'Carlos Santos', email: 'carlos.gestor@pawliv.com.br', papel: 'Gestor', obras: 'Condomínio Solar, Pq das Flores', acesso: '02/10/2023', ativo: true },
  { initials: 'AS', avatar: 'bg-orange-100 text-orange-800', nome: 'Ana Souza', email: 'ana.diretoria@invest.com', papel: 'Diretor', obras: 'Todas', acesso: '28/09/2023', ativo: true },
  { initials: 'PL', avatar: 'bg-on-tertiary-container text-on-tertiary-fixed-variant', nome: 'Pedro Lima', email: 'pedro.cliente@gmail.com', papel: 'Cliente', obras: 'Edifício Horizon', acesso: '15/09/2023', ativo: false },
];

const FIELD = 'w-full px-md py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-body-sm';

export default function UsuariosPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [role, setRole] = useState('Engenheiro');

  return (
    <div className="space-y-lg">
      {/* Filtros e ações */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-md bg-white p-md rounded-lg border border-outline-variant shadow-sm">
        <div className="flex flex-1 items-center gap-sm max-w-2xl flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
            <input className="w-full pl-10 pr-4 py-2 border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none text-body-sm" placeholder="Buscar por nome ou e-mail..." type="text" />
          </div>
          <select className="border border-outline-variant rounded-lg px-3 py-2 text-body-sm outline-none focus:ring-primary focus:border-primary">
            <option value="">Todos Papéis</option>
            {Object.keys(ROLE_CHIP).map((r) => <option key={r}>{r}</option>)}
          </select>
          <select className="border border-outline-variant rounded-lg px-3 py-2 text-body-sm outline-none focus:ring-primary focus:border-primary">
            <option value="">Status: Todos</option>
            <option>Ativo</option>
            <option>Inativo</option>
          </select>
        </div>
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-sm bg-primary-container text-on-primary px-lg py-2 rounded-lg text-label-md hover:bg-primary transition-all active:scale-95">
          <span className="material-symbols-outlined">person_add</span> Convidar Usuário
        </button>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg border border-outline-variant shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-surface-container-low">
              <tr className="border-b border-outline-variant">
                {['Avatar / Nome', 'E-mail', 'Papel', 'Obras com Acesso', 'Último Acesso', 'Status', 'Ações'].map((h) => (
                  <th key={h} className="px-lg py-md text-label-sm text-on-surface-variant uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {USERS.map((u) => (
                <tr key={u.email} className="group">
                  <td className="px-lg py-md">
                    <div className="flex items-center gap-sm">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${u.avatar}`}>{u.initials}</div>
                      <span className="text-label-md text-on-surface">{u.nome}</span>
                    </div>
                  </td>
                  <td className="px-lg py-md text-body-sm text-on-surface-variant">{u.email}</td>
                  <td className="px-lg py-md"><span className={`px-sm py-xs rounded text-[11px] font-bold uppercase ${ROLE_CHIP[u.papel]}`}>{u.papel}</span></td>
                  <td className="px-lg py-md text-body-sm text-on-surface-variant">{u.obras}</td>
                  <td className="px-lg py-md text-body-sm text-on-surface-variant">{u.acesso}</td>
                  <td className="px-lg py-md">
                    {u.ativo ? (
                      <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2 py-0.5 rounded-full text-[11px] font-bold"><span className="w-1.5 h-1.5 rounded-full bg-green-600" /> Ativo</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-700 bg-red-50 px-2 py-0.5 rounded-full text-[11px] font-bold"><span className="w-1.5 h-1.5 rounded-full bg-red-600" /> Inativo</span>
                    )}
                  </td>
                  <td className="px-lg py-md"><button className="text-outline hover:text-primary transition-colors"><span className="material-symbols-outlined">more_vert</span></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-lg py-md border-t border-outline-variant bg-surface-container-low flex justify-between items-center">
          <p className="text-body-sm text-on-surface-variant">Mostrando 5 de 5 usuários registrados</p>
          <div className="flex gap-sm">
            <button className="p-xs border border-outline-variant rounded opacity-30" disabled><span className="material-symbols-outlined text-[20px]">chevron_left</span></button>
            <button className="p-xs border border-outline-variant rounded bg-white text-label-md text-primary px-3">1</button>
            <button className="p-xs border border-outline-variant rounded opacity-30" disabled><span className="material-symbols-outlined text-[20px]">chevron_right</span></button>
          </div>
        </div>
      </div>

      {/* Modal convidar */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-inverse-surface/60 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden relative">
            <div className="px-lg py-md border-b border-outline-variant flex justify-between items-center bg-white">
              <h3 className="text-headline-sm text-primary">Convidar Novo Usuário</h3>
              <button onClick={() => setModalOpen(false)} className="p-sm hover:bg-surface-container-low rounded-full"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-lg space-y-md">
              <div className="space-y-base">
                <label className="text-label-md text-on-surface-variant">Nome completo</label>
                <input className={FIELD} placeholder="Ex: Roberto Almeida" type="text" />
              </div>
              <div className="space-y-base">
                <label className="text-label-md text-on-surface-variant">E-mail institucional</label>
                <input className={FIELD} placeholder="nome@empresa.com.br" type="email" />
              </div>
              <div className="space-y-base">
                <label className="text-label-md text-on-surface-variant">Papel</label>
                <select value={role} onChange={(e) => setRole(e.target.value)} className={`${FIELD} bg-white`}>
                  {Object.keys(ROLE_CHIP).map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <p className="text-body-sm text-primary-container bg-primary-fixed/30 p-sm rounded border border-primary-fixed leading-tight">{ROLE_DESC[role]}</p>
              </div>
              <div className="space-y-base">
                <label className="text-label-md text-on-surface-variant">Obras com Acesso</label>
                <div className="flex flex-wrap gap-xs p-2 border border-outline-variant rounded-lg min-h-[42px] items-center bg-white">
                  {['Edifício Horizon', 'Vila Olimpia', 'Condomínio Solar'].map((o) => (
                    <span key={o} className="flex items-center gap-1 bg-surface-container-highest px-2 py-0.5 rounded text-[12px] font-bold text-primary">{o} <span className="material-symbols-outlined text-[14px] cursor-pointer">close</span></span>
                  ))}
                  <input className="border-none focus:ring-0 text-body-sm flex-1 bg-transparent py-0" placeholder="Adicionar obra..." type="text" />
                </div>
              </div>
              <div className="flex items-center gap-sm pt-sm">
                <input defaultChecked className="w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant" id="welcome-email" type="checkbox" />
                <label className="text-body-sm text-on-surface" htmlFor="welcome-email">Enviar e-mail de boas-vindas com instruções de acesso</label>
              </div>
            </div>
            <div className="px-lg py-md border-t border-outline-variant bg-surface-container-low flex justify-end gap-md">
              <button onClick={() => setModalOpen(false)} className="px-lg py-2 rounded-lg text-label-md text-primary hover:bg-primary/10 transition-colors">Cancelar</button>
              <button onClick={() => setModalOpen(false)} className="bg-primary-container text-on-primary px-lg py-2 rounded-lg text-label-md hover:bg-primary transition-all active:scale-95 shadow-md">Enviar Convite</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

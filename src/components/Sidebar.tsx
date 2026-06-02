import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { NAV_ITEMS, SETTINGS_ITEM, NavItem } from '../config/nav';
import { useAuth } from '../auth/AuthContext';

const baseItem =
  'flex items-center gap-md px-md py-sm rounded-lg transition-all duration-200 cursor-pointer font-label-md text-label-md';

function itemClass(isActive: boolean) {
  return isActive
    ? `${baseItem} bg-white/10 text-white font-bold`
    : `${baseItem} text-white/70 hover:text-white hover:bg-white/5`;
}

function SidebarLink({ item, onClose }: { item: NavItem; onClose: () => void }) {
  if (item.disabled) {
    return (
      <span className={`${baseItem} text-white/30 cursor-not-allowed`} title="Em breve">
        <span className="material-symbols-outlined">{item.icon}</span>
        <span>{item.label}</span>
      </span>
    );
  }
  return (
    <NavLink to={item.route} onClick={onClose} className={({ isActive }) => itemClass(isActive)}>
      <span className="material-symbols-outlined">{item.icon}</span>
      <span>{item.label}</span>
    </NavLink>
  );
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  return (
    <nav
      className={`fixed left-0 top-0 h-screen w-[280px] bg-[#0E3D6B] shadow-md py-xl px-md z-40 flex flex-col transform transition-transform duration-200 md:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Marca */}
      <div className="flex items-center justify-between gap-sm mb-xl px-sm">
        <div className="flex items-center gap-sm">
          <span className="material-symbols-outlined text-white text-3xl" data-weight="fill">domain</span>
          <div>
            <h1 className="text-headline-sm font-bold text-white tracking-tight leading-tight">PAWLIV OBRAS</h1>
            <p className="text-label-sm text-white/60">Gestão de Obras</p>
          </div>
        </div>
        {/* Fechar (apenas mobile) */}
        <button onClick={onClose} className="md:hidden text-white/70 hover:text-white p-1">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {/* Navegação */}
      <div className="flex-1 overflow-y-auto space-y-sm mt-md">
        {NAV_ITEMS.map((item) => (
          <SidebarLink key={item.label} item={item} onClose={onClose} />
        ))}
      </div>

      {/* Rodapé: configurações + sair */}
      <div className="mt-auto pt-md border-t border-white/10 space-y-sm">
        <SidebarLink item={SETTINGS_ITEM} onClose={onClose} />
        <button
          onClick={() => { logout(); onClose(); navigate('/login'); }}
          className={`${baseItem} w-full text-white/70 hover:text-white hover:bg-white/5`}
        >
          <span className="material-symbols-outlined">logout</span>
          <span>Sair</span>
        </button>
      </div>
    </nav>
  );
}

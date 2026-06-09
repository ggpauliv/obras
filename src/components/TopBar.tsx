import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ROUTE_META } from '../config/nav';
import { useAuth } from '../auth/AuthContext';
import { getObraAtivaId, obterObra } from '../store';

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
}

export default function TopBar({ onMenu }: { onMenu: () => void }) {
  const { pathname } = useLocation();
  const meta = ROUTE_META[pathname] || { title: '', breadcrumb: [] };
  const { usuario } = useAuth();

  // Substitui o placeholder "Edifício Horizonte" pelo nome real da obra ativa.
  const [obraNome, setObraNome] = useState('');
  useEffect(() => {
    const id = getObraAtivaId();
    if (id) obterObra(id).then((o) => setObraNome(o?.nome || '')).catch(() => setObraNome(''));
    else setObraNome('');
  }, [pathname]);
  const breadcrumb = meta.breadcrumb.map((c) => (c === 'Edifício Horizonte' && obraNome ? obraNome : c));
  const titulo = meta.title === 'Edifício Horizonte' && obraNome ? obraNome : meta.title;

  return (
    <header className="flex items-center justify-between px-margin-mobile md:px-margin-desktop w-full h-16 bg-surface border-b border-outline-variant sticky top-0 z-10">
      <div className="flex items-center gap-sm min-w-0">
        <button onClick={onMenu} className="md:hidden text-on-surface-variant hover:bg-surface-container-low rounded-full p-2 -ml-1 shrink-0">
          <span className="material-symbols-outlined">menu</span>
        </button>
        <div className="flex flex-col min-w-0">
        <span className="text-label-sm text-outline flex items-center gap-1">
          {breadcrumb.map((crumb, i) => (
            <React.Fragment key={crumb + i}>
              {i > 0 && (
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              )}
              {crumb}
            </React.Fragment>
          ))}
        </span>
          <h2 className="text-headline-sm font-bold text-primary truncate">{titulo}</h2>
        </div>
      </div>

      <div className="flex items-center gap-md shrink-0">
        <button className="p-2 rounded-full text-on-surface-variant hover:bg-primary-container/10 transition-colors">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="p-2 rounded-full text-on-surface-variant hover:bg-primary-container/10 transition-colors">
          <span className="material-symbols-outlined">help</span>
        </button>
        {usuario && (
          <div className="hidden sm:flex flex-col items-end leading-tight">
            <span className="text-label-md text-on-surface font-medium">{usuario.nome}</span>
            <span className="text-label-sm text-outline">{usuario.papel}</span>
          </div>
        )}
        <div className="h-8 w-8 rounded-full bg-primary-container flex items-center justify-center overflow-hidden border border-outline-variant cursor-pointer" title={usuario?.nome}>
          {usuario ? (
            <span className="text-label-md text-on-primary font-bold">{iniciais(usuario.nome)}</span>
          ) : (
            <span className="material-symbols-outlined text-on-surface-variant text-xl">person</span>
          )}
        </div>
      </div>
    </header>
  );
}

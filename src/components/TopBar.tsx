import React from 'react';
import { useLocation } from 'react-router-dom';
import { ROUTE_META } from '../config/nav';

export default function TopBar({ onMenu }: { onMenu: () => void }) {
  const { pathname } = useLocation();
  const meta = ROUTE_META[pathname] || { title: '', breadcrumb: [] };

  return (
    <header className="flex items-center justify-between px-margin-mobile md:px-margin-desktop w-full h-16 bg-surface border-b border-outline-variant sticky top-0 z-10">
      <div className="flex items-center gap-sm min-w-0">
        <button onClick={onMenu} className="md:hidden text-on-surface-variant hover:bg-surface-container-low rounded-full p-2 -ml-1 shrink-0">
          <span className="material-symbols-outlined">menu</span>
        </button>
        <div className="flex flex-col min-w-0">
        <span className="text-label-sm text-outline flex items-center gap-1">
          {meta.breadcrumb.map((crumb, i) => (
            <React.Fragment key={crumb + i}>
              {i > 0 && (
                <span className="material-symbols-outlined text-[14px]">chevron_right</span>
              )}
              {crumb}
            </React.Fragment>
          ))}
        </span>
          <h2 className="text-headline-sm font-bold text-primary truncate">{meta.title}</h2>
        </div>
      </div>

      <div className="flex items-center gap-md shrink-0">
        <button className="p-2 rounded-full text-on-surface-variant hover:bg-primary-container/10 transition-colors">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="p-2 rounded-full text-on-surface-variant hover:bg-primary-container/10 transition-colors">
          <span className="material-symbols-outlined">help</span>
        </button>
        <div className="h-8 w-8 rounded-full bg-surface-variant flex items-center justify-center overflow-hidden border border-outline-variant cursor-pointer">
          <span className="material-symbols-outlined text-on-surface-variant text-xl">person</span>
        </div>
      </div>
    </header>
  );
}

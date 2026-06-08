import React from 'react';
import { NavLink } from 'react-router-dom';

const TABS = [
  { label: 'Visão Geral', route: '/obra-detalhe', icon: 'space_dashboard' },
  { label: 'Fases', route: '/obra-fases', icon: 'layers' },
  { label: 'Financeiro', route: '/obra-financeiro', icon: 'payments' },
  { label: 'Fotos', route: '/obra-fotos', icon: 'photo_camera' },
  { label: 'Ocorrências', route: '/obra-ocorrencias', icon: 'event_note' },
  { label: 'Auditoria', route: '/obra-auditoria', icon: 'fact_check' },
];

export default function ObraTabs() {
  return (
    <div className="border-b border-outline-variant flex gap-lg text-label-md overflow-x-auto">
      {TABS.map((t) => (
        <NavLink
          key={t.route}
          to={t.route}
          className={({ isActive }) =>
            `pb-sm px-xs transition-colors flex items-center gap-2 whitespace-nowrap ${
              isActive
                ? 'text-primary font-bold border-b-2 border-primary'
                : 'text-on-surface-variant hover:text-on-surface'
            }`
          }
        >
          <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
          {t.label}
        </NavLink>
      ))}
    </div>
  );
}

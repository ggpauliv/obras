import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Fecha a gaveta ao trocar de rota
  React.useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="h-screen overflow-hidden bg-[#F3F4F6] text-on-surface">
      <Sidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* Backdrop (apenas mobile, quando a gaveta está aberta) */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <div className="flex flex-col h-screen md:ml-[280px]">
        <TopBar onMenu={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-margin-mobile md:p-margin-desktop bg-[#F3F4F6]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import ObraTabs from '../components/ObraTabs';

interface Foto { src: string; data: string; fase: string; resp: string; verified?: boolean; id: string; }

const FOTOS: Foto[] = [
  { id: 'PH-892', src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAcV_nH9j9KslNi_94gf82WX8rgF6TOnrUG31VP-HUUV8aVQVM_adyu8UVtKWA7XtuuLdayKspGzJUQWtua1S7bSEzBZ7KmSZD3vYAUIlU3xJNeWYuY3i8InH50PaQkXY_n_KX4zyzbDpAZysbqVhqoF3Io7d9BkouOcdQo09cANcQJp5AuW7b7kA3CEs_swSrwwxh9h5yjlqrNhyNudMGHsufJe_6_VCg9yc73EsuED3_lWWJoMX2QYGO2PzpCK4HR1NN4-_0tgqs', data: '15/05/2024', fase: 'Laje 4º Andar', resp: 'Eng. Carlos Motta', verified: true },
  { id: 'PH-887', src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDe8kn7CY1MbgzvboOsMA2J3DB7iBFvFFUdinLn5_ELA61md5VIeH1T2vZ20jxuoTJpbzR45EsvBFk2ngI-s6V00SFvOz2Vgf9nKfEvr6dv6WAbqfixZB4SEkj1XS_OObrXhP2b8jGYbTgyBPAL7JUiR0JW_VR9FSTWXJFKKgR9CTv9PNSDSbM1VO5fVbduU6DBETeSKymucJvAen5O7GIyaYzM2rNgKl9HoABy89JYDkyv0zVyurh7TjtuWNeZKIlUq_1GHFxge8M', data: '12/05/2024', fase: 'Estrutura Metálica', resp: 'Eng. Ricardo' },
  { id: 'PH-880', src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA0SFi_ZJdBUfeAVJlfttOkbXbi6dqQiXoaOSUkA1mru-c2y2GLWFvf8Jkso3NoJAeJClTYK7NK6LQpwApDjJgLWkAWdytKqIaorKrpQoQU_6Zm7U_rMRNjhaS8JJ1AONpww5Kfr4elJ7BTcA5zCwEl1X3sanuyRATdZpMwf1J7pKa8Mi4jFz95W0xJ2v8UJTK2dOYjVgw47dZMCsPKCtbf7gkzuH8vTQkIUNaxvmgFVVVNlw3kwSkcGvnDMOHAUzMY0Ceyd44n_vc', data: '10/05/2024', fase: 'Alvenaria', resp: 'Eng. Ricardo' },
  { id: 'PH-875', src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBA4bmkQUNuobF1pDo--Rz_8ko0Q-HV-u4TBOgbwN3s2RPhNPjRflbdS9DDS43w4__GZ6O_eQShuhliZvccFvGlg9dLVMCy10graWyFALeOFFTYjjiOhLfmodeU1oC9Smq6RznCJAqH-omtcK-ND6oenctXY2-zZ7lheuXi7_JiUmGbhMR3fmHO035K8Hlf-LdkQeowVCtN4XquhOnEKqf2wn5c_mH2hte-JA4hg-kOedMDBSn_wvvUottCvTdgEc1SWv92uyXZ4ks', data: '08/05/2024', fase: 'Fachada', resp: 'Eng. Ana Clara' },
];

const INPUT = 'py-2 pl-3 pr-8 bg-surface border border-outline-variant rounded-md text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container focus:outline-none text-on-surface-variant';

export default function ObraFotosPage() {
  const [sel, setSel] = useState<Foto | null>(null);

  return (
    <div className="space-y-xl max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="bg-primary-container text-on-primary rounded-xl p-lg md:p-xl shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-lg">
        <div className="absolute -right-20 -top-20 opacity-10 pointer-events-none"><span className="material-symbols-outlined text-[300px]">domain</span></div>
        <div className="z-10">
          <div className="flex items-center gap-sm mb-2">
            <span className="text-label-sm uppercase tracking-wider text-on-primary-container">Projeto Residencial</span>
            <span className="w-1 h-1 rounded-full bg-on-primary-container" />
            <span className="text-label-sm text-on-primary-container">Cod: PJ-2023-42</span>
          </div>
          <h1 className="text-display-lg-mobile md:text-display-lg text-on-primary mb-1">Edifício Horizonte — Torre A</h1>
          <p className="text-body-md text-inverse-primary max-w-2xl">Gestão visual e auditoria técnica da fase estrutural.</p>
        </div>
        <div className="z-10 flex flex-col items-end gap-sm">
          <div className="bg-[#16A34A]/20 text-[#4ADE80] text-label-md px-3 py-1 rounded border border-[#16A34A]/30 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse" /> Em Andamento
          </div>
          <div className="text-right">
            <span className="text-label-sm text-on-primary-container block">Progresso Geral</span>
            <span className="text-headline-md text-on-primary font-bold block">42%</span>
          </div>
        </div>
      </div>

      <ObraTabs />

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
        <div className="flex flex-wrap items-center gap-sm w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
            <input className="w-full pl-10 pr-3 py-2 bg-surface border border-outline-variant rounded-md text-body-sm focus:border-primary-container focus:ring-1 focus:ring-primary-container focus:outline-none placeholder:text-outline text-on-surface" placeholder="Buscar fotos por título ou tag..." type="text" />
          </div>
          <select className={`${INPUT} appearance-none`}>
            <option value="">Fase: Todas</option><option>Fundação</option><option>Alvenaria</option><option>Acabamento</option>
          </select>
          <input className={INPUT} type="date" />
          <select className={`${INPUT} appearance-none`}>
            <option value="">Responsável: Todos</option><option>Eng. Ricardo</option><option>Eng. Carlos Motta</option>
          </select>
        </div>
        <button className="w-full md:w-auto bg-primary-container text-white px-4 py-2 rounded-md text-label-md hover:bg-tertiary-container transition-colors flex items-center justify-center gap-2 shadow-sm whitespace-nowrap">
          <span className="material-symbols-outlined text-[20px]">add_a_photo</span> Adicionar Fotos
        </button>
      </div>

      {/* Galeria */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-md">
        {FOTOS.map((f, i) => (
          <div key={f.id} onClick={() => setSel(f)} className={`group relative rounded-lg overflow-hidden border border-outline-variant bg-surface cursor-pointer aspect-[4/3] ${i === 0 ? 'ring-2 ring-primary-container ring-offset-2' : ''}`}>
            <img alt={f.fase} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" src={f.src} />
            {f.verified && (
              <div className="absolute top-2 right-2 bg-surface/90 backdrop-blur-sm p-1 rounded-full border border-outline-variant/50 shadow-sm flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/90 via-inverse-surface/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-sm">
              <div className="text-on-primary">
                <p className="text-label-sm flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">calendar_today</span> {f.data}</p>
                <p className="text-label-sm flex items-center gap-1 mt-1"><span className="material-symbols-outlined text-[14px]">layers</span> Fase: {f.fase}</p>
                <p className="text-label-sm flex items-center gap-1 mt-1"><span className="material-symbols-outlined text-[14px]">person</span> {f.resp}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal viewer */}
      {sel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-lg">
          <div className="absolute inset-0 bg-inverse-surface/80 backdrop-blur-sm" onClick={() => setSel(null)} />
          <div className="relative w-full max-w-[1200px] h-[80vh] bg-surface rounded-xl shadow-2xl flex flex-col lg:flex-row overflow-hidden border border-outline-variant z-10">
            <button onClick={() => setSel(null)} className="absolute top-4 right-4 z-20 p-2 bg-surface/50 hover:bg-surface rounded-full text-on-surface-variant hover:text-on-surface transition-colors border border-outline-variant/30 shadow-sm backdrop-blur-md">
              <span className="material-symbols-outlined">close</span>
            </button>
            <div className="flex-1 bg-[#1A1A1A] relative flex items-center justify-center overflow-hidden">
              <img alt={sel.fase} className="max-w-full max-h-full object-contain" src={sel.src} />
            </div>
            <div className="w-full lg:w-[400px] bg-surface border-l border-outline-variant flex flex-col h-full overflow-y-auto shrink-0">
              <div className="p-md border-b border-outline-variant bg-surface-container-lowest">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-primary-container/10 text-primary px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border border-primary-container/20">Registro Fotográfico</span>
                  <span className="text-on-surface-variant text-label-sm">ID: {sel.id}</span>
                </div>
                <h2 className="text-headline-sm text-on-surface font-semibold">Foto #{sel.id} - {sel.fase}</h2>
              </div>
              <div className="p-md space-y-md">
                {sel.verified && (
                  <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg p-sm flex items-start gap-3">
                    <div className="bg-[#DCFCE7] p-1.5 rounded-full mt-0.5"><span className="material-symbols-outlined text-[#16A34A] text-[20px]">verified_user</span></div>
                    <div>
                      <p className="text-label-md text-[#166534] font-semibold">Validada via Blockchain</p>
                      <p className="text-body-sm text-[#15803D] mt-0.5">Integridade do arquivo confirmada. O registro não foi alterado desde a captura.</p>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-sm">
                  {[['Data', sel.data], ['Fase', sel.fase], ['Responsável', sel.resp], ['ID', sel.id]].map(([k, v]) => (
                    <div key={k} className="bg-surface-container-low rounded-lg p-sm">
                      <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">{k}</p>
                      <p className="text-body-md text-on-surface mt-1">{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

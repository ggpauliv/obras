import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ObraHeader from '../components/ObraHeader';
import { getObraAtivaId } from '../store';
import { apiClient } from '../api/client';

const TIPO_LABEL: Record<string, { label: string; cls: string }> = {
  contrato: { label: 'Contrato', cls: 'bg-blue-100 text-blue-800' },
  art: { label: 'ART/RRT', cls: 'bg-purple-100 text-purple-800' },
  alvara: { label: 'Alvará', cls: 'bg-emerald-100 text-emerald-800' },
  licenca: { label: 'Licença', cls: 'bg-teal-100 text-teal-800' },
  projeto: { label: 'Projeto', cls: 'bg-indigo-100 text-indigo-800' },
  memorial: { label: 'Memorial', cls: 'bg-amber-100 text-amber-800' },
  laudo: { label: 'Laudo', cls: 'bg-orange-100 text-orange-800' },
  outro: { label: 'Outro', cls: 'bg-surface-container-high text-on-surface-variant' },
};

const fmtData = (d?: string) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');
const fmtValor = (v: any) => (v != null && v !== '' ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—');

export default function ObraDocumentosPage() {
  const navigate = useNavigate();
  const obraId = getObraAtivaId();
  const [docs, setDocs] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = () => {
    setCarregando(true);
    apiClient.listarDocumentos(obraId).then(setDocs).catch(() => setDocs([])).finally(() => setCarregando(false));
  };
  useEffect(recarregar, [obraId]);

  const excluir = async (id: string) => {
    if (!window.confirm('Excluir este documento?')) return;
    try { await apiClient.deletarDocumento(id); recarregar(); }
    catch (e: any) { window.alert('Erro: ' + (e?.message || 'desconhecido')); }
  };

  return (
    <div className="flex flex-col gap-lg">
      <ObraHeader />

      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm">
        <div className="flex items-center justify-between px-lg py-md border-b border-outline-variant flex-wrap gap-sm">
          <h3 className="text-headline-sm font-bold text-on-surface">
            Documentos da Obra <span className="text-label-sm text-on-surface-variant font-normal">({docs.length})</span>
          </h3>
          <button onClick={() => navigate('/importar')} className="flex items-center gap-xs px-lg py-2 bg-primary text-white rounded-lg hover:bg-primary/90 text-label-md">
            <span className="material-symbols-outlined text-[20px]">auto_awesome</span> Importar documento (IA)
          </button>
        </div>

        {carregando ? (
          <div className="py-xl text-center text-on-surface-variant">Carregando…</div>
        ) : docs.length === 0 ? (
          <div className="py-xl text-center text-on-surface-variant">
            Nenhum documento registrado. Use <strong>Importar (IA)</strong> para extrair contratos, ART, licenças, projetos…
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/50">
            {docs.map((d) => {
              const t = TIPO_LABEL[d.tipoDocumento] || TIPO_LABEL.outro;
              return (
                <div key={d.id} className="px-lg py-md flex items-start justify-between gap-md">
                  <div className="min-w-0">
                    <div className="flex items-center gap-sm flex-wrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-label-sm ${t.cls}`}>{t.label}</span>
                      <span className="text-body-md font-medium text-on-surface">{d.titulo || 'Documento'}</span>
                      {d.numero && <span className="text-body-sm text-on-surface-variant">nº {d.numero}</span>}
                    </div>
                    {d.resumo && <p className="text-body-sm text-on-surface-variant mt-1">{d.resumo}</p>}
                    <div className="flex flex-wrap gap-x-lg gap-y-1 mt-2 text-label-sm text-on-surface-variant">
                      {d.emissor && <span><strong>Emissor:</strong> {d.emissor}</span>}
                      {d.partes && <span><strong>Partes:</strong> {d.partes}</span>}
                      <span><strong>Data:</strong> {fmtData(d.dataDocumento)}</span>
                      {d.dataValidade && <span><strong>Validade:</strong> {fmtData(d.dataValidade)}</span>}
                      {d.valor != null && d.valor !== '' && <span><strong>Valor:</strong> {fmtValor(d.valor)}</span>}
                    </div>
                  </div>
                  <button onClick={() => excluir(d.id)} title="Excluir" className="p-xs text-outline hover:text-error shrink-0">
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

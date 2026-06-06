import React, { useEffect, useState, useMemo } from 'react';
import { listarObras } from '../store';
import type { Obra } from '../store';
import { apiClient } from '../api/client';
import { OrcamentoAprovacaoCard } from '../components/OrcamentoAprovacaoCard';

const TIPOS_ORCAMENTO = [
  'Obra Geral',
  'Terraplanagem',
  'Fundações',
  'Estrutura',
  'Cobertura',
  'Alvenaria',
  'Instalações Elétricas',
  'Instalações Hidráulicas',
  'Acabamento',
  'Pintura',
  'Serviços Gerais',
];

export function OrcamentosAprovacaoPage() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [obraId, setObraId] = useState('');
  const [orcamentos, setOrcamentos] = useState<any[]>([]);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [removendo, setRemovendo] = useState(false);

  useEffect(() => {
    listarObras().then(setObras);
  }, []);

  useEffect(() => {
    if (!obraId) {
      setOrcamentos([]);
      return;
    }
    setCarregando(true);
    apiClient.listarOrcamentos(obraId)
      .then(data => {
        const pendentes = data.filter((o: any) => o.status === 'ativo');
        setOrcamentos(pendentes);
      })
      .catch(() => setOrcamentos([]))
      .finally(() => setCarregando(false));
  }, [obraId]);

  const tipos = useMemo(() => {
    const set = new Set<string>();
    orcamentos.forEach((o: any) => {
      if (o.tipo_orcamento) set.add(o.tipo_orcamento);
    });
    return Array.from(set).sort();
  }, [orcamentos]);

  const filtrados = useMemo(() => {
    if (!filtroTipo) return orcamentos;
    return orcamentos.filter((o: any) => o.tipo_orcamento === filtroTipo);
  }, [orcamentos, filtroTipo]);

  const handleAprovado = async (orcamentoId: string, tipoOrcamento: string) => {
    try {
      const res = await apiClient.aprovarOrcamento(orcamentoId, tipoOrcamento);
      setToastMsg(res.mensagem || 'Orçamento aprovado com sucesso!');
      setTimeout(() => setToastMsg(''), 4000);

      // Remover do estado
      setOrcamentos(prev => prev.filter(o => o.id !== orcamentoId));
      setSelecionados(prev => { const s = new Set(prev); s.delete(orcamentoId); return s; });
    } catch (err: any) {
      setToastMsg(`Erro: ${err.message}`);
      setTimeout(() => setToastMsg(''), 4000);
    }
  };

  const toggleSelecionado = (id: string) => {
    setSelecionados(prev => {
      const novo = new Set(prev);
      novo.has(id) ? novo.delete(id) : novo.add(id);
      return novo;
    });
  };

  const toggleTodosSelecionados = () => {
    if (selecionados.size === filtrados.length && filtrados.length > 0) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(filtrados.map(o => o.id)));
    }
  };

  const handleRemoverSelecionados = async () => {
    if (selecionados.size === 0) return;

    const nomes = filtrados
      .filter(o => selecionados.has(o.id))
      .map(o => o.nome || 'Sem nome')
      .join(', ');

    if (!window.confirm(`Remover ${selecionados.size} orçamento(s)?\n\n${nomes}\n\nEsta ação não pode ser desfeita.`)) {
      return;
    }

    setRemovendo(true);
    try {
      let removidos = 0;
      let erros = 0;

      for (const id of Array.from(selecionados)) {
        try {
          await apiClient.deletarOrcamento(id);
          removidos++;
          setOrcamentos(prev => prev.filter(o => o.id !== id));
        } catch (err) {
          erros++;
          console.error('Erro ao remover:', err);
        }
      }

      setSelecionados(new Set());
      const msg = erros > 0
        ? `${removidos} removido(s), ${erros} erro(s)`
        : `${removidos} orçamento(s) removido(s) com sucesso`;
      setToastMsg(msg);
      setTimeout(() => setToastMsg(''), 4000);
    } finally {
      setRemovendo(false);
    }
  };

  const FIELD = 'w-full rounded-lg border border-outline-variant text-body-sm text-on-surface focus:border-primary py-2 px-3 bg-surface-container-lowest';

  return (
    <div className="flex flex-col gap-lg">
      {/* Header */}
      <div>
        <h2 className="text-headline-md font-bold text-on-surface">Aprovação de Orçamentos</h2>
        <p className="text-body-sm text-on-surface-variant mt-1">Analise e aprove orçamentos individuais para gerar despesas e fases automaticamente</p>
      </div>

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-lg right-lg z-50 px-lg py-sm bg-primary text-on-primary rounded-lg shadow-lg text-label-md animate-pulse">
          {toastMsg}
        </div>
      )}

      {/* Filtros */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-lg flex flex-wrap gap-lg items-end">
        <div className="flex-1 min-w-[220px]">
          <label className="block text-label-sm text-on-surface mb-1">Obra</label>
          <select className={FIELD} value={obraId} onChange={e => setObraId(e.target.value)}>
            <option value="">Selecione a obra…</option>
            {obras.map(o => <option key={o.id} value={o.id}>{o.nome} — {o.cliente}</option>)}
          </select>
        </div>

        {tipos.length > 0 && (
          <div className="flex-1 min-w-[220px]">
            <label className="block text-label-sm text-on-surface mb-1">Filtrar por tipo</label>
            <select className={FIELD} value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
              <option value="">Todos ({orcamentos.length})</option>
              {tipos.map(t => {
                const qtd = orcamentos.filter((o: any) => o.tipo_orcamento === t).length;
                return <option key={t} value={t}>{t} ({qtd})</option>;
              })}
            </select>
          </div>
        )}
      </div>

      {/* Estado vazio */}
      {!obraId && (
        <div className="flex flex-col items-center gap-md py-2xl text-center bg-surface-container-lowest border border-outline-variant rounded-xl">
          <span className="material-symbols-outlined text-[56px] text-outline">approval</span>
          <p className="text-headline-sm text-on-surface">Selecione uma obra para começar</p>
        </div>
      )}

      {obraId && carregando && (
        <div className="flex items-center gap-sm p-xl text-on-surface-variant">
          <span className="material-symbols-outlined animate-spin text-[22px]">progress_activity</span> Carregando…
        </div>
      )}

      {obraId && !carregando && filtrados.length === 0 && (
        <div className="flex flex-col items-center gap-md py-2xl text-center bg-surface-container-lowest border border-outline-variant rounded-xl">
          <span className="material-symbols-outlined text-[56px] text-outline">check_circle</span>
          <p className="text-headline-sm text-on-surface">Nenhum orçamento pendente</p>
          <p className="text-body-sm text-on-surface-variant">Todos os orçamentos desta obra já foram processados</p>
        </div>
      )}

      {/* Barra de seleção (quando houver selecionados) */}
      {filtrados.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-md bg-surface-container-lowest border border-outline-variant rounded-xl p-lg">
          <div className="flex items-center gap-md">
            <input
              type="checkbox"
              checked={selecionados.size > 0 && selecionados.size === filtrados.length}
              indeterminate={selecionados.size > 0 && selecionados.size < filtrados.length}
              onChange={toggleTodosSelecionados}
              className="w-5 h-5 rounded border-2 border-primary accent-primary cursor-pointer"
            />
            <label className="text-label-md text-on-surface-variant cursor-pointer">
              {selecionados.size === 0
                ? `Nenhum selecionado`
                : selecionados.size === filtrados.length
                  ? `Todos (${filtrados.length}) selecionados`
                  : `${selecionados.size} de ${filtrados.length} selecionados`}
            </label>
          </div>

          {selecionados.size > 0 && (
            <button
              onClick={handleRemoverSelecionados}
              disabled={removendo}
              className="flex items-center gap-sm px-lg py-2 bg-error text-on-error rounded-lg hover:bg-error/90 text-label-md font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[18px]">
                {removendo ? 'progress_activity' : 'delete'}
              </span>
              {removendo ? 'Removendo…' : `Remover ${selecionados.size}`}
            </button>
          )}
        </div>
      )}

      {/* Lista de orçamentos */}
      {filtrados.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-md">
          {filtrados.map((orcamento) => (
            <div key={orcamento.id} className="relative">
              {/* Checkbox no canto superior direito */}
              <input
                type="checkbox"
                checked={selecionados.has(orcamento.id)}
                onChange={() => toggleSelecionado(orcamento.id)}
                className="absolute top-3 right-3 w-5 h-5 rounded border-2 border-primary accent-primary cursor-pointer z-10"
              />

              <OrcamentoAprovacaoCard
                orcamento={orcamento}
                tiposDisp={TIPOS_ORCAMENTO}
                onAprovado={handleAprovado}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

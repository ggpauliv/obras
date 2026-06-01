import React, { useState } from 'react';

const FOTOS = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCneablm0Jq3nkdDAcR7mq8FLTAmfA4-eUeI31mpKVw18YPVPTewfQQlSUbkPSVIUP4iS4vzgDdwKG1MitDCpdxAoerAR9lpwiygKKsJbSzwLRA5388OzQ4vB46szFt-hYAzsxjg-nlClsBNDFE3lNpZd5WgD6FqKuJ7LqGVAujGBen_S002n4UPH6CXQr4lhy_Xs4RSFPBMbYdu2z48Iv6BZYKEWW1XEOwvUAmBz8PbKRjQ1kF8GOkBOevkMrQLV0w1Xwr868mq0Y',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDmNuB_-4dp1tZZVXtr40BXp1l4grxLIrifkV3Ps7ParY6q9Hq4-QXmpoOW7P6aEHhUICJJDBGfU1aAa0pNXXMMNZqoy2lN7VRVxKqRGbBp9vpfqm0E8Iy2tgERWVOfT8T0UM6c-IjB6TRoXxXCWaqGgh9RSsUnjHXG2exlThJWT3nf_doXwJ2nDJi9DH8MhLfDhwMnWYn4dQjB4MJEIG8CibqtPaY_ZfgcoKG0f1aNi17S0Ltkgli-Oq5fXAUI7otGtsGjAP7WJ8I',
];

const HISTORICO = [
  { dot: 'bg-primary-container', meta: 'Hoje, 10:45 • Por João Silva', titulo: 'Avanço para 68%', desc: 'Finalização da parede norte do 3º andar.' },
  { dot: 'bg-surface-variant', meta: '12 Out, 16:20 • Por Maria Souza', titulo: 'Avanço para 55%', desc: 'Conclusão do setor leste. Atraso devido à chuva.' },
  { dot: 'bg-surface-variant', meta: '05 Out, 09:10 • Por João Silva', titulo: 'Avanço para 40%', desc: 'Início das alvenarias de vedação.' },
];

const READONLY = 'px-sm py-sm bg-surface-container-low border border-outline-variant rounded text-on-surface text-body-md flex items-center gap-sm';

export default function ProgressoPage() {
  const [pct, setPct] = useState(75);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
      {/* Coluna esquerda — formulário */}
      <div className="lg:col-span-7 flex flex-col gap-gutter">
        <div className="bg-surface-container-lowest rounded-lg border border-outline-variant shadow-sm overflow-hidden flex flex-col">
          <div className="px-lg py-md border-b border-outline-variant bg-surface">
            <h3 className="text-headline-sm text-on-surface flex items-center gap-sm">
              <span className="material-symbols-outlined text-primary">edit_document</span>Detalhes do Registro
            </h3>
          </div>
          <div className="p-lg flex-1 flex flex-col gap-lg">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
              <div>
                <label className="block text-label-sm text-on-surface-variant mb-xs">Obra</label>
                <div className={READONLY}><span className="material-symbols-outlined text-secondary text-[18px]">domain</span>Edifício Horizonte</div>
              </div>
              <div>
                <label className="block text-label-sm text-on-surface-variant mb-xs">Fase Atual</label>
                <div className={READONLY}><span className="material-symbols-outlined text-secondary text-[18px]">account_tree</span>Alvenaria</div>
              </div>
            </div>
            <hr className="border-outline-variant" />
            <div>
              <label className="block text-label-sm text-on-surface mb-sm">Novo Percentual de Conclusão</label>
              <div className="flex items-center gap-md">
                <input type="range" min={0} max={100} value={pct} onChange={(e) => setPct(Number(e.target.value))}
                  className="flex-1 h-2 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary" />
                <div className="flex items-center border border-outline-variant rounded overflow-hidden w-24">
                  <input type="number" value={pct} onChange={(e) => setPct(Number(e.target.value))}
                    className="w-full px-sm py-xs text-center border-none focus:ring-0 text-body-md text-on-surface bg-surface-container-lowest" />
                  <span className="bg-surface-container px-sm py-xs border-l border-outline-variant text-secondary text-label-md">%</span>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-label-sm text-on-surface mb-xs">Motivo da Atualização</label>
              <select className="w-full px-sm py-2 border border-outline-variant rounded text-on-surface text-body-md bg-surface-container-lowest focus:border-primary">
                <option>Avanço Regular Diário</option>
                <option>Conclusão de Etapa Parcial</option>
                <option>Revisão de Medição</option>
                <option>Outros</option>
              </select>
            </div>
            <div>
              <label className="block text-label-sm text-on-surface mb-xs">Observações</label>
              <textarea rows={3} placeholder="Descreva os principais trabalhos realizados neste período..."
                className="w-full px-sm py-sm border border-outline-variant rounded text-on-surface text-body-md bg-surface-container-lowest placeholder:text-secondary" />
            </div>
            <hr className="border-outline-variant" />
            <div className="bg-surface-container rounded-lg p-md border border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-md">
              <div className="flex items-start gap-sm">
                <span className="material-symbols-outlined text-primary mt-1">location_on</span>
                <div>
                  <p className="text-label-md text-on-surface">Validação de Localização</p>
                  <p className="text-body-sm text-secondary font-mono">Coordenadas: -23.5505, -46.6333</p>
                </div>
              </div>
              <div className="px-sm py-xs bg-primary-fixed text-primary text-label-sm rounded-full inline-flex items-center gap-xs whitespace-nowrap border border-primary-fixed-dim">
                <span className="material-symbols-outlined text-[14px]">check_circle</span>Dentro do limite da obra
              </div>
            </div>
            <div>
              <label className="block text-label-sm text-on-surface mb-xs flex items-center justify-between">
                <span>Evidências Fotográficas <span className="text-error">*</span></span>
                <span className="text-body-sm text-secondary">Mínimo 1 foto</span>
              </label>
              <div className="border-2 border-dashed border-outline-variant rounded-lg p-lg text-center bg-surface hover:bg-surface-container transition-colors cursor-pointer mb-md">
                <span className="material-symbols-outlined text-primary text-3xl mb-xs">cloud_upload</span>
                <p className="text-label-md text-on-surface">Arraste e solte arquivos aqui</p>
                <p className="text-body-sm text-secondary mt-xs">ou clique para procurar (JPG, PNG, máx 5MB)</p>
              </div>
              <div className="flex gap-md overflow-x-auto pb-sm">
                {FOTOS.map((src) => (
                  <div key={src} className="relative w-24 h-24 rounded border border-outline-variant overflow-hidden group shrink-0">
                    <div className="w-full h-full bg-surface-container-high bg-cover bg-center" style={{ backgroundImage: `url('${src}')` }} />
                    <button className="absolute top-1 right-1 bg-white text-gray-600 rounded-full p-1 opacity-0 group-hover:opacity-100 shadow-sm"><span className="material-symbols-outlined text-[16px]">close</span></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="px-lg py-md border-t border-outline-variant bg-surface flex justify-end gap-md">
            <button type="button" className="px-md py-sm rounded border border-outline text-on-surface-variant text-label-md hover:bg-surface-container-high transition-colors">Cancelar</button>
            <button type="button" className="px-md py-sm rounded bg-primary-container text-on-primary-container text-label-md hover:opacity-90 shadow-sm flex items-center gap-xs">
              <span className="material-symbols-outlined text-[18px]">save</span>Salvar Registro
            </button>
          </div>
        </div>
      </div>

      {/* Coluna direita — impacto + histórico */}
      <div className="lg:col-span-5 flex flex-col gap-gutter">
        <div className="bg-error-container text-on-error-container rounded-lg border border-[#ffb4ab] p-md shadow-sm flex items-start gap-md">
          <span className="material-symbols-outlined text-error text-2xl mt-1">warning</span>
          <div>
            <h4 className="text-headline-sm mb-xs">Atenção ao Cronograma</h4>
            <p className="text-body-md opacity-90">A fase está <strong>9% abaixo do esperado</strong> para a data atual. Recomenda-se revisão de recursos.</p>
          </div>
        </div>
        <div className="bg-surface-container-lowest rounded-lg border border-outline-variant shadow-sm p-lg">
          <h3 className="text-headline-sm text-on-surface mb-md flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary">event_available</span>Impacto no Cronograma
          </h3>
          <div className="grid grid-cols-2 gap-md text-center">
            <div className="p-md rounded-lg bg-surface-container border border-outline-variant">
              <p className="text-label-sm text-secondary mb-xs">Sem este registro</p>
              <p className="text-headline-md text-on-surface">15 Nov</p>
              <p className="text-body-sm text-secondary mt-1">Projeção Anterior</p>
            </div>
            <div className="p-md rounded-lg bg-primary-fixed border border-primary-fixed-dim">
              <p className="text-label-sm text-primary mb-xs">Com este registro</p>
              <p className="text-headline-md text-primary font-bold">18 Nov</p>
              <p className="text-body-sm text-primary mt-1">+3 dias de impacto</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-lowest rounded-lg border border-outline-variant shadow-sm p-lg flex-1">
          <h3 className="text-headline-sm text-on-surface mb-md flex items-center gap-sm">
            <span className="material-symbols-outlined text-primary">history</span>Histórico desta Fase
          </h3>
          <div className="relative border-l-2 border-surface-container-highest ml-sm mt-md">
            {HISTORICO.map((h, i) => (
              <div key={h.meta} className={`pl-lg relative ${i < HISTORICO.length - 1 ? 'mb-lg' : ''}`}>
                <div className={`absolute w-4 h-4 rounded-full -left-[9px] top-1 border-2 border-surface-container-lowest ${h.dot}`} />
                <p className="text-label-sm text-secondary mb-xs">{h.meta}</p>
                <p className="text-body-md text-on-surface font-medium">{h.titulo}</p>
                <p className="text-body-sm text-on-surface-variant mt-xs">{h.desc}</p>
              </div>
            ))}
          </div>
          <button className="w-full mt-lg py-sm text-label-md text-primary hover:bg-surface-container rounded transition-colors">Ver histórico completo</button>
        </div>
      </div>
    </div>
  );
}

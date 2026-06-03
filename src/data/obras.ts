// Dados iniciais (seed) das obras.
// Os tipos agora vivem em src/store/types.ts (fonte única de verdade).
// `OBRAS` é mantido para compatibilidade com telas ainda não migradas;
// telas novas devem usar as funções de src/store/obras.ts.
import type { Obra, StatusKey } from '../store/types';

export type { Obra, StatusKey };

export const OBRAS: Obra[] = [
  { id: '101', nome: 'Edifício Horizonte', cliente: 'Construtora Alpha S.A.', tipo: 'Residencial', inicio: '15/01/2024', termino: '30/11/2025', pct: 35, status: 'andamento', fases: ['Fundações', 'Estrutura', 'Alvenaria', 'Instalações', 'Acabamento'] },
  { id: '102', nome: 'Galpão Logístico Norte', cliente: 'LogisBraz Corp', tipo: 'Comercial', inicio: '05/03/2024', termino: '15/08/2024', pct: 85, status: 'andamento' },
  { id: '103', nome: 'Reforma Shopping Central', cliente: 'Malls Brasil', tipo: 'Comercial', inicio: '10/11/2023', termino: '20/12/2024', pct: 40, status: 'atrasada' },
  { id: '104', nome: 'Viaduto Ayrton Senna', cliente: 'Prefeitura Municipal', tipo: 'Infraestrutura', inicio: '01/05/2024', termino: '30/05/2026', pct: 0, status: 'planejamento' },
  { id: '099', nome: 'Condomínio Vila Verde', cliente: 'Habitar Engenharia', tipo: 'Residencial', inicio: '10/02/2022', termino: '15/12/2023', pct: 100, status: 'concluida' },
  { id: '105', nome: 'Hospital Memorial Sul', cliente: 'Grupo Saúde+', tipo: 'Comercial', inicio: '20/06/2023', termino: '20/06/2025', pct: 22, status: 'andamento' },
  { id: '106', nome: 'Escola Técnica Bandeirantes', cliente: 'Governo Estadual', tipo: 'Infraestrutura', inicio: '01/09/2023', termino: '30/08/2024', pct: 65, status: 'atrasada' },
  { id: '107', nome: 'Praça das Águas', cliente: 'Prefeitura Municipal', tipo: 'Infraestrutura', inicio: '15/07/2024', termino: '15/12/2024', pct: 0, status: 'planejamento' },
];

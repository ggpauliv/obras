export interface NavItem {
  label: string;
  route?: string;
  icon: string; // Material Symbols name
  disabled?: boolean;
  superOnly?: boolean; // visível apenas para super-admin
  submenu?: NavItem[];
}

// Itens principais da sidebar (navegação global)
export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', route: '/dashboard', icon: 'dashboard' },
  { label: 'Obras', route: '/obras', icon: 'foundation' },
  { label: 'Fases', route: '/obra-fases', icon: 'account_tree' },
  { label: 'Progresso', route: '/progresso', icon: 'trending_up' },
  { label: 'Financeiro', route: '/obra-financeiro', icon: 'payments' },
  { label: 'Fornecedores', route: '/fornecedores', icon: 'engineering' },
  { label: 'Importar (IA)', route: '/importar', icon: 'auto_awesome' },
  {
    label: 'Orçamentos',
    icon: 'request_quote',
    submenu: [
      { label: 'Importar', route: '/orcamentos/upload', icon: 'upload_file' },
      { label: 'Analisar & Aprovar', route: '/orcamentos/comparativa', icon: 'compare_arrows' },
    ],
  },
  { label: 'Usuários', route: '/usuarios', icon: 'group' },
  { label: 'Empresas', route: '/empresas', icon: 'apartment', superOnly: true },
];

export const SETTINGS_ITEM: NavItem = {
  label: 'Configurações',
  route: '/configuracoes',
  icon: 'settings',
};

export interface RouteMeta {
  title: string;
  breadcrumb: string[];
}

// Metadados de cada rota usados pela TopBar (título + trilha)
export const ROUTE_META: Record<string, RouteMeta> = {
  '/dashboard': { title: 'Dashboard', breadcrumb: ['Início', 'Dashboard'] },
  '/obras': { title: 'Obras', breadcrumb: ['Início', 'Obras'] },
  '/fornecedores': { title: 'Fornecedores', breadcrumb: ['Início', 'Fornecedores'] },
  '/obra-detalhe': { title: 'Edifício Horizonte', breadcrumb: ['Obras', 'Edifício Horizonte'] },
  '/obra-fases': { title: 'Fases / Cronograma', breadcrumb: ['Obras', 'Edifício Horizonte', 'Fases'] },
  '/obra-financeiro': { title: 'Financeiro', breadcrumb: ['Obras', 'Edifício Horizonte', 'Financeiro'] },
  '/obra-fotos': { title: 'Fotos', breadcrumb: ['Obras', 'Edifício Horizonte', 'Fotos'] },
  '/obra-auditoria': { title: 'Auditoria', breadcrumb: ['Obras', 'Edifício Horizonte', 'Auditoria'] },
  '/obra-ocorrencias': { title: 'Ocorrências', breadcrumb: ['Obras', 'Edifício Horizonte', 'Ocorrências'] },
  '/progresso': { title: 'Registro de Progresso', breadcrumb: ['Início', 'Progresso'] },
  '/importar': { title: 'Importar Documento', breadcrumb: ['Início', 'Importar Documento'] },
  '/orcamentos/upload': { title: 'Importar Orçamentos', breadcrumb: ['Início', 'Orçamentos', 'Importar'] },
  '/orcamentos/comparativa': { title: 'Orçamentos', breadcrumb: ['Início', 'Orçamentos', 'Análise & Aprovação'] },
  '/orcamentos/aprovacao': { title: 'Orçamentos', breadcrumb: ['Início', 'Orçamentos', 'Análise & Aprovação'] },
  '/usuarios': { title: 'Usuários', breadcrumb: ['Início', 'Usuários'] },
  '/empresas': { title: 'Empresas', breadcrumb: ['Início', 'Empresas'] },
  '/configuracoes': { title: 'Configurações', breadcrumb: ['Início', 'Configurações'] },
};

// Abas do contexto "Detalhe da Obra"
export const OBRA_TABS: NavItem[] = [
  { label: 'Visão Geral', route: '/obra-detalhe', icon: 'info' },
  { label: 'Fases / Gantt', route: '/obra-fases', icon: 'account_tree' },
  { label: 'Financeiro', route: '/obra-financeiro', icon: 'payments' },
  { label: 'Fotos', route: '/obra-fotos', icon: 'photo_library' },
  { label: 'Ocorrências', route: '/obra-ocorrencias', icon: 'event_note' },
  { label: 'Auditoria', route: '/obra-auditoria', icon: 'history' },
  { label: 'Importar', route: '/importar', icon: 'smart_toy' },
];

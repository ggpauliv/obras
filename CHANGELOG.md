# Histórico de Alterações — Pawliv Obras

Registro das principais mudanças, em ordem cronológica (mais recente no topo).
Para detalhes finos, ver o `git log`.

---

## Módulo de Orçamentos — Exportação e Reimportação

- **PDF de apresentação (profissional e completo)** — documento estruturado
  (jsPDF + autotable), independente da aba aberta:
  - Capa com KPIs (propostas, melhor, diferença, economia).
  - Ranking de fornecedores (melhor destacado).
  - Gráfico "Valores por Fornecedor".
  - **Comparativo por Categoria** com mini-gráficos (barra por fornecedor,
    menor preço em verde, ausentes marcados).
  - **Itens Detalhados agrupados por empresa** (faixa colorida com nome+total
    seguida da tabela de itens).
- **Excel dinâmico com gráficos NATIVOS** (Python/XlsxWriter, gerado no backend):
  - Uma **aba por fornecedor** com seus itens (Total = Qtd×Unit).
  - **Resumo** e **Por Categoria** com fórmulas (`SUM`/`SUMIF`) vinculadas às
    abas → **gráficos recalculam ao editar/adicionar itens**.
  - Aba oculta `_meta` (id de cada orçamento) para reimportação.
- **Reimportar Excel** — sobe o `.xlsx` editado e atualiza os orçamentos no
  banco (recalcula total, substitui itens add/edição/remoção, registra auditoria).
- Comparativo por categoria na tela em **small multiples** (um painel por
  categoria), mais legível que o gráfico agrupado anterior.
- Paleta de **12 cores distintas** (antes 6 repetiam com 7+ fornecedores).
- Edição de orçamento já salvo na Comparativa: **renomear** e **trocar categoria**
  de item (aplica a todos os fornecedores).
- Análise de orçamentos: aceita **XLSX e PDF**; detecta **1 ou vários
  fornecedores** (mapas de equalização) e separa; **dedup** de fornecedores;
  modelo de **itens compartilhados** (categorias consistentes entre fornecedores);
  edição de nome/categoria antes de salvar.

## Telas de Obra (detalhe)

- **Seletor de obra** no cabeçalho (troca a obra ativa em todas as abas).
- **Visão Geral** e **Financeiro** com **dados reais** da obra (sem mock):
  progresso, dias corridos, total de despesas, despesas por categoria, fases.

## Infraestrutura / Produção

- **HTTPS** com Let's Encrypt (nginx 443 + redirect HTTP→HTTPS + renovação
  automática via cron/webroot).
- **Gestão de usuários no banco** (CRUD via API, bcrypt, papel); login
  case-insensitive; exclusão robusta (FK de auditoria).
- Correções de produção: API same-origin (`REACT_APP_API_URL` vazio), datas
  **BR↔ISO** entre UI e banco, timeout/retry da IA, chave Gemini paga,
  fallback de modelos Gemini atualizado.

## Fases A–E (base do projeto)

- **A** — Camada de dados (`src/store/`).
- **B** — Importação por IA ligada ao sistema.
- **C** — CRUD completo (Obras, Fases, Despesas, Fornecedores, Usuários).
- **D** — Polimento de UX (validação de arquivo, edição inline, timeout/retry).
- **E** — Persistência: **Docker + PostgreSQL + API REST + JWT**; deploy na VPS.

---

## Stack atual

- **Frontend:** React + TS (CRA), Tailwind. Export: jsPDF/autotable, html2canvas, SheetJS.
- **Backend:** Node/Express + PostgreSQL (pg), JWT (bcryptjs), IA via Gemini.
  **Python + XlsxWriter** para Excel com gráficos nativos.
- **Infra:** Docker Compose (postgres, backend, frontend/nginx) na VPS,
  domínio `hkfazendas.com` com HTTPS.

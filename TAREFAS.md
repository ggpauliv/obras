# 📋 Tarefas de Desenvolvimento — Pawliv Obras

> Estratégia: desenvolver tudo que **não precisa de banco de dados** primeiro (usando `localStorage` com a "cara" de API).
> Quando só faltar persistência, migramos para Docker + Postgres trocando apenas a camada `src/store/`.

Legenda: `[ ]` pendente · `[~]` em andamento · `[x]` concluído

---

## Fase A — Camada de dados local (alicerce) ✅
- [x] Criar pasta `src/store/` com repositório central baseado em `localStorage` (`db.ts`)
- [x] Definir tipos compartilhados (Obra, Fase, Despesa, Fornecedor, Auditoria) (`types.ts`)
- [x] Migrar `OBRAS` (seed em `src/data/obras.ts`) para o store com seeding automático
- [x] Expor funções tipo API (`listarObras`, `obterObra`, `salvarObra`, `removerObra`) (`obras.ts`)

## Fase B — Ligar a Importação ao resto do sistema ✅
- [x] Conceito de **obra ativa** (`store/sessao.ts`) + repositórios `fases`, `despesas`, `auditoria`
- [x] `ObraFasesPage` lê as fases reais do store (tabela, resumo e Gantt derivados dos dados)
- [x] `ObrasPage` define a obra ativa ao abrir; `ObraHeader` reflete a obra ativa
- [x] Importação grava fases (`adicionarFasesImportadas`), despesa (NF) e evento de auditoria
- [x] `ObraFinanceiroPage` exibe "Despesas Lançadas" reais (incl. importadas)
- [x] `ObraAuditoriaPage` exibe os eventos registrados no topo da timeline

## Fase C — CRUD real nas telas ✅
- [x] Obras: criar / editar / excluir (modal Nova/Editar + menu de ações)
- [x] Fases: "Adicionar Fase", editar, excluir, atualizar progresso/status
- [x] Financeiro: lançar / editar / excluir despesas (modal)
- [x] Fornecedores: CRUD completo (repositório `store/fornecedores.ts`)
- [x] Usuários: CRUD completo via store (`store/usuarios.ts`); auth lê do store e checa `ativo`
- [x] Busca e filtros funcionando (Obras, Fases, Fornecedores, Usuários)
- [x] Utilitário de datas `src/utils/datas.ts` (BR ⇄ input date)

## Fase D — Polimento de UX ✅
- [x] **1. Edição inline na revisão da importação** (`ImportarPage.tsx`)
  - Linhas controladas pelo estado `fases` (corrige bug do `defaultValue` que descartava edições)
  - Editar nome, início, término e categoria; botão para remover linha antes de importar
- [x] **2. Validação de arquivo** (novo `utils/arquivos.ts`)
  - Whitelist de extensões + limite de 20MB, aplicada no select E no drop; texto da UI alinhado
- [x] **3. Timeout e retry de rede** (`geminiDocumentProcessor.ts`)
  - `AbortController` (60s) + retry automático (2x, backoff) para falhas transitórias/5xx
- [x] **4. Mensagens de erro específicas** (`geminiDocumentProcessor.ts`, `ImportarPage.tsx`)
  - Backend offline, timeout, JSON inválido da IA → mensagens amigáveis (`ErroAmigavel`)
- [x] **5. Nomenclatura da IA — Gemini** (decisão: manter Gemini)
  - Alinhados UI, comentários, `server.js` e `CLAUDE.md` (incl. variável `REACT_APP_GEMINI_API_KEY`)

## Fase E — Persistência (Docker + PostgreSQL) ✅
- [x] `docker-compose.yml` com Postgres 15 + pgAdmin
- [x] API REST no backend (CRUD de obras, fases, financeiro, fornecedores)
- [x] Migrar `src/store/` de `localStorage` para chamadas à API assincronas
- [x] Autenticação real com JWT + hash bcrypt de senha
- [x] Histórico / auditoria persistente multiusuário (registrado automaticamente)

**Arquivos criados:**
- `docker-compose.yml` — orquestração de contêineres
- `db/init.sql` — schema do PostgreSQL
- `db/seed.sql` — dados iniciais
- `server-api.js` — API REST completa (Express + pg)
- `db-client.js` — gerenciador de pool PostgreSQL
- `auth-middleware.js` — middleware JWT
- `src/api/client.ts` — cliente HTTP centralizado
- `src/store/db-api.ts` — camada de acesso via API
- `.env.local` — configurações de desenvolvimento
- `FASE_E.md` — documentação completa

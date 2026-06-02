# Pawliv Obras — Arquitetura e Implementação

## 📋 Estado do Projeto (2026-06-01)

### ✅ Implementado
- **React 18 + TypeScript** com Create React App (port 3000)
- **Backend Node.js + Express** proxy para Claude API (port 3001)
- **Layout responsivo** (Sidebar + TopBar) com Tailwind CSS
- **12 páginas** de UI para gestão de obras
- **Integração Claude API** para processamento de documentos

---

## 🏗️ Arquitetura

```
┌──────────────────────┐         ┌──────────────────────┐         ┌──────────────┐
│  React Frontend      │         │  Express Backend     │         │ Claude API   │
│  (port 3000)         │────────▶│  (port 3001)         │────────▶│  (proxy)     │
│                      │         │                      │         │              │
│ - Upload arquivo     │         │ - POST /api/         │         │ - Processa   │
│ - Drag-drop UI       │         │   process-document   │         │   documento  │
│ - Revisão de dados   │         │ - Chama Claude       │         │ - Retorna    │
│ - Salva em cache     │         │   (com chave)        │         │   JSON       │
└──────────────────────┘         │ - Evita CORS         │         │              │
                                 └──────────────────────┘         └──────────────┘
```

---

## 📁 Serviço de Importação com IA

### Backend (`server.js`)
- Express.js rodando em **http://localhost:3001**
- Carrega chave API do `.env.local` via dotenv
- **POST /api/process-document**
  - Recebe `{ content: [...] }` (array de partes para Claude)
  - Chama Claude API com `claude-opus-4-8`
  - Retorna resposta JSON estruturada
- **GET /api/health** — health check

### Frontend (`src/services/geminiDocumentProcessor.ts`)
- `processarDocumento(arquivo: File)` → `DocumentExtractionResult`
- Converte arquivo para base64
- Chama backend proxy em `http://localhost:3001/api/process-document`
- Extrai JSON da resposta
- Retorna: fases, avisos, metadados, confiança

### Interface (`src/pages/ImportarPage.tsx`)
- **Etapa 1 (Upload)**: Drag-drop ou seleção de arquivo
- **Etapa 2 (Processamento)**: Spinner enquanto Claude processa
- **Etapa 3 (Revisão)**: Tabela com fases extraídas
  - Edição inline de nomes
  - Indicador de confiança (cores)
  - Avisos de inconsistências
  - Botão para confirmar e importar

---

## 🔐 Configuração

**Arquivo `.env.local` (não versionado — criar localmente):**

```bash
REACT_APP_ANTHROPIC_API_KEY=sk-ant-...sua-chave-aqui...
```

**Obtenha chave em:** https://console.anthropic.com/account/keys

---

## 🚀 Como Rodar

### Tudo junto (frontend + backend):
```bash
npm start
# Abre ambos simultaneamente:
#   Frontend: http://localhost:3000
#   Backend:  http://localhost:3001
```

### Separadamente (para debug):
```bash
npm run frontend   # apenas React (port 3000)
npm run backend    # apenas Express (port 3001)
```

### Type check:
```bash
npx tsc --noEmit
```

### Build de produção:
```bash
npm run build
```

---

## 📊 Fluxo de Importação

1. **Upload** → Usuário seleciona arquivo (PDF, XLSX, DOCX, CSV)
2. **Processamento**
   - Frontend converte arquivo → base64
   - Chama `POST /api/process-document` (backend)
   - Backend chama Claude API com a imagem/texto
   - Claude analisa e retorna JSON com fases extraídas
3. **Revisão**
   - Tabela mostra: ID, nome, datas, orçamento, confiança
   - Usuário pode editar nomes
   - Avisos mostram inconsistências detectadas
4. **Importação**
   - Clique em "Confirmar" salva em `localStorage`
   - Navega para `/obra-fases` com dados importados

---

## 🎯 Próximas Pendências

### 1. Testar com Documentos Reais
- [ ] Validar extração de cronogramas em PDF
- [ ] Testar orçamentos em XLSX
- [ ] Verificar acurácia de datas e valores

### 2. Armazenamento Persistente
- [ ] Backend com banco de dados (não localStorage)
- [ ] Salvar histórico de importações
- [ ] Auditoria de quem importou quando

### 3. Integração com Obra
- [ ] Conectar `/obra-fases` com dados importados
- [ ] Atualizar `/obra-financeiro` com orçamentos
- [ ] Registrar importação em `/obra-auditoria`

### 4. Melhorias UX
- [ ] Edição inline das fases na revisão
- [ ] Botão para ignorar avisos
- [ ] Retry automático em falhas de rede

### 5. Tratamento de Erros
- [ ] Mensagens específicas para cada tipo de arquivo
- [ ] Timeout customizável para processamento
- [ ] Limite de tamanho de arquivo

---

## 📝 Estrutura Relevante

```
src/
├── services/
│   └── geminiDocumentProcessor.ts    ← Integração com Claude API
├── pages/
│   ├── ImportarPage.tsx              ← Upload + Processamento + Revisão
│   ├── ObraFasesPage.tsx             ← Deve usar dados de lastImport
│   └── ObraFinanceiroPage.tsx        ← Deve usar orçamentos extraídos
├── layouts/AppLayout.tsx             ← Sidebar + TopBar
└── index.tsx                         ← Ponto de entrada React

server.js                             ← Backend Express proxy
.env.local                            ← Chave API (não versionado)
.env.local.example                    ← Template
```

---

## ⚠️ Notas Importantes

- **Dados em localStorage**: Ainda não há persistência em DB
- **Login simulado**: Sem autenticação real (qualquer usuário pode entrar)
- **CORS resolvido**: Backend proxy evita problemas de CORS do browser
- **Chave API na .env.local**: Nunca commitar chaves em versionamento
- **Avisos**: São recomendações — não bloqueiam importação

---

## 🐛 Troubleshooting

**"Failed to fetch"** → Backend não está rodando
```bash
# Certifique-se de usar:
npm start  # Roda backend + frontend simultaneamente
```

**"REACT_APP_ANTHROPIC_API_KEY não está configurada"**
```bash
# Crie .env.local com sua chave:
echo "REACT_APP_ANTHROPIC_API_KEY=sk-ant-..." > .env.local
```

**Backend na porta 3001 já está em uso**
```bash
# Mude a porta no server.js:
const PORT = 3002;  // ou outra porta disponível
```

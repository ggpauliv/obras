# Fase E — Persistência com Docker + PostgreSQL ✅

## Status: ✅ Implementada

Esta fase migra o projeto de `localStorage` para uma arquitetura com **PostgreSQL** persistente e **API REST** no backend.

---

## 📋 O que foi implementado

### 1️⃣ Docker + PostgreSQL
- ✅ `docker-compose.yml` com PostgreSQL 15 + pgAdmin
- ✅ Inicialização automática do schema via `db/init.sql`
- ✅ Seed inicial de dados via `db/seed.sql`
- ✅ Volumes para persistência de dados

**Executar:**
```bash
docker-compose up -d
```

**Acessar pgAdmin:**
```
http://localhost:5050
Email: admin@pawliv.local
Password: admin123
```

---

### 2️⃣ API REST Completa
- ✅ `server-api.js` com rotas CRUD para:
  - Obras (`GET/POST/PUT/DELETE /api/obras`)
  - Fases (`GET/POST/PUT/DELETE /api/fases`)
  - Despesas (`GET/POST/PUT/DELETE /api/despesas`)
  - Fornecedores (`GET/POST/PUT/DELETE /api/fornecedores`)
  - Auditoria (`GET /api/auditoria`)
  - Autenticação (`POST /api/auth/login`, `POST /api/auth/register`)

**Dependências:**
- `pg` — cliente PostgreSQL
- `jsonwebtoken` — JWT para autenticação
- `bcryptjs` — hash de senhas

---

### 3️⃣ Autenticação JWT
- ✅ Login com email/senha
- ✅ Hash bcrypt para senhas
- ✅ Tokens JWT com validade de 24h
- ✅ Middleware `autenticar` para proteger rotas

**Usuários padrão (seed):**
```
Email: admin@pawliv.local | Senha: 123456
Email: gerente@pawliv.local | Senha: 123456
Email: supervisor@pawliv.local | Senha: 123456
```

---

### 4️⃣ Migração do Frontend
- ✅ Novo `src/api/client.ts` — cliente HTTP centralizado
- ✅ Repositórios migrados para usar a API:
  - `src/store/obras.ts` → async
  - `src/store/fases.ts` → async
  - `src/store/despesas.ts` → async
  - `src/store/fornecedores.ts` → async
  - `src/store/auditoria.ts` → async
- ✅ Conversão automática entre snake_case (BD) ↔ camelCase (frontend)

---

### 5️⃣ Auditoria Persistente
- ✅ Registro automático de operações CRUD no banco
- ✅ Campos: `tipo`, `titulo`, `descricao`, `usuario_id`, `data`
- ✅ Endpoint `GET /api/auditoria?obraId=...`

---

## 🚀 Como executar

### Pré-requisitos
- Docker e Docker Compose instalados
- Node.js 16+
- npm

### Passo 1: Iniciar o banco de dados
```bash
docker-compose up -d
```

Aguardar o PostgreSQL estar pronto (~10 segundos):
```bash
# Verificar status
docker-compose ps
```

### Passo 2: Instalar dependências
```bash
npm install
```

### Passo 3: Configurar .env.local
```bash
# Já criado com valores padrão
cat .env.local
```

Substitua `REACT_APP_GEMINI_API_KEY` pela sua chave real (se quiser usar importação de documentos).

### Passo 4: Rodar frontend + backend
```bash
npm start
```

Isto executa (via `concurrently`):
- Frontend em `http://localhost:3000`
- Backend API em `http://localhost:3001`

### Passo 5: Testar login
1. Abra `http://localhost:3000`
2. Login com:
   - Email: `admin@pawliv.local`
   - Senha: `123456`

---

## 📊 Estrutura do Banco de Dados

### Tabelas
```sql
usuarios          — Usuários da plataforma
obras             — Projetos/obras
fases             — Etapas das obras
despesas          — Lançamentos financeiros
fornecedores      — Cadastro de fornecedores
auditoria         — Log de operações
```

### Indices
- `idx_fases_obra_id`
- `idx_despesas_obra_id`
- `idx_despesas_fase_id`
- `idx_auditoria_obra_id`
- `idx_auditoria_data`

---

## 🔄 Fluxo de Requisição

```
Frontend (React)
       ↓
src/api/client.ts (HTTP + JWT)
       ↓
server-api.js (Express)
       ↓
db-client.js (Pool PostgreSQL)
       ↓
PostgreSQL 15
```

---

## 🔐 Segurança

- ✅ Senhas hasheadas com bcrypt (10 rounds)
- ✅ JWTs assinados (HS256)
- ✅ CORS habilitado
- ✅ Validação de entrada
- ✅ Queries parametrizadas (prevenção de SQL injection)

---

## 📝 Próximos passos (futuro)

- [ ] Refresh tokens (opcional)
- [ ] 2FA / MFA
- [ ] Permissões por role (admin, gerente, supervisor)
- [ ] Backup/restore automático do banco
- [ ] Monitoring com Prometheus/Grafana
- [ ] Testes de carga
- [ ] Certificado SSL para produção

---

## 🐛 Troubleshooting

### PostgreSQL não sobe
```bash
docker-compose logs postgres
docker-compose restart postgres
```

### Erro de conexão na API
```bash
# Verificar se o banco está rodando
docker-compose ps

# Verificar credenciais em .env.local
cat .env.local
```

### Token expirado no frontend
- Limpar localStorage
- Fazer login novamente

### Dados não persistem
- Verificar se o volume está sendo criado:
  ```bash
  docker volume ls | grep pawliv
  ```

---

## 📚 Referências

- PostgreSQL 15: https://www.postgresql.org/docs/15/
- Express.js: https://expressjs.com/
- JWT: https://jwt.io/
- bcryptjs: https://github.com/dcodeIO/bcrypt.js

---

**Fase E Concluída:** ✅ 2026-06-04

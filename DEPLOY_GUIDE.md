# 📋 Guia de Deployment — Pawliv Obras

Guia completo para atualizar a aplicação na VPS.

---

## 🚀 Deployment Rápido (1 comando)

```bash
cd /home/pawliv/obras
sudo bash deploy.sh
```

O script faz tudo automaticamente:
1. ✅ Atualiza código do git
2. ✅ Aplica migrations do banco
3. ✅ Rebuild do frontend
4. ✅ Reinicia serviços
5. ✅ Health check

**Tempo esperado:** 3-5 minutos

---

## 📝 O que há de novo nesta atualização

### Módulo de Aprovação de Orçamentos
- **Nova página**: `/orcamentos/aprovacao`
- **Funcionalidades**:
  - Listar orçamentos pendentes
  - Filtrar por tipo (Obra Geral, Terraplanagem, Cobertura, etc.)
  - Selecionar e remover em lote
  - Aprovar orçamentos individuais
  - **Gera automaticamente**:
    - Fornecedores
    - Despesas
    - Fases/Etapas
    - Prazos

### Tabela de Mudanças
| Componente | Mudanças |
|-----------|----------|
| **Backend** | Novo endpoint `/api/orcamentos/:id/aprovar` |
| **DB** | Campo `tipo_orcamento` em `orcamentos` |
| **Frontend** | Nova página + card + seleção em lote |
| **Menu** | Novo item "Aprovar Orçamentos" |

---

## 🔧 Deployment Passo a Passo

### 1. Conectar à VPS

```bash
ssh -i ~/.ssh/id_rsa root@hkfazendas.com
# ou
ssh root@hkfazendas.com
```

### 2. Navegar até o projeto

```bash
cd /home/pawliv/obras
```

### 3. Executar o script de deploy

```bash
sudo bash deploy.sh
```

O script fará:

#### Etapa 1: Git Update
```
Fetching from origin...
Pulling main branch...
```

#### Etapa 2: Database Migration
```
Executando migration para adicionar campo tipo_orcamento...
```

#### Etapa 3: Frontend Rebuild
```
Rebuilding Docker image do frontend...
```

#### Etapa 4: Reiniciar Serviços
```
Parando containers...
Iniciando containers...
```

#### Etapa 5: Health Check
```
Aguardando API ficar pronta...
API está respondendo!
```

### 4. Verificar status

```bash
docker-compose ps
```

Saída esperada:
```
NAME                 STATUS
obras-postgres       Up 2 minutes
obras-backend        Up 2 minutes
obras-frontend       Up 2 minutes (healthy)
```

---

## 🧪 Testar o Deployment

### Via Health Check Script

```bash
cd /home/pawliv/obras
sudo bash deploy-health-check.sh
```

Verifica:
- ✅ Containers rodando
- ✅ API respondendo
- ✅ Frontend acessível
- ✅ Banco de dados operacional
- ✅ Campo `tipo_orcamento` criado
- ✅ Certificado SSL válido
- ✅ Espaço em disco
- ✅ Memória disponível

### Via Browser

Abra: https://hkfazendas.com

1. Faça login
2. Vá para "Aprovar Orçamentos" (novo menu)
3. Selecione uma obra
4. Veja a nova página funcionando

---

## 📊 Monitorar Após Deploy

### Ver logs em tempo real

```bash
docker-compose logs -f
```

### Ver logs de um serviço específico

```bash
# Backend
docker-compose logs -f backend

# Frontend
docker-compose logs -f frontend

# Banco de dados
docker-compose logs -f postgres
```

### Verificar recursos

```bash
docker stats
```

---

## ⚠️ Troubleshooting

### Problema: API não responde (HTTP 502)

```bash
# Ver logs do backend
docker-compose logs backend

# Reiniciar apenas backend
docker-compose restart backend

# Se persistir, verificar se está ouvindo na porta
docker-compose exec backend lsof -i :3001
```

### Problema: Banco de dados não conecta

```bash
# Verificar status do container
docker-compose logs postgres

# Reiniciar banco
docker-compose restart postgres

# Reconectar
docker-compose exec postgres psql -U pawliv -d obras -c "SELECT 1"
```

### Problema: Frontend em branco

```bash
# Limpar cache do browser (Ctrl+Shift+Delete)
# Ou recarregar: Ctrl+F5

# Se o problema persistir, verificar logs:
docker-compose logs frontend

# Rebuild apenas frontend
docker-compose build --no-cache frontend
docker-compose up -d frontend
```

### Problema: Migrations não rodaram

```bash
# Verificar se o campo foi criado
docker-compose exec postgres psql -U pawliv -d obras -c "\d orcamentos"

# Executar manualmente se necessário
docker-compose exec postgres psql -U pawliv -d obras << EOF
ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS tipo_orcamento VARCHAR(100);
EOF
```

---

## 🔍 Rollback (Voltar versão anterior)

Se algo deu muito errado:

```bash
# Voltar para commit anterior
cd /home/pawliv/obras
git reset --hard HEAD~1
git pull origin main

# Reiniciar
sudo bash deploy.sh
```

---

## 📋 Checklist Pré-Deploy

- [ ] Fez backup do banco de dados
- [ ] Notificou usuários sobre manutenção (se necessário)
- [ ] Testou as mudanças localmente
- [ ] Reviewou os commits que serão deployados
- [ ] Tem acesso SSH à VPS
- [ ] Certificado SSL ainda é válido (checando com: `openssl x509 -enddate -noout -in /etc/letsencrypt/live/hkfazendas.com/cert.pem`)

---

## ✅ Checklist Pós-Deploy

- [ ] Correu o `deploy.sh` sem erros
- [ ] Rodou `deploy-health-check.sh` com sucesso
- [ ] Frontend carrega em https://hkfazendas.com
- [ ] Consegue fazer login
- [ ] Nova página "Aprovar Orçamentos" existe no menu
- [ ] Pode filtrar orçamentos por tipo
- [ ] Pode selecionar orçamentos (checkbox)
- [ ] Pode remover em lote
- [ ] Pode aprovar um orçamento (gera despesas/fases)

---

## 🆘 Suporte

Em caso de problemas:

1. **Checar logs**: `docker-compose logs -f`
2. **Executar health check**: `sudo bash deploy-health-check.sh`
3. **Reiniciar tudo**: `docker-compose down && docker-compose up -d`
4. **Contatar suporte** com outputs dos logs

---

## 📈 Monitoramento Contínuo

Configure alertas para:
- CPU > 80%
- Memória > 85%
- Disco < 10GB
- API responsiveness > 5s

Sugestão: Use ferramentas como Prometheus + Grafana ou New Relic.

---

## 🔄 Atualizações Futuras

Para futuras atualizações:

```bash
# É só rodar de novo!
cd /home/pawliv/obras
sudo bash deploy.sh
```

Sem necessidade de downtime significativo (rolling restart com Docker).

---

## 📞 Contato

Dúvidas sobre deployment? Entre em contato com:
- Email: ggpauliv@gmail.com
- Documentação: Ver `CHANGELOG.md` para histórico de mudanças

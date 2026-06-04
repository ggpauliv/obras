# Deploy — Pawliv Obras na VPS

## Arquitetura de produção

```
Internet → Nginx (porta 80)
               ├── /        → React (arquivos estáticos)
               └── /api/*   → Backend Node.js (porta 3001 interna)
                                  └── PostgreSQL (porta 5432 interna)
```

Tudo roda em Docker Compose. Um único comando sobe o sistema completo.

---

## Pré-requisitos na VPS

Ubuntu 22.04 LTS (ou similar).

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Instalar Docker Compose plugin
sudo apt install -y docker-compose-plugin

# Instalar Git
sudo apt install -y git

# Verificar instalações
docker --version
docker compose version
git --version
```

---

## 1. Clonar o repositório

```bash
cd /opt
sudo git clone https://github.com/ggpauliv/obras.git
sudo chown -R $USER:$USER /opt/obras
cd /opt/obras
```

---

## 2. Criar o arquivo `.env.local`

```bash
cp .env.local.example .env.local
nano .env.local
```

Preencha com os valores de produção:

```env
# Gemini API — obtenha em https://aistudio.google.com/app/apikey
REACT_APP_GEMINI_API_KEY=sua-chave-aqui

# JWT — gere com: openssl rand -hex 32
JWT_SECRET=cole-aqui-o-segredo-gerado

# PostgreSQL (Docker interno — não mude host/port)
DB_HOST=postgres
DB_PORT=5432
DB_NAME=pawliv_obras
DB_USER=pawliv_user
DB_PASSWORD=senha-forte-aqui
```

> ⚠️ `DB_HOST=postgres` e `DB_PORT=5432` são obrigatórios em produção  
> (o backend se comunica com o postgres via rede interna Docker)

---

## 3. Build e subida

```bash
# Build das imagens + subida dos containers
docker compose -f docker-compose.prod.yml up -d --build
```

O primeiro build demora ~3–5 min (baixa imagens e compila o React).

---

## 4. Verificar que está rodando

```bash
# Ver containers
docker compose -f docker-compose.prod.yml ps

# Health check da API
curl http://localhost/api/health

# Logs em tempo real
docker compose -f docker-compose.prod.yml logs -f
```

Saída esperada do `ps`:
```
NAME               STATUS
pawliv-postgres    Up (healthy)
pawliv-backend     Up
pawliv-frontend    Up
```

---

## 5. Primeiro acesso

Abra `http://<IP-DA-VPS>` no browser.

Login padrão (seed do banco):
```
Usuário:  ggpauliv
Senha:    110989
```

> Troque a senha após o primeiro acesso.

---

## Comandos úteis

```bash
# Parar tudo
docker compose -f docker-compose.prod.yml down

# Reiniciar apenas o backend (após atualização)
docker compose -f docker-compose.prod.yml restart backend

# Ver logs de um serviço específico
docker compose -f docker-compose.prod.yml logs -f backend

# Entrar no banco via psql
docker exec -it pawliv-postgres psql -U pawliv_user -d pawliv_obras

# Fazer backup do banco
docker exec pawliv-postgres pg_dump -U pawliv_user pawliv_obras > backup_$(date +%Y%m%d).sql
```

---

## Atualizar após novo push

```bash
cd /opt/obras
git pull

# Rebuild e restart
docker compose -f docker-compose.prod.yml up -d --build
```

---

## HTTPS com Certbot (opcional)

```bash
# Instalar Certbot
sudo apt install -y certbot

# Parar nginx do Docker temporariamente
docker compose -f docker-compose.prod.yml stop frontend

# Gerar certificado (substitua pelo seu domínio)
sudo certbot certonly --standalone -d seudominio.com.br

# Após isso, ajustar nginx.conf para HTTPS e rebuild
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Solução de problemas

| Problema | Causa provável | Solução |
|----------|---------------|---------|
| `backend` não sobe | `postgres` ainda iniciando | `docker compose restart backend` |
| "Erro no servidor" ao logar | DB_HOST/DB_PORT errado | Confirme `DB_HOST=postgres` e `DB_PORT=5432` no `.env.local` |
| Build falha no React | Memória insuficiente | VPS precisa de mínimo 1 GB RAM (2 GB recomendado) |
| Porta 80 ocupada | Nginx local rodando | `sudo systemctl stop nginx` |

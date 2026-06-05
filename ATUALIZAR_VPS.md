# Atualizar a aplicação na VPS (Docker)

Guia rápido para puxar o código novo do GitHub e atualizar os contêineres.
VPS: `/opt/obras` · Domínio: https://hkfazendas.com

> ⚠️ **Sempre use `--env-file .env.local`** nos comandos do compose — sem isso o
> Postgres sobe sem credenciais e quebra. (Alternativa: ter um `.env` = cópia do
> `.env.local`.)

---

## Atualização padrão (deploy de código novo)

```bash
cd /opt/obras
git pull
docker compose --env-file .env.local -f docker-compose.prod.yml up -d --build
```

Verificar:
```bash
docker compose -f docker-compose.prod.yml ps        # 3 containers Up (postgres healthy)
curl -sI https://hkfazendas.com | head -3            # HTTP/.. 200
```

> O **primeiro build após mexer no backend** demora mais (instala Python +
> XlsxWriter na imagem). Depois fica em cache.

---

## Comandos úteis

```bash
# Logs (últimas linhas) de um serviço
docker compose -f docker-compose.prod.yml logs --tail 50 backend
docker compose -f docker-compose.prod.yml logs --tail 50 frontend

# Reiniciar só o backend (ex.: após trocar a chave no .env.local)
docker compose --env-file .env.local -f docker-compose.prod.yml up -d backend

# Entrar no banco
docker exec -it pawliv-postgres psql -U pawliv_user -d pawliv_obras

# Backup do banco
docker exec pawliv-postgres pg_dump -U pawliv_user pawliv_obras > /root/backup_$(date +%F).sql
```

---

## Variáveis (`.env.local` na VPS)

```env
REACT_APP_GEMINI_API_KEY=...    # chave do Gemini (projeto PAGO/standard)
REACT_APP_API_URL=              # VAZIO em produção (nginx faz proxy /api)
JWT_SECRET=...                  # openssl rand -hex 32
DB_NAME=pawliv_obras
DB_USER=pawliv_user
DB_PASSWORD=...
# DB_HOST/DB_PORT são forçados pelo compose (postgres/5432)
```

Login inicial: `ggpauliv` / `110989` (troque a senha).

---

## HTTPS / Certificado (Let's Encrypt)

Já configurado. Renovação automática via cron (segunda 3h). Renovar manualmente:
```bash
docker run --rm -v /etc/letsencrypt:/etc/letsencrypt -v /var/www/certbot:/var/www/certbot \
  certbot/certbot renew --webroot -w /var/www/certbot && docker exec pawliv-frontend nginx -s reload
```

---

## Solução de problemas

| Sintoma | Causa provável | Ação |
|---|---|---|
| Postgres "unhealthy" / `WARN ... not set` | faltou `--env-file .env.local` | rode o compose com o flag |
| Login falha (novo usuário) | caixa do e-mail | login é case-insensitive; confira a senha |
| Excel sem gráficos / erro | Python/XlsxWriter ausente | rebuild do backend (Dockerfile instala) |
| Build do React "killed" | RAM insuficiente | swap já configurado (2 GB); confira `free -h` |
| Site não abre | container parado / porta | `docker compose ... ps` e `logs` |

---

## Desenvolvimento em outro computador

```bash
git clone https://github.com/ggpauliv/obras.git
cd obras
cp .env.local.example .env.local   # preencha a chave Gemini, etc. (DB local: porta 5433)
npm install
# Dev local depende de Postgres + API. Para subir o banco local:
docker compose up -d            # docker-compose.yml de desenvolvimento (Postgres + pgAdmin)
npm start                       # frontend (3000) + backend (3001)
```

> O `tsc --noEmit` valida o frontend. O gerador de Excel (`excel_orcamentos.py`)
> precisa de Python + `XlsxWriter` para rodar fora do Docker.

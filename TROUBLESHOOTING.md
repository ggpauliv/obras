# 🔧 Troubleshooting — Pawliv Obras

Soluções para problemas comuns após deploy.

---

## 🔴 API não responde (HTTP 502/503)

### Sintomas
- Erro "Bad Gateway" ao acessar https://hkfazendas.com
- Logs mostram erros de conexão

### Diagnóstico
```bash
# Ver logs do backend
docker-compose logs backend | tail -50

# Verificar se container está rodando
docker-compose ps | grep backend

# Tentar conectar manualmente
docker-compose exec backend curl http://localhost:3001/api/health
```

### Soluções

#### Solução 1: Reiniciar backend
```bash
docker-compose restart backend
sleep 5
curl http://localhost/api/health
```

#### Solução 2: Reiniciar tudo
```bash
docker-compose down
sleep 3
docker-compose up -d
sleep 5
docker-compose logs -f
```

#### Solução 3: Rebuild backend
```bash
docker-compose build --no-cache backend
docker-compose up -d backend
docker-compose logs -f backend
```

---

## 🔴 Frontend não carrega (página em branco)

### Sintomas
- Página branca, sem erros no console
- CSS não está sendo aplicado
- Pode carregar assets

### Diagnóstico
```bash
# Ver logs do nginx
docker-compose logs frontend | tail -50

# Testar acesso ao nginx
curl -v https://hkfazendas.com

# Verificar se o build foi bem-sucedido
docker-compose exec frontend ls -la /usr/share/nginx/html/
```

### Soluções

#### Solução 1: Limpar cache do browser
- Abrir DevTools (F12)
- Ir em Network → Desabilitar cache
- Recarregar página (Ctrl+Shift+R ou Cmd+Shift+R)

#### Solução 2: Rebuild frontend
```bash
docker-compose build --no-cache frontend
docker-compose up -d frontend
docker-compose logs -f frontend
```

#### Solução 3: Testar localmente
```bash
# Dentro do container
docker-compose exec frontend sh

# Verificar arquivos
ls -la /usr/share/nginx/html/
cat /usr/share/nginx/html/index.html | head -20

# Se estiver vazio, rebuild é necessário
```

---

## 🔴 Banco de dados não conecta

### Sintomas
- Erro "psql: could not translate host name"
- API mostra erros de conexão com DB
- Login não funciona

### Diagnóstico
```bash
# Ver logs do postgres
docker-compose logs postgres | tail -50

# Verificar se container está rodando
docker-compose ps | grep postgres

# Tentar conectar
docker-compose exec postgres psql -U pawliv -d obras -c "SELECT 1"
```

### Soluções

#### Solução 1: Reiniciar postgres
```bash
docker-compose restart postgres
sleep 10
docker-compose exec postgres psql -U pawliv -d obras -c "SELECT 1"
```

#### Solução 2: Verificar volume
```bash
# Listar volumes
docker volume ls | grep postgres

# Verificar se há dados
docker volume inspect obras_postgres_data

# Se estiver vazio, pode ser loss de dados
```

#### Solução 3: Restaurar backup
```bash
# Se tem backup recente
docker-compose exec -T postgres psql -U pawliv obras < /home/pawliv/backups/db_backup_YYYYMMDD_HHMMSS.sql
```

---

## 🔴 Memory leak / Alto uso de memória

### Sintomas
- Servidor fica lento
- OOM killer mata containers
- `docker stats` mostra > 80% de uso

### Diagnóstico
```bash
# Ver uso em tempo real
docker stats

# Ver detalhes de cada container
docker-compose exec backend ps aux | grep node

# Mem leak no Node?
docker-compose exec backend kill -3 <PID>  # gera heap dump
```

### Soluções

#### Solução 1: Reiniciar backend
```bash
docker-compose restart backend
```

#### Solução 2: Aumentar limites
Editar `docker-compose.prod.yml`:
```yaml
backend:
  mem_limit: 512m
  memswap_limit: 512m
```

Depois:
```bash
docker-compose up -d
```

#### Solução 3: Monitorar detalhadamente
```bash
# Instalar node-inspect (não recomendado em produção)
# Melhor: Use ferramentas externas como New Relic, Datadog
```

---

## 🔴 Certificado SSL expirado

### Sintomas
- Browser mostra "Conexão não segura"
- HTTPS não funciona
- Erro: "Certificate has expired"

### Diagnóstico
```bash
# Ver data de expiração
openssl x509 -enddate -noout -in /etc/letsencrypt/live/hkfazendas.com/cert.pem

# Ver certificado completo
openssl x509 -text -noout -in /etc/letsencrypt/live/hkfazendas.com/cert.pem
```

### Soluções

#### Solução 1: Renovar Let's Encrypt (automático)
```bash
# Deveria ser automático via cron, mas se não estiver:
certbot renew --force-renewal

# Recarregar nginx
docker-compose exec frontend nginx -s reload
```

#### Solução 2: Verificar cron de renovação
```bash
# Ver cron jobs
crontab -l

# Deve ter algo como:
# 0 3 * * * certbot renew --quiet && systemctl reload nginx
```

#### Solução 3: Renovar manualmente
```bash
certbot certonly --standalone -d hkfazendas.com
# ou
certbot certonly --webroot -w /var/www/html -d hkfazendas.com
```

---

## 🔴 Campo `tipo_orcamento` não foi criado

### Sintomas
- Erro ao aprovar orçamento: "column tipo_orcamento does not exist"
- Seletor de tipo não funciona

### Diagnóstico
```bash
# Verificar estrutura da tabela
docker-compose exec postgres psql -U pawliv -d obras -c "\d orcamentos"

# Procurar por tipo_orcamento
docker-compose exec postgres psql -U pawliv -d obras -c "SELECT column_name FROM information_schema.columns WHERE table_name='orcamentos'"
```

### Soluções

#### Solução 1: Criar campo manualmente
```bash
docker-compose exec postgres psql -U pawliv -d obras << EOF
ALTER TABLE orcamentos
  ADD COLUMN IF NOT EXISTS tipo_orcamento VARCHAR(100);

-- Verificar
SELECT column_name FROM information_schema.columns 
WHERE table_name='orcamentos' AND column_name='tipo_orcamento';
EOF
```

#### Solução 2: Re-rodar migrations
```bash
# Deletar container postgres (cuidado!)
docker-compose down postgres

# Remover volume (DELETE DADOS!)
docker volume rm obras_postgres_data

# Recriar
docker-compose up -d postgres
sleep 10

# Seed inicial
docker-compose exec postgres psql -U pawliv -d obras < db/init.sql
docker-compose exec postgres psql -U pawliv -d obras < db/seed.sql
```

---

## 🔴 Git sync error

### Sintomas
- Deploy script falha em `git pull`
- Erro: "Your local changes to 'X' would be overwritten by merge"

### Diagnóstico
```bash
# Ver status do git
cd /home/pawliv/obras
git status

# Ver commits não sincronizados
git log --oneline origin/main..HEAD
```

### Soluções

#### Solução 1: Stash mudanças locais
```bash
git stash
git pull origin main
git stash pop
```

#### Solução 2: Reset hard (descarta mudanças locais)
```bash
git reset --hard origin/main
```

#### Solução 3: Se há commits locais não pusheados
```bash
git push origin main
# depois
git pull origin main
```

---

## 🔴 Disk space cheio

### Sintomas
- Deploy falha: "No space left on device"
- Containers não conseguem escrever logs
- Build falha

### Diagnóstico
```bash
# Ver uso de disco
df -h

# Ver o que está usando espaço
du -sh /* | sort -rh | head -10

# Limpar Docker (cuidado!)
docker system prune -a  # Remove imagens, containers, volumes não usados
```

### Soluções

#### Solução 1: Limpar logs antigos
```bash
# Limpar logs do Docker
docker exec $(docker ps -q) sh -c 'truncate -s 0 /var/lib/docker/containers/*/*-json.log'

# Ou manualmente
rm -rf /var/lib/docker/containers/*/*-json.log
```

#### Solução 2: Expandir disco
```bash
# Se usando LVM ou cloud provider, expandir partição
# Exemplo AWS: aumentar EBS e estender partição

lsblk  # ver discos
df -h  # ver montagem
```

#### Solução 3: Remover backups antigos
```bash
# Backups > 30 dias
find /home/pawliv/backups -type f -mtime +30 -delete
```

---

## 🟡 Slow API response (> 5s)

### Sintomas
- Requests lentos
- Timeout em importação de orçamentos
- Gemini API lenta

### Diagnóstico
```bash
# Testar latência
time curl -w "\nTempo: %{time_total}s\n" http://localhost/api/health

# Ver logs com duração
docker-compose logs backend | grep -i "took\|duration\|ms"

# Monitorar em tempo real
docker stats backend
```

### Soluções

#### Solução 1: Aumentar timeout
No `server-api.js`, aumentar timeout do Gemini:
```javascript
// De: 40000 para 60000
espera = Math.min(Math.ceil(parseFloat(m[1])) * 1000 + 1000, 60000);
```

#### Solução 2: Cache de respostas
Implementar cache no Redis (upgrade futuro)

#### Solução 3: Aumentar recursos
```yaml
# docker-compose.prod.yml
backend:
  cpus: "0.5"  # aumentar de 0.25
  mem_limit: 512m  # aumentar de 256m
```

---

## 💡 Comandos Úteis

### Logs
```bash
# Últimas 50 linhas
docker-compose logs --tail=50 backend

# Follow (tempo real)
docker-compose logs -f

# Grep em logs
docker-compose logs | grep "ERROR\|error"
```

### Containers
```bash
# Status
docker-compose ps

# Reiniciar um
docker-compose restart backend

# Recrear (pode descartar dados)
docker-compose up -d --force-recreate backend

# Shell dentro do container
docker-compose exec backend bash
```

### Banco de Dados
```bash
# Conectar ao postgres
docker-compose exec postgres psql -U pawliv -d obras

# Executar query
docker-compose exec postgres psql -U pawliv -d obras -c "SELECT COUNT(*) FROM orcamentos"

# Backup
docker-compose exec -T postgres pg_dump -U pawliv obras > backup.sql
```

### Verificação
```bash
# Health check
curl http://localhost/api/health

# Portas em uso
docker-compose exec backend lsof -i :3001

# Variáveis de ambiente
docker-compose exec backend env | grep -i gemini
```

---

## 📞 Suporte

Se nada funcionar:

1. **Rodar health check**: `sudo bash deploy-health-check.sh`
2. **Coletar logs**: `docker-compose logs > /tmp/logs.txt`
3. **Fazer rollback**: `sudo bash deploy-rollback.sh`
4. **Contactar**: ggpauliv@gmail.com (incluir logs.txt)

---

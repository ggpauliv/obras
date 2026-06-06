#!/bin/bash
##############################################################################
# HEALTH CHECK — Pawliv Obras
#
# Verifica a saúde dos serviços pós-deploy
#
# Uso: ./deploy-health-check.sh
##############################################################################

set -e

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

echo ""
log_info "========================================"
log_info "HEALTH CHECK — Pawliv Obras"
log_info "========================================"
echo ""

# 1. Docker containers
log_info "1️⃣  Verificando Docker containers..."
docker-compose ps
echo ""

# 2. API Health endpoint
log_info "2️⃣  Testando API health endpoint..."
if response=$(curl -s -w "\n%{http_code}" http://localhost/api/health); then
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)

  if [ "$http_code" == "200" ]; then
    log_success "API está respondendo (HTTP 200)"
    echo "Resposta: $body"
  else
    log_error "API retornou HTTP $http_code"
    echo "Resposta: $body"
  fi
else
  log_error "Falha ao conectar à API"
fi
echo ""

# 3. Frontend accessibility
log_info "3️⃣  Testando acesso ao frontend..."
if response=$(curl -s -w "\n%{http_code}" http://localhost/ 2>/dev/null); then
  http_code=$(echo "$response" | tail -n1)
  if [ "$http_code" == "200" ]; then
    log_success "Frontend está acessível (HTTP 200)"
  else
    log_error "Frontend retornou HTTP $http_code"
  fi
else
  log_error "Falha ao conectar ao frontend"
fi
echo ""

# 4. Database connection
log_info "4️⃣  Testando conexão com banco de dados..."
if docker-compose exec -T postgres psql -U pawliv -d obras -c "SELECT 1" > /dev/null 2>&1; then
  log_success "Banco de dados está acessível"
  # Verifica se a migration foi aplicada
  if docker-compose exec -T postgres psql -U pawliv -d obras -c "SELECT column_name FROM information_schema.columns WHERE table_name='orcamentos' AND column_name='tipo_orcamento'" | grep -q "tipo_orcamento"; then
    log_success "Campo tipo_orcamento existe na tabela orcamentos"
  else
    log_warn "Campo tipo_orcamento NÃO encontrado na tabela orcamentos"
  fi
else
  log_error "Falha ao conectar ao banco de dados"
fi
echo ""

# 5. SSL Certificate
log_info "5️⃣  Verificando certificado SSL..."
CERT_FILE="/etc/letsencrypt/live/hkfazendas.com/cert.pem"
if [ -f "$CERT_FILE" ]; then
  expiry_date=$(openssl x509 -enddate -noout -in "$CERT_FILE" | cut -d= -f2)
  log_success "Certificado SSL encontrado"
  echo "Expira em: $expiry_date"
else
  log_warn "Certificado SSL não encontrado em $CERT_FILE"
fi
echo ""

# 6. Disk space
log_info "6️⃣  Verificando espaço em disco..."
available=$(df /home | awk 'NR==2 {print $4}')
available_gb=$((available / 1024 / 1024))
if [ $available_gb -gt 10 ]; then
  log_success "Espaço disponível: ${available_gb}GB"
else
  log_warn "Espaço disponível baixo: ${available_gb}GB"
fi
echo ""

# 7. Memory usage
log_info "7️⃣  Verificando uso de memória..."
total_mem=$(free | awk 'NR==2 {print $2}')
used_mem=$(free | awk 'NR==2 {print $3}')
used_percent=$((used_mem * 100 / total_mem))
log_info "Memória: ${used_percent}% em uso (${used_mem}MB / ${total_mem}MB)"

if [ $used_percent -gt 90 ]; then
  log_warn "Uso de memória acima de 90%!"
elif [ $used_percent -gt 80 ]; then
  log_warn "Uso de memória acima de 80%"
else
  log_success "Uso de memória normal"
fi
echo ""

# 8. CPU load
log_info "8️⃣  Verificando carga do CPU..."
load=$(uptime | awk -F'load average:' '{print $2}')
log_info "Load average: $load"
echo ""

# Resumo final
echo ""
log_success "========================================"
log_success "HEALTH CHECK FINALIZADO"
log_success "========================================"
echo ""
echo "Para ver logs em tempo real:"
echo "  docker-compose logs -f"
echo ""

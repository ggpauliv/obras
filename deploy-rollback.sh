#!/bin/bash
##############################################################################
# ROLLBACK SCRIPT — Pawliv Obras
#
# Volta para a versão anterior se algo deu errado
#
# Uso: ./deploy-rollback.sh [commits]
#      ./deploy-rollback.sh      # volta 1 commit
#      ./deploy-rollback.sh 2    # volta 2 commits
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
log_error() { echo -e "${RED}❌ $1${NC}"; exit 1; }

# Verifica se é root
if [ "$EUID" -ne 0 ]; then
  log_error "Este script deve ser executado como root (ou com sudo)"
fi

PROJECT_DIR="/home/pawliv/obras"
ROLLBACK_COMMITS=${1:-1}

log_warn "================================"
log_warn "⚠️  ROLLBACK — USE COM CUIDADO"
log_warn "================================"
echo ""
log_warn "Isto irá descartar as últimas $ROLLBACK_COMMITS mudança(s)!"
echo ""

# Mostra commits que serão descartados
log_info "Commits a descartar:"
cd "$PROJECT_DIR"
git log --oneline -n $ROLLBACK_COMMITS
echo ""

# Pede confirmação
read -p "Deseja continuar? (s/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
  log_error "Rollback cancelado"
fi

echo ""
log_warn "Iniciando rollback..."
echo ""

# 1. Para containers
log_info "1️⃣  Parando containers..."
docker-compose down
sleep 2
log_success "Containers parados"

# 2. Git reset
log_info "2️⃣  Descartando commits..."
git reset --hard HEAD~$ROLLBACK_COMMITS
log_success "Commits descartados"

# 3. Mostra novo estado
log_info "3️⃣  Novo estado do repositório:"
git log --oneline -n 3
echo ""

# 4. Rebuild frontend
log_info "4️⃣  Reconstruindo frontend..."
if docker images | grep -q "obras-frontend"; then
  docker-compose build --no-cache frontend
  log_success "Frontend rebuildo"
else
  log_warn "Imagem do frontend não encontrada"
fi

# 5. Reinicia
log_info "5️⃣  Iniciando containers..."
docker-compose up -d
sleep 5
log_success "Containers reiniciados"

# 6. Health check
log_info "6️⃣  Executando health check..."
max_attempts=30
attempt=0

until [ $attempt -ge $max_attempts ]; do
  if curl -s http://localhost/api/health | grep -q "ok"; then
    log_success "API está respondendo!"
    break
  fi
  attempt=$((attempt + 1))
  if [ $attempt -lt $max_attempts ]; then
    log_info "Tentativa $attempt/$max_attempts: Aguardando API..."
    sleep 2
  fi
done

echo ""
log_success "================================"
log_success "ROLLBACK CONCLUÍDO"
log_success "================================"
echo ""
log_info "Status dos containers:"
docker-compose ps
echo ""

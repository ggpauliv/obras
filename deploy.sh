#!/bin/bash
##############################################################################
# SCRIPT DE DEPLOY — Pawliv Obras
#
# Atualiza a aplicação na VPS:
# - Pull do repositório
# - Migrations do banco
# - Rebuild do frontend
# - Reinicia serviços
#
# Uso: ./deploy.sh
##############################################################################

set -e  # Exit on error

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funções helper
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; exit 1; }

# Verifica se está rodando como root (necessário para docker)
if [ "$EUID" -ne 0 ]; then
  log_error "Este script deve ser executado como root (ou com sudo)"
fi

# Define variáveis
PROJECT_DIR="/home/pawliv/obras"
DB_CONTAINER="obras-postgres"
BACKEND_CONTAINER="obras-backend"
FRONTEND_CONTAINER="obras-frontend"

log_info "================================"
log_info "PAWLIV OBRAS — DEPLOY SCRIPT"
log_info "================================"

# 1. Valida que estamos no diretório correto
if [ ! -d "$PROJECT_DIR/.git" ]; then
  log_error "Diretório de projeto não encontrado em $PROJECT_DIR"
fi

cd "$PROJECT_DIR"
log_success "Navegou para $PROJECT_DIR"

# 2. Pull do repositório
log_info "1️⃣  Atualizando código do repositório..."
git fetch origin
git pull origin main
log_success "Código atualizado"

# 3. Executa migrations do banco de dados
log_info "2️⃣  Aplicando migrations do banco de dados..."

# Verifica se o docker-compose está rodando
if ! docker-compose ps | grep -q "$DB_CONTAINER"; then
  log_error "Container PostgreSQL não está rodando! Inicie com: docker-compose up -d"
fi

# Executa a migration
log_info "Executando migration para adicionar campo tipo_orcamento..."
docker-compose exec -T "$DB_CONTAINER" psql -U pawliv -d obras << EOF
-- Migration: adiciona campo tipo_orcamento se não existir
ALTER TABLE orcamentos
  ADD COLUMN IF NOT EXISTS tipo_orcamento VARCHAR(100);

-- Verifica se foi adicionado
SELECT column_name FROM information_schema.columns
WHERE table_name = 'orcamentos' AND column_name = 'tipo_orcamento';
EOF

log_success "Migrations executadas"

# 4. Rebuild frontend (React)
log_info "3️⃣  Reconstruindo frontend (React)..."
if [ -f "package.json" ]; then
  # Se estiver rodando em container, rebuild da imagem
  if docker images | grep -q "obras-frontend"; then
    log_info "Rebuilding Docker image do frontend..."
    docker-compose build --no-cache frontend
    log_success "Frontend rebuildo"
  else
    log_warn "Imagem do frontend não encontrada, executando npm build localmente..."
    npm ci --legacy-peer-deps
    npm run build
    log_success "Frontend build completo"
  fi
else
  log_warn "Arquivo package.json não encontrado"
fi

# 5. Reinicia os serviços
log_info "4️⃣  Reiniciando serviços (backend + nginx)..."
docker-compose down
sleep 2
docker-compose up -d
log_success "Serviços reiniciados"

# 6. Aguarda que os serviços estejam prontos
log_info "5️⃣  Aguardando serviços ficarem prontos..."
sleep 5

# 7. Health check
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

if [ $attempt -ge $max_attempts ]; then
  log_error "Health check falhou! Verifique os logs com: docker-compose logs -f"
fi

# 8. Exibe status final
log_info "7️⃣  Status final dos containers..."
docker-compose ps

echo ""
log_success "================================"
log_success "DEPLOY CONCLUÍDO COM SUCESSO! 🎉"
log_success "================================"
echo ""
echo "URLs de acesso:"
echo "  Frontend:  https://hkfazendas.com"
echo "  Backend:   https://hkfazendas.com/api"
echo ""
echo "Ver logs:"
echo "  Todos:     docker-compose logs -f"
echo "  Backend:   docker-compose logs -f backend"
echo "  Frontend:  docker-compose logs -f frontend"
echo "  DB:        docker-compose logs -f postgres"
echo ""

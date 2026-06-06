#!/bin/bash
##############################################################################
# BACKUP SCRIPT — Pawliv Obras
#
# Faz backup do banco de dados e arquivos importantes antes do deploy
#
# Uso: ./deploy-backup.sh
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
BACKUP_DIR="/home/pawliv/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_BACKUP="$BACKUP_DIR/db_backup_$TIMESTAMP.sql"
FILES_BACKUP="$BACKUP_DIR/files_backup_$TIMESTAMP.tar.gz"

log_info "================================"
log_info "BACKUP — Pawliv Obras"
log_info "================================"
echo ""

# Cria diretório de backup se não existir
mkdir -p "$BACKUP_DIR"
log_success "Diretório de backup: $BACKUP_DIR"

# 1. Backup do banco de dados
log_info "1️⃣  Fazendo backup do banco de dados..."
docker-compose exec -T postgres pg_dump -U pawliv obras > "$DB_BACKUP"

if [ -f "$DB_BACKUP" ]; then
  size=$(du -h "$DB_BACKUP" | cut -f1)
  log_success "Backup do DB salvo: $DB_BACKUP ($size)"
else
  log_error "Falha ao fazer backup do banco de dados"
fi

# 2. Backup de arquivos importantes
log_info "2️⃣  Fazendo backup de arquivos importantes..."
tar -czf "$FILES_BACKUP" \
  -C "$PROJECT_DIR" \
  db/init.sql \
  db/seed.sql \
  docker-compose.prod.yml \
  .env.local \
  2>/dev/null || true

if [ -f "$FILES_BACKUP" ]; then
  size=$(du -h "$FILES_BACKUP" | cut -f1)
  log_success "Backup de arquivos salvo: $FILES_BACKUP ($size)"
else
  log_warn "Nenhum arquivo importante encontrado para backup"
fi

# 3. Listagem de commits recentes
log_info "3️⃣  Salvando histórico de commits..."
cd "$PROJECT_DIR"
git log --oneline -n 20 > "$BACKUP_DIR/commits_$TIMESTAMP.txt"
log_success "Histórico de commits salvo"

# 4. Status dos containers
log_info "4️⃣  Salvando status dos containers..."
docker-compose ps > "$BACKUP_DIR/containers_$TIMESTAMP.txt"
log_success "Status dos containers salvo"

# 5. Resumo
echo ""
log_success "================================"
log_success "BACKUP COMPLETO ✅"
log_success "================================"
echo ""
echo "Arquivos de backup:"
ls -lh "$BACKUP_DIR/backup_"* 2>/dev/null || ls -lh "$BACKUP_DIR/" | grep "$TIMESTAMP"
echo ""
echo "Para restaurar o banco:"
echo "  docker-compose exec -T postgres psql -U pawliv obras < $DB_BACKUP"
echo ""
echo "Para restaurar arquivos:"
echo "  tar -xzf $FILES_BACKUP -C $PROJECT_DIR"
echo ""

# Limpa backups antigos (mais de 7 dias)
log_info "5️⃣  Limpando backups antigos (> 7 dias)..."
find "$BACKUP_DIR" -type f -mtime +7 -delete
log_success "Backups antigos removidos"

echo ""
log_success "Tudo pronto para deploy! ✨"
echo ""

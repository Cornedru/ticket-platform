#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_NAME="ticket-platform"
COMPOSE_FILE="docker-compose.yml"
ENV_FILE=".env"

echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   🚀 DEPLOIEMENT - ${PROJECT_NAME}${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_requirements() {
    log_info "Vérification des prérequis..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker n'est pas installé"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        log_error "Docker Compose n'est pas installé"
        exit 1
    fi
    
    if [ ! -f "$ENV_FILE" ]; then
        log_warn "Fichier .env non trouvé - création depuis template..."
        cp .env.example "$ENV_FILE" 2>/dev/null || true
        log_warn "Veuillez configurer $ENV_FILE avant de continuer"
        exit 1
    fi
    
    log_info "Prérequis OK"
}

pull_code() {
    log_info "Mise à jour du code..."
    
    if [ -d ".git" ]; then
        if command -v git &> /dev/null; then
            git pull origin main 2>/dev/null || log_warn "Git pull échoué - utilisation du code local"
        fi
    fi
    
    log_info "Code OK"
}

setup_permissions() {
    log_info "Configuration des permissions..."
    
    chmod +x deploy.sh 2>/dev/null || true
    
    if [ -d "backend" ]; then
        chmod -R 755 backend/node_modules 2>/dev/null || true
    fi
    
    log_info "Permissions configurées"
}

setup_networks() {
    log_info "Configuration Docker network..."
    
    docker network create ticket-network 2>/dev/null || log_warn "Network existe déjà"
}

build_and_start() {
    log_info "Build des containers Docker..."
    
    if docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        COMPOSE_CMD="docker-compose"
    fi
    
    $COMPOSE_CMD down --remove-orphans 2>/dev/null || true
    
    log_info "Construction des images..."
    $COMPOSE_CMD build --no-cache
    
    log_info "Démarrage des services..."
    $COMPOSE_CMD up -d
    
    log_info "Attente de la base de données..."
    sleep 10
    
    log_info "Vérification de la santé des services..."
    
    for i in {1..30}; do
        if $COMPOSE_CMD exec -T postgres pg_isready -U ticket_user &> /dev/null; then
            log_info "PostgreSQL prêt"
            break
        fi
        echo -n "."
        sleep 2
    done
    echo ""
}

run_migrations() {
    log_info "Exécution des migrations Prisma..."
    
    if docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        COMPOSE_CMD="docker-compose"
    fi
    
    $COMPOSE_CMD exec -T backend npx prisma db push --skip-generate 2>/dev/null || {
        log_warn "Migration via exec échouée, tentative alternative..."
        docker exec ticket-platform-backend npx prisma db push --skip-generate || true
    }
    
    log_info "Migrations terminées"
}

cleanup() {
    log_info "Nettoyage des anciennes images..."
    
    docker image prune -af --filter "until=72h" 2>/dev/null || true
    
    docker system prune -f --filter "label=project=$PROJECT_NAME" 2>/dev/null || true
    
    log_info "Nettoyage terminé"
}

verify_deployment() {
    log_info "Vérification du déploiement..."
    
    if docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        COMPOSE_CMD="docker-compose"
    fi
    
    echo ""
    echo -e "${BLUE}Container Status:${NC}"
    $COMPOSE_CMD ps --format table 2>/dev/null || docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    
    echo ""
    log_info "Vérification des logs (10 dernières lignes backend)..."
    $COMPOSE_CMD logs --tail=10 backend 2>/dev/null || true
    
    echo ""
    log_info "URLs disponibles:"
    echo "  - Frontend: http://localhost:3000"
    echo "  - Backend API: http://localhost:5000"
    echo "  - Nginx: http://localhost:80"
}

main() {
    check_requirements
    pull_code
    setup_permissions
    setup_networks
    build_and_start
    run_migrations
    cleanup
    verify_deployment
    
    echo ""
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}   ✅ DÉPLOIEMENT TERMINÉ AVEC SUCCÈS${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
    echo ""
}

main "$@"

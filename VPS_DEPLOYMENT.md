# Guide de Déploiement VPS - Plateforme de Billetterie

## 1. Prérequis VPS

### Configuration Minimale
- **OS**: Ubuntu 22.04 LTS (64-bit)
- **RAM**: 4 GB (6 GB recommandés pour production)
- **CPU**: 2 vCPU (4 recommandés)
- **Stockage**: 40 GB SSD
- **Traffic**: Bande passante illimitée, IP fixe

### Dépendances Système
```bash
# Mise à jour système
apt update && apt upgrade -y

# Installation des packages requis
apt install -y curl git unzip wget vim docker.io docker-compose

# Docker post-install
usermod -aG docker $USER
systemctl enable docker
systemctl start docker

# Configuration du firewall
ufw allow 22/tcp   # SSH
ufw allow 80/tcp  # HTTP
ufw allow 443/tcp # HTTPS
ufw enable
```

## 2. Variables d'Environnement (.env production)

Créer `/workspace/.env`:
```bash
# ===================
# Database
# ===================
POSTGRES_USER=ticket_user
POSTGRES_PASSWORD=<strong_random_password_32_chars>
POSTGRES_DB=ticket_platform

# ===================
# Backend
# ===================
NODE_ENV=production
BACKEND_PORT=5000

# JWT - GENERATE: openssl rand -base64 32
JWT_SECRET=<your_secure_jwt_secret_min_32_chars>
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# ===================
# Redis
# ===================
REDIS_URL=redis://redis:6379
CACHE_TTL_EVENTS=30
CACHE_TTL_USER=300

# ===================
# Stripe (Paiement)
# ===================
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# ===================
# CORS / Security
# ===================
ALLOWED_ORIGINS=https://votre-domaine.com,https://www.votre-domaine.com

# ===================
# Rate Limiting
# ===================
RATE_LIMIT_AUTH=50
RATE_LIMIT_API=200
RATE_LIMIT_PAYMENT=10

# ===================
# Logging
# ===================
LOG_LEVEL=info

# ===================
# Business
# ===================
PLATFORM_COMMISSION=8
MINIMUM_ORDER=5

# ===================
# Frontend Build
# ===================
VITE_API_URL=https://api.votre-domaine.com
FRONTEND_PORT=3000
```

## 3. Configuration Nginx (SSL/TLS)

Le docker-compose intègre déjà Nginx. Pour SSL:
```bash
# Let's Encrypt (après DNS pointant vers VPS)
apt install certbot python3-certbot-nginx
certbot --nginx -d votre-domaine.com -d www.votre-domaine.com
```

## 4. Stratégie de Backup PostgreSQL

### Script de Backup Automatisé
Créer `/opt/scripts/backup.sh`:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups/postgres"
CONTAINER_NAME="ticket-platform-db"

mkdir -p $BACKUP_DIR

docker exec $CONTAINER_NAME pg_dump -U ticket_user ticket_platform > $BACKUP_DIR/ticket_platform_$DATE.sql

# Compression
gzip $BACKUP_DIR/ticket_platform_$DATE.sql

# Retention: 7 jours
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

# Notification succès (optionnel)
echo "Backup completed: ticket_platform_$DATE.sql.gz"
```

### Crontab (backup quotidien à 3h00)
```bash
crontab -e
0 3 * * * /opt/scripts/backup.sh >> /var/log/backup.log 2>&1
```

### Restauration
```bash
# Copier le fichier .sql.gz sur le serveur
gunzip < backup_file.sql.gz | docker exec -i ticket-platform-db psql -U ticket_user -d ticket_platform
```

## 5. Monitoring (Optionnel)

Le projet inclut Prometheus. Activer:
```bash
docker-compose -f docker-compose.monitoring.yml up -d
```

Dashboard accessible: `http://votre-vps:9090`

## 6. Commandes de Maintenance

```bash
# Logs temps réel
docker-compose logs -f backend

# Restart services
docker-compose restart

# Accès shell DB
docker exec -it ticket-platform-db psql -U ticket_user -d ticket_platform

# Nettoyage complet
docker-compose down -v && docker system prune -af
```

# Guide de Test et Déploiement - TicketHub

## Prérequis

```bash
# Installer Docker et Docker Compose
# Linux (Ubuntu/Debian):
sudo apt update
sudo apt install docker.io docker-compose

# Démarrer Docker
sudo systemctl start docker
sudo systemctl enable docker
```

---

## 1. Configuration Locale

### Variables d'environnement

Créer le fichier `.env` à la racine:

```bash
# Base de données
POSTGRES_USER=ticket_user
POSTGRES_PASSWORD=ticket_pass
POSTGRES_DB=ticket_platform

# JWT
JWT_SECRET=votre_secret_jwt_tres_securise_ici
JWT_EXPIRES_IN=7d
BCRYPT_ROUNDS=12

# Redis
REDIS_URL=redis://redis:6379
CACHE_TTL_EVENTS=30
CACHE_TTL_USER=300

# Stripe (optionnel)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# URLs autorisées
ALLOWED_ORIGINS=http://localhost:8081

# Ports
BACKEND_PORT=5000

# Rate Limiting
RATE_LIMIT_AUTH=50
RATE_LIMIT_API=200
RATE_LIMIT_PAYMENT=10
```

---

## 2. Commandes de Test Local

### Démarrer les services

```bash
# Mode développement (avec rebuild)
docker-compose up --build

# Mode production
docker-compose -f docker-compose.yml up -d

# Avec logs
docker-compose up -d && docker-compose logs -f
```

### Vérifier les services

```bash
# Statut des containers
docker-compose ps

# Health check API
curl http://localhost:5000/api/health

# ou avec Docker
docker exec ticket-platform-backend curl localhost:5000/api/health
```

### Tests des endpoints

```bash
# Events
curl http://localhost:5000/api/events

# Auth (login)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@ticket.com","password":"admin123"}'

# Créer un event (admin requis)
curl -X POST http://localhost:5000/api/events \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Concert Test",
    "description":"Description",
    "date":"2026-12-31T20:00:00",
    "location":"Paris",
    "price":50,
    "totalSeats":500
  }'

# Waitlist
curl http://localhost:5000/api/waitlist/events/<EVENT_ID>

# Recommendations
curl http://localhost:5000/api/recommendations

# Analytics (admin)
curl -X GET http://localhost:5000/api/admin/analytics \
  -H "Authorization: Bearer <TOKEN>"
```

### Logs et Debug

```bash
# Logs backend
docker-compose logs -f backend

# Logs frontend
docker-compose logs -f frontend

# Logs PostgreSQL
docker-compose logs -f postgres

# Logs Redis
docker-compose logs -f redis

# Accéder au container backend
docker exec -it ticket-platform-backend sh

# Accéder à PostgreSQL
docker exec -it ticket-platform-db psql -U ticket_user -d ticket_platform

# Tester Redis
docker exec -it ticket-platform-redis redis-cli
```

---

## 3. Commandes de Déploiement VPS

### Connexion SSH

```bash
ssh user@46.225.209.179
```

### Sur le VPS - Déploiement complet

```bash
# 1. Mettre à jour le code (si via Git)
cd /opt/ticket-platform
git pull origin main

# 2. Arrêter les services
docker-compose down

# 3. Rebuild et démarrer
docker-compose build --no-cache
docker-compose up -d

# 4. Attendre que les services soient prêts
sleep 15

# 5. Vérifier les logs
docker-compose logs --tail=50
```

### Sur le VPS - Commandes rapides

```bash
# Redémarrer un service
docker-compose restart backend

# Voir le statut
docker-compose ps

# Health check
curl http://localhost:5000/api/health

# Logs en temps réel
docker-compose logs -f

# Nettoyer les images inutilisées
docker image prune -af
```

---

## 4. URLs de Test

### Local

| Service | URL |
|---------|-----|
| Frontend | http://localhost:8081 |
| Backend API | http://localhost:5000 |
| Health | http://localhost:5000/api/health |

### VPS (46.225.209.179)

| Service | URL |
|---------|-----|
| Frontend | http://46.225.209.179:8081 |
| Backend API | http://46.225.209.179:8081/api |

---

## 5. Troubleshooting

### Problèmes courants

```bash
# Port déjà utilisé
docker-compose down
sudo lsof -i :8081
# ou modifier le port dans docker-compose.yml

# Base de données连接失败
docker-compose logs postgres
# Vérifier les credentials dans .env

# Erreur de cache Redis
docker-compose restart redis
docker exec ticket-platform-redis redis-cli FLUSHALL

# Rebuild sans cache
docker-compose build --no-cache
docker-compose up -d

# Supprimer tout et recommencer
docker-compose down -v
docker-compose up -d
```

### Commandes de diagnostic

```bash
# Vérifier les ressources Docker
docker stats

# Espace disque
docker system df

# Configuration réseau
docker network inspect ticket-network_ticket-network

# Variables d'environnement dans le container
docker exec ticket-platform-backend env
```

---

## 6. Scripts Utiles

### Script de déploiement automatique

```bash
#!/bin/bash
# deploy.sh

echo "🚀 Déploiement TicketHub..."

cd /opt/ticket-platform

git pull origin main
docker-compose down
docker-compose build --no-cache
docker-compose up -d

sleep 10

echo "✅ Vérification..."
curl -s http://localhost:5000/api/health

echo "🎉 Déploiement terminé!"
```

---

## 7. Nouvelles Routes API

| Feature | Route | Méthode | Auth |
|---------|-------|---------|------|
| Waitlist | `/api/waitlist` | POST | Non |
| Waitlist | `/api/waitlist/events/:id` | GET | Non |
| Waitlist | `/api/waitlist/:id` | DELETE | Oui |
| Recommendations | `/api/recommendations` | GET | Non |
| Analytics | `/api/admin/analytics` | GET | Admin |
| Transfert ticket | `/api/tickets/:id/transfer` | POST | Oui |

---

## 8. Build Frontend Manuel (si besoin)

```bash
# Installer les dépendances
cd frontend
npm install

# Développement
npm run dev

# Production build
npm run build

# Preview build
npm run preview
```

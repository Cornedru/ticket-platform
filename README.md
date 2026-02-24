# 🎫 TicketHub - Plateforme de Réservation de Billets

## 🚀 Lancement Rapide

```bash
cd ticket-platform
docker-compose up --build
```

L'application sera disponible sur :
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Prometheus**: http://localhost:9090 (optionnel)
- **Grafana**: http://localhost:3001 (optionnel)

---

## 🔧 Configuration

### Variables d'environnement

```env
# Base de données
POSTGRES_USER=ticket_user
POSTGRES_PASSWORD=ticket_pass
POSTGRES_DB=ticket_platform

# Auth
JWT_SECRET=votre-secret-jwt
JWT_EXPIRES_IN=7d

# Redis (optionnel)
REDIS_URL=redis://localhost:6379

# Stripe (optionnel)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
ALLOWED_ORIGINS=https://votre-domaine.com

# Ports
BACKEND_PORT=5000
FRONTEND_PORT=3000
```

---

## 📦 Stack Technique

| Composant | Technologie |
|-----------|-------------|
| Backend | Node.js + Express |
| Base de données | PostgreSQL + Prisma |
| Cache | Redis (optionnel) |
| Paiements | Stripe (optionnel) |
| Frontend | React + Vite |
| Reverse proxy | Nginx |
| Container | Docker + Docker Compose |
| CI/CD | GitHub Actions |
| Monitoring | Prometheus + Grafana |

---

## 🏗️ Architecture

```
ticket-platform/
├── backend/
│   ├── src/
│   │   ├── modules/          # Modules fonctionnels
│   │   │   ├── auth/
│   │   │   ├── events/
│   │   │   ├── orders/
│   │   │   ├── tickets/
│   │   │   └── payment/
│   │   └── shared/
│   │       └── middleware/    # Cache, security
│   ├── prisma/
│   └── Dockerfile
├── frontend/
│   ├── src/
│   ├── nginx.conf
│   └── Dockerfile
├── .github/workflows/         # CI/CD
├── docker-compose.yml
├── docker-compose.monitoring.yml
└── prometheus.yml
```

---

## 🔌 API Endpoints

### Auth
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/profile` - Profil utilisateur

### Événements
- `GET /api/events` - Liste des événements
- `GET /api/events/:id` - Détail événement
- `POST /api/events` - Créer (admin)
- `PUT /api/events/:id` - Modifier (admin)
- `DELETE /api/events/:id` - Supprimer (admin)

### Commandes
- `POST /api/orders` - Créer commande
- `POST /api/orders/:id/pay` - Paiement
- `GET /api/orders` - Mes commandes
- `GET /api/orders/all` - Toutes les commandes (admin)

### Billets
- `GET /api/tickets` - Mes billets
- `GET /api/tickets/:id` - Détail billet
- `POST /api/tickets/scan/:id` - Scanner billet (admin)

### Webhooks
- `POST /api/payments/webhook/stripe` - Webhook Stripe

---

## 👤 Comptes

- **Admin**: `admin@ticket.com` / `admin123`
- **User**: Créez un compte via l'interface

---

## 🔒 Sécurité

- ✅ Hash bcrypt des mots de passe
- ✅ JWT pour l'authentification
- ✅ Rate limiting intelligent
- ✅ Helmet pour headers HTTP
- ✅ CORS strict
- ✅ Validation des inputs
- ✅ Protection CSRF
- ✅ Webhook Stripe sécurisé

---

## 📊 Monitoring

Pour lancer le monitoring :

```bash
docker-compose -f docker-compose.monitoring.yml up -d
```

---

## 🛠️ Commandes Utiles

```bash
# Lancer l'application
docker-compose up --build

# Arrêter les conteneurs
docker-compose down

# Voir les logs
docker-compose logs -f

# Reconstruire sans cache
docker-compose build --no-cache
```

---

## 🚀 Déploiement Production

1. Configurer les variables d'environnement
2. Activer Redis pour le cache
3. Configurer Stripe pour les paiements
4. Mettre en place un CDN
5. Configurer le monitoring

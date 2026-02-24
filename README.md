# TRIP - Plateforme de Réservation de Billets

**Version:** 1.1.0  
**Date:** Février 2026

---

## 🚀 Quick Start

```bash
cd /home/nail/ticket-platform
docker compose up -d --build
```

L'application sera disponible sur :
- **Frontend**: http://localhost:8081
- **Backend API**: http://localhost:5000
- **Health**: http://localhost:5000/api/health

---

## 👤 Comptes

- **Admin**: `admin@ticket.com` / `admin123`
- **User**: Créez un compte via l'interface

---

## 🏗️ Architecture

```
┌─────────────────────┐     ┌─────────────────────┐
│   Frontend (React)  │────▶│   Backend (Node)   │
│   Nginx :8081       │     │   Express :5000     │
└─────────────────────┘     └──────────┬──────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                  ▼
            ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
            │ PostgreSQL   │   │    Redis     │   │   Stripe     │
            │   :5432      │   │    :6379     │   │  (Paiements) │
            └──────────────┘   └──────────────┘   └──────────────┘
```

---

## 📁 Structure du Projet

```
ticket-platform/
├── docker-compose.yml
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Application principale
│   │   ├── main.jsx         # Point d'entrée
│   │   └── index.css        # Styles globaux (responsive)
│   ├── vite.config.js
│   └── Dockerfile
├── backend/
│   ├── src/
│   │   ├── index.js         # Serveur Express
│   │   ├── modules/         # Routes API
│   │   │   ├── auth/        # Authentification
│   │   │   ├── events/      # Gestion événements
│   │   │   ├── orders/      # Commandes
│   │   │   ├── tickets/     # Billets
│   │   │   ├── payment/     # Stripe
│   │   │   └── ...
│   │   └── shared/          # Middleware partagé
│   ├── prisma/
│   │   └── schema.prisma   # Schéma BDD
│   └── Dockerfile
└── docs/
    └── DOCUMENTATION_COMPLETE.md
```

---

## 🔌 API Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/v1/auth/register` | Inscription |
| POST | `/api/v1/auth/login` | Connexion |
| GET | `/api/v1/auth/profile` | Profil utilisateur |
| GET | `/api/v1/events` | Liste événements |
| GET | `/api/v1/events/:id` | Détail événement |
| POST | `/api/v1/events` | Créer événement (Admin) |
| PUT | `/api/v1/events/:id` | Modifier événement (Admin) |
| DELETE | `/api/v1/events/:id` | Supprimer événement (Admin) |
| POST | `/api/v1/orders` | Créer commande |
| POST | `/api/v1/orders/:id/pay` | Payer commande |
| GET | `/api/v1/orders` | Liste commandes user |
| GET | `/api/v1/orders/all` | Toutes les commandes (Admin) |
| GET | `/api/v1/tickets` | Liste billets user |
| POST | `/api/v1/tickets/:id/transfer` | Transférer billet |
| GET | `/api/v1/recommendations` | Recommandations |
| GET | `/api/v1/admin/analytics` | Analytics (Admin) |

---

## 🎨 Fonctionnalités

### Utilisateurs
- Inscription / Connexion (JWT)
- Recherche d'événements par nom/catégorie
- Achat de billets (Stripe)
- QR Code pour l'accès aux événements
- Transfert de billets

### Administrateur
- Dashboard analytics
- CRUD complet événements (créer, modifier, supprimer)
- Gestion des commandes

### Médias
- URLs YouTube supportées (watch, shorts, embed)
- URLs MP4 directes
- Miniatures automatiques YouTube (maxresdefault → hqdefault fallback)

---

## 📱 Responsive Design

Le site est entièrement responsive avec breakpoints:
- **Desktop:** > 1024px
- **Tablette:** 768px - 1024px
- **Mobile:** < 768px

Fonctionnalités mobile:
- Menu hamburger interactif
- Grilles adaptatives (1 colonne sur mobile)
- Images/vidéos responsives
- Formulaires tactile-optimisés

---

## 🔧 Commandes Utiles

```bash
# Lancer le projet
docker compose up -d --build

# Logs
docker logs ticket-platform-backend
docker logs ticket-platform-frontend
docker logs ticket-platform-db

# Redémarrer un service
docker compose restart backend

# Arrêter
docker compose down

# Accès BDD PostgreSQL
docker exec -it ticket-platform-db psql -U postgres -d ticket_platform

# Accès Redis
docker exec -it ticket-platform-redis redis-cli
```

---

## 🔐 Variables d'Environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `DATABASE_URL` | PostgreSQL | `postgresql://...` |
| `JWT_SECRET` | Clé JWT | `dev-secret` |
| `JWT_EXPIRES_IN` | Expiration JWT | `7d` |
| `STRIPE_SECRET_KEY` | Stripe | - |
| `STRIPE_PUBLISHABLE_KEY` | Stripe (frontend) | - |
| `GOOGLE_CLIENT_ID` | OAuth Google | - |
| `GOOGLE_CLIENT_SECRET` | OAuth Google | - |
| `REDIS_URL` | Redis | - |

---

## 🐛 Dépannage

### Erreur "JSON Parse: unexpected character"
- Les routes API utilisent le préfixe `/api/v1/`
- Vérifier que le frontend appelle `/api/v1/...`

### Vidéos YouTube non affichées
- CSP backend autorise `youtube.com`, `ytimg.com`
- Utiliser URLs formats: `youtube.com/watch?v=XXX`, `youtu.be/XXX`

### Container nginx erreurs (shared memory zone)
- Redémarrer: `docker compose restart`

### Erreur connection BDD
- Vérifier que PostgreSQL est prêt: `docker logs ticket-platform-db`

---

## 📝 Notes de Maintenance

### Correctifs récents (v1.1.0)
- ✅ Correction des routes API (préfixe `/api/v1/`)
- ✅ Support URLs YouTube (shorts, embed, watch, youtu.be)
- ✅ Miniatures YouTube avec fallback (maxresdefault → hqdefault)
- ✅ Fonctionnalité modifier événement (Admin)
- ✅ Design responsive complet (mobile, tablette, desktop)
- ✅ Menu mobile hamburger avec animation

### Prochaines améliorations
- PWA avec support offline
- Notifications push
- Mode sombre
- Multi-langue
- OAuth Google complet

---

## 🔒 Sécurité

- ✅ Hash bcrypt des mots de passe (12 rounds)
- ✅ JWT pour l'authentification
- ✅ Rate limiting intelligent
- ✅ Helmet pour headers HTTP
- ✅ CORS configuré
- ✅ Validation des inputs
- ✅ Content Security Policy (CSP)

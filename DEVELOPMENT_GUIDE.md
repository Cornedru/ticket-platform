# TicketHub - Documentation de Développement

## Résumé du Projet

Plateforme de billetterie d'événements avec design psychédélique néon, inspirée de Live Nation et Shotgun.

### Stack Technique
- **Frontend:** React 18 + Vite
- **Backend:** Node.js + Express + Prisma
- **Base de données:** PostgreSQL
- **Cache:** Redis
- **Déploiement:** Docker + Docker Compose

---

## Commandes de Déploiement

### Démarrage Local

```bash
# Installer les dépendances
cd backend && npm install
cd ../frontend && npm install

# Mode développement
docker compose up

# Build et production
docker compose up --build -d
```

### Commandes Docker

```bash
# Voir les logs
docker compose logs -f

# Redémarrer un service
docker compose restart backend

# Arrêter tout
docker compose down

# Supprimer les volumes (reset complet)
docker compose down -v

# Accéder au container backend
docker exec -it ticket-platform-backend sh

# Accéder à PostgreSQL
docker exec -it ticket-platform-db psql -U ticket_user -d ticket_platform
```

### Déploiement VPS (46.225.209.179)

```bash
# Connexion SSH
ssh nail@46.225.209.179

# Naviguer vers le projet
cd ~/ticket-platform

# Pull les dernières modifications (si git)
git pull

# Rebuild et redémarrage
docker compose down
docker compose up --build -d

# Vérifier le statut
docker compose ps
curl http://localhost:8081/api/health
```

---

## Structure des Fichiers

```
ticket-platform/
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Routes et composants principaux
│   │   ├── index.css        # Styles globaux (design néon)
│   │   └── main.jsx         # Point d'entrée
│   ├── public/
│   │   ├── manifest.json    # PWA manifest
│   │   └── sw.js           # Service Worker
│   ├── nginx.conf          # Configuration Nginx
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── index.js         # Point d'entrée + routes
│   │   ├── modules/
│   │   │   ├── auth/        # Authentification
│   │   │   ├── events/      # Événements
│   │   │   ├── orders/      # Commandes
│   │   │   ├── tickets/     # Billetterie + transfer
│   │   │   ├── payment/    # Paiements
│   │   │   ├── waitlist/   # Liste d'attente
│   │   │   ├── recommendations/  # Recommandations
│   │   │   └── analytics/   # Dashboard analytics
│   │   └── shared/
│   │       └── middleware/  # Auth, cache, security
│   ├── prisma/
│   │   └── schema.prisma    # Modèles de données
│   └── Dockerfile
│
├── docker-compose.yml
├── .env
└── README.md
```

---

## API Endpoints

### Événements
- `GET /api/events` - Liste des événements
- `GET /api/events/:id` - Détail d'un événement
- `POST /api/events` - Créer un événement (admin)

### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/profile` - Profil utilisateur

### Commandes & Billets
- `POST /api/orders` - Créer une commande
- `POST /api/orders/:id/pay` - Payer la commande
- `GET /api/orders` - Mes commandes
- `GET /api/tickets` - Mes billets
- `POST /api/tickets/:id/transfer` - Transférer un billet

### Nouvelles Features
- `GET /api/waitlist` - Ma liste d'attente
- `POST /api/waitlist` - Rejoindre une liste d'attente
- `GET /api/recommendations` - Recommandations
- `GET /api/admin/analytics` - Statistiques (admin)

---

## Prochaines Améliorations

### Priorité Haute
1. **Transfert de billets** - Finaliser le modal de transfert dans Tickets.jsx
2. **Service Worker** - Enregistrer dans main.jsx pour PWA offline
3. **Catégories** - Ajouter champ category dans Prisma + filtrage

### Priorité Moyenne
4. **User Profile** - Page de profil utilisateur
5. **Favoris** - Système de favoris événements
6. **Notifications** - Push notifications pour événements

### Priorité Basse
7. **Reviews** - Système d'avis événements
8. **Social Sharing** - Partage sur réseaux sociaux
9. **Multi-langue** - Support EN/FR

---

## Variables d'Environnement

```env
# Database
POSTGRES_USER=ticket_user
POSTGRES_PASSWORD=ticket_pass
POSTGRES_DB=ticket_platform
DATABASE_URL=postgresql://ticket_user:ticket_pass@postgres:5432/ticket_platform

# JWT
JWT_SECRET=votre_secret_jwt_tres_securise
JWT_EXPIRES_IN=7d

# Redis
REDIS_URL=redis://redis:6379

# Stripe (optionnel)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# URLs
ALLOWED_ORIGINS=http://localhost:8081
```

---

## Commandes Git (pour pushes futurs)

```bash
# Si le repo est initialisé
git add .
git commit -m "feat: Design néon Live Nation + nouvelles features"
git push origin main

# Pour reprendre le travail demain
git pull
docker compose up --build -d
```

---

## Accès

- **Frontend:** http://46.225.209.179:8081
- **API:** http://46.225.209.179:8081/api
- **Admin:** admin@ticket.com / admin123

---

## Notes

- Le design utilise une palette néon psychédélique avec:
  - Magenta (#FF00FF), Cyan (#00FFFF), Vert acide (#39FF14)
  - Polices: Syne (display) + Outfit (body)
  - Effets de glassmorphism et animations

- Les événements ont un champ `videoUrl` pour les backgrounds vidéo

- Le système de waitlist permet de s'inscrire quand un événement est complet

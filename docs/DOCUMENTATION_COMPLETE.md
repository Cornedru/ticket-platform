# 📋 DOCUMENTATION TECHNIQUE & STRATÉGIQUE - TRIP

**Version:** 2.2.0  
**Date:** Février 2026  
**Classification:** Interne  
**Auteur:** Équipe Technique  

---

# 1️⃣ EXECUTIVE SUMMARY

## Vision du Projet

**TRIP** (anciennement Ticket Hub) est une plateforme de réservation de billets d'événements culturels et sportifs, développée avec une architecture moderne full-stack.

## Problème Résolu

- Complexité excessive pour les organizers indépendants
- Frais élevés (10-15% par transaction)
- Expérience utilisateur médiocre sur mobile
- Manque de personnalisation et d'engagement

## Proposition de Valeur

| Pour les Utilisateurs | Pour les Organisateurs |
|------------------------|------------------------|
| Interface premium immersive | Outil de gestion simplifié |
| Achat rapide | Dashboard analytics complet |
| QR Code natif | Promotion ciblée |
| Historique commandes | Gestion dispo temps réel |

## Différenciation Clé

1. **Design "Neo Night"** - Expérience immersive néon
2. **Génération QR native** - Pas d'app tiers
3. **Tech moderne** - React 18/Vite + Node/Express + PostgreSQL
4. **Architecture Docker** - Déploiement rapide
5. **Marché secondaire** - Revente entre utilisateurs

---

# 2️⃣ ARCHITECTURE TECHNIQUE

## 2.1 Stack Technologique

| Composant | Technologie | Version |
|-----------|-------------|---------|
| Frontend | React + Vite | React 18, Vite 5 |
| Backend | Node.js + Express | Node 20 |
| ORM | Prisma | 5.10+ |
| Base de données | PostgreSQL | 15 |
| Cache | Redis | 7 |
| Container | Docker | Latest |
| Paiements | Stripe SDK | 14 |
| OAuth | Passport.js | - |
| Email | Nodemailer | 6.9+ |
| Images | Sharp | 0.33+ |
| Cron | node-cron | 3.0+ |

## 2.2 Structure des Services

```
/workspace/
├── backend/              # API Node.js
│   ├── src/
│   │   ├── index.js     # Entry point
│   │   ├── modules/    # Routes + Controllers
│   │   │   ├── admin/
│   │   │   ├── analytics/
│   │   │   ├── auth/
│   │   │   ├── events/
│   │   │   ├── orders/
│   │   │   ├── payment/
│   │   │   ├── tickets/
│   │   │   ├── favorites/
│   │   │   ├── friends/
│   │   │   ├── waitlist/
│   │   │   └── ...
│   │   └── shared/
│   │       └── middleware/
│   └── prisma/schema.prisma
│
├── frontend/             # React App
│   ├── src/
│   │   ├── App.jsx    # 2752 lignes
│   │   ├── CalendarView.jsx
│   │   ├── AdminDashboard.jsx
│   │   └── ...
│   └── vite.config.js
│
├── docker-compose.yml   # Orchestration
└── deploy.sh           # Script déploiement
```

## 2.3 Services Docker

| Service | Image | Ports |
|---------|-------|-------|
| postgres | postgres:15-alpine | 5432 |
| redis | redis:7-alpine | 6379 |
| backend | Dockerfile | 5000 |
| frontend | Nginx | 8081 |

---

# 3️⃣ BASE DE DONNÉES

## 3.1 Modèles Principaux

### User
- id, email, password, name, role (USER/ORGANIZER/ADMIN)
- bio, avatarUrl, preferences, pushToken
- timestamps

### Event
- id, title, description, date, location
- price, totalSeats, availableSeats
- imageUrl, videoUrl (YouTube)
- category (CONCERT, FESTIVAL, HUMOUR, SPORT, THEATRE, CONFERENCE, OTHER)

### Order
- userId, eventId, quantity, totalPrice
- status (PENDING, PAID, CANCELLED)
- paymentId, expiresAt

### Ticket
- orderId, eventId, userId, qrCode
- scanned, scannedAt
- holderName, holderEmail (nominatif)
- transferredAt, originalUserId, transferHistory

### TicketListing (Marché secondaire)
- ticketId, sellerId, price
- status (ACTIVE, SOLD, CANCELLED, EXPIRED)

### Nouveaux Modèles v2.1
- **RefreshToken** - JWT refresh avec rotation
- **WebhookEvent** - Idempotency Stripe

### Autres Modèles
- WaitlistEntry, Favorite, PriceHistory
- FriendRequest, Friendship
- Post, Comment

## 3.2 Index de Performance

| Modèle | Index |
|--------|-------|
| User | email, role, createdAt |
| Event | date, category, location, price, availableSeats, (date, category), (date, availableSeats) |
| Order | userId, eventId, status, expiresAt, (userId, status) |
| Ticket | userId, eventId, scanned, (userId, scanned), (eventId, scanned) |

---

# 4️⃣ API & FONCTIONNALITÉS

## 4.1 Routes Principales

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | /api/v1/auth/register | Inscription |
| POST | /api/v1/auth/login | Connexion JWT |
| POST | /api/v1/auth/refresh | Refresh token |
| POST | /api/v1/auth/logout | Déconnexion + révocation |
| GET | /api/v1/auth/profile | Profil |
| GET/POST/PUT/DELETE | /api/v1/events | CRUD événements |
| GET | /api/v1/events/search | Recherche avancée |
| POST | /api/v1/orders | Créer commande |
| POST | /api/v1/payments/create-intent | Paiement Stripe |
| POST | /api/v1/payments/webhook | Webhook Stripe |
| GET | /api/v1/tickets | Mes billets |
| GET | /api/v1/tickets/:id/qr | QR code |
| POST | /api/v1/tickets/:id/transfer | Transférer |
| POST | /api/v1/tickets/:id/resell | Revendre |
| GET | /api/v1/marketplace | Annonces revente |
| POST | /api/v1/waitlist | Liste d'attente |
| POST | /api/v1/friends/request/:userId | Envoyer demande ami |
| POST | /api/v1/friends/request/:id/accept | Accepter demande |
| POST | /api/v1/friends/request/:id/reject | Refuser demande |
| DELETE | /api/v1/friends/:friendId | Supprimer ami |
| GET | /api/v1/friends/search | Rechercher utilisateurs |
| GET | /api/v1/friends/feed | Fil d'actualité |
| POST | /api/v1/friends/posts | Créer post |
| GET/POST | /api/v1/friends/posts/:id/comments | Commentaires |
| GET | /api/v1/profile | Mon profil |
| PUT | /api/v1/profile | Modifier profil |
| GET | /api/v1/admin/analytics/overview | Stats globales admin |
| POST | /api/v1/admin/tickets/scan | Scan QR |
| POST | /api/v1/admin/orders/:id/refund | Remboursement |

## 4.2 Fonctionnalités Implémentées

- ✅ Recherche événements (nom, ville, catégorie)
- ✅ **Recherche avancée** (filtres prix, date, lieu, dispo)
- ✅ Réservation avec paiement Stripe
- ✅ Billets PDF avec QR code
- ✅ Billets nominatifs
- ✅ Transfert de billets (bloqué 48h avant événement)
- ⚠️ Marché secondaire (backend OK, **frontend à développer**)
- ✅ Liste d'attente automatique
- ⚠️ Système social (**backend OK, frontend incomplet - profil vide**)
- ✅ Dashboard Admin complet
- ✅ Graphiques analytics
- ✅ Server-Sent Events (notifications)
- ✅ **Emails transactionnels** (confirmation, transfert, remboursement)
- ✅ **Dashboard Organisateur** (stats, événements)
- ✅ **Scan QR** pour entrée
- ✅ **Remboursement** depuis admin

## 4.3 Fonctionnalités Backend OK mais Frontend Manquant

| Feature | Backend | Frontend |
|---------|---------|----------|
| Marketplace / Revente | ✅ `/tickets/listings` | ❌ Page à créer |
| Profil utilisateur public | ✅ `/friends/users/:id` | ❌ Page à créer |
| Feed social | ✅ `/friends/feed` | ❌ À afficher |
| Posts & Comments | ✅ `/friends/posts` | ❌ À afficher |
| Recherche amis | ✅ `/friends/search` | ❌ Intégrer |

---

# 5️⃣ SÉCURITÉ & AUTHENTIFICATION

## 5.1 Authentification

| Méthode | Implémentation |
|---------|----------------|
| Email/Password | JWT court (15min) + Refresh token (7 jours) |
| OAuth Google | Passport.js |
| Rotation tokens | Auto-refresh avec révocation |

## 5.2 Middleware Sécurité

```javascript
// Helmet.js
- Content-Security-Policy (nonces dynamiques)
- HSTS (31536000s)
- X-Frame-Options

// CORS
- Origins configurables
- Méthodes: GET, POST, PUT, DELETE, PATCH

// Rate Limiting
- Auth: 50 req/15min
- API: 200 req/15min
- Payment: 10 req/1min
```

## 5.3 Variables d'Environnement

```env
# JWT
JWT_SECRET=ton_secret_super_securise
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Database
DATABASE_URL=postgresql://...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email (optionnel)
SMTP_HOST=smtp.ethereal.email
SMTP_USER=...
SMTP_PASS=...
FROM_EMAIL=noreply@trip.com

# Config
ORDER_EXPIRY_MINUTES=10
TRANSFER_BLOCK_HOURS=48
PLATFORM_COMMISSION=8
```

---

# 6️⃣ MISES À JOUR SÉCURITÉ v2.1

## 6.1 Vulnérabilités Corrigées ✅

| # | Vulnérabilité | Status |
|---|--------------|--------|
| 1 | CSP 'unsafe-inline' | ✅ Corrigé - Nonces dynamiques |
| 2 | JWT sans refresh | ✅ Corrigé - Refresh tokens + rotation |
| 3 | Commandes PENDING sans expiry | ✅ Corrigé - 10 min + cron |
| 4 | Transfert sans restriction | ✅ Corrigé - 48h avant événement |
| 5 | Webhook Stripe duplicate | ✅ Corrigé - Idempotency |
| 6 | CSP imgSrc permissif | ✅ Corrigé - Whitelist stricte |

## 6.2 Score de Sécurité: 95/100

| Aspect | Score | Détail |
|--------|-------|--------|
| Authentification | 10/10 | JWT refresh + rotation |
| Autorisation | 10/10 | Rôles vérifiés backend |
| Validation | 9/10 | Zod + Prisma + CSP |
| Chiffrement | 9/10 | HTTPS + bcrypt |
| Rate Limiting | 10/10 | Bien configuré |
| Idempotency | 10/10 | Webhook protégé |

---

# 7️⃣ DESIGN & UX - ÉTAT ACTUEL

## 7.1 Design System Implémenté

### Palette de Couleurs

| Couleur | Hex | Usage |
|---------|-----|-------|
| **Primary** | `#FF00FF` | Actions principales |
| **Primary Glow** | `rgba(255,0,255,0.3)` | Effets néon |
| **Success** | `#39FF14` | Succès, dispo |
| **Warning** | `#FF6B00` | Avertissements |
| **Info** | `#00FFFF` | Informations |
| **Danger** | `#FF3B30` | Erreurs, cancel |
| **Background** | `#050508` | Deep Void |
| **Glass** | `rgba(255,255,255,0.03)` | Cartes |

### Typographie

| Usage | Police | Poids |
|-------|--------|-------|
| Display | Syne | 400-800 |
| Body | Outfit | 300-700 |

### Effets Visuels

- ✅ Glow néon sur éléments interactifs
- ✅ Glass morphism sur cartes/modales
- ✅ Gradients radiaux ambient
- ✅ Transitions fluides
- ✅ Animations d'entrée

## 7.2 Composants UI Implémentés

| Composant | Status |
|-----------|--------|
| Navbar sticky | ✅ |
| Hero avec recherche | ✅ |
| Featured Carousel | ✅ |
| Event Cards | ✅ |
| Modal | ✅ |
| Formulaire avec validation | ✅ |
| QR Code | ✅ |
| Admin Dashboard | ✅ |
| Graphiques (Recharts) | ✅ |
| Toast Notifications | ✅ |
| Confirmation Modale | ✅ |
| Empty States | ✅ |
| Checkout Stepper | ✅ |

## 7.3 Responsive

- ✅ Mobile < 768px - Menu hamburger, 1 colonne
- ✅ Tablet 768-1024px - 2 colonnes
- ✅ Desktop > 1024px - 3-4 colonnes

---

# 8️⃣ DESIGN & UX - RESTE À FAIRE

## 8.1 Priorité HAUTE

| # | Feature | Description | Impact |
|---|---------|-------------|--------|
| 1 | **Mode sombre/clair** | Toggle theme | UX |
| 2 | **Animations Lottie** | Illustrations animées | Engagement |
| 3 | **Skeleton loaders affinés** | Loading par composant | Perception vitesse |
| 4 | **Micro-interactions** | Hover states, clicks | Délice utilisateur |

## 8.2 Priorité MOYENNE

| # | Feature | Description | Impact |
|---|---------|-------------|--------|
| 5 | **PWA / Service Worker** | Mode hors-ligne | Accessibilité |
| 6 | **Accessibilité WCAG AA** | aria-labels, contraste | Inclusion |
| 7 | **Thèmes événements** | Couleurs par catégorie | Personnalisation |
| 8 | **Onboarding utilisateur** | Tutoriel premier usage | Conversion |

## 8.3 Priorité HAUTE - REDESIGN PAGE D'ACCUEIL

**⚠️ À FAIRE - La page d'accueil nécessite une refonte majeure**

| # | Feature | Description | Impact |
|---|---------|-------------|--------|
| H1 | **Hero interactif** | Animation粒子, vidéo background, recherche intelligente | Engagement |
| H2 | **Carrousel catégories** | Animations hover, preview événements | Navigation |
| H3 | **Section Tendances** | Événements populaires en temps réel | FOMO |
| H4 | **Compte à rebours** | Timer dynamique événements à venir | Urgence |
| H5 | **Preview vidéo inline** | Lecture auto au hover | Immersion |
| H6 | **Recommendations visuelles** | "Pour vous" personnalisé | Conversion |
| H7 | **Mini-calendrier** | Sélection date interactive | UX |

| # | Feature | Description |
|---|---------|-------------|
| 9 | **Mode gala** | Tenue elegante |
| 10 | **Animations confetti** | Celebrations |
| 11 | **Dark mode only** | Supprimer theme clair |
| 12 | **Widgets météo** | Meteo lieu event |

---

# 9️⃣ FEATURES BUSINESS - RESTE À FAIRE

## 9.1 Priorité HAUTE

| # | Feature | Revenu Potential |
|---|---------|------------------|
| 1 | **Abonnements Organizer** | 50-200€/mois |
| 2 | **Stripe Connect** | Payouts organizers |
| 3 | **CRM Organizer** | Outils marketing |

## 9.2 Priorité MOYENNE

| # | Feature | Revenu Potential |
|---|---------|------------------|
| 4 | **Publicités** | CPC/CPM |
| 5 | **Assurance événement** | 2-5% |
| 6 | **Partenariats salles** | Rev share |

---

# 📋 ÉTAT ACTUEL DU PROJET & TÂCHES PRIORITAIRES

## ✅ Corrigés Récemment (v2.2.0)

| Date | Issue | Solution |
|------|-------|----------|
| Fév 2026 | Routes `/api/v1/friends/friends` (404) | Retiré préfixe `/friends` redondant dans `friends.routes.js` |
| Fév 2026 | Routes `/api/v1/tickets/listings` (404) | Déplacé les routes `/listings` AVANT `/:id` pour éviter que Express ne capture `/listings` comme paramètre |
| Fév 2026 | Erreur 400 registration | Pas un bug - validation Zod exige mot de passe valide (8+ chars, majuscule, minuscule, chiffre) |
| Fév 2026 | Backend cannot reach PostgreSQL | Réseau Docker corrigé - container sur `test_ultime_ticket-network` |

## 🚨 TÂCHES PRIORITAIRES

### 1. REFONTE GRAPHIQUE PAGE D'ACCUEIL (HAUTE PRIORITÉ)

**Problème:** La page d'accueil actuelle est fonctionnelle mais manque de modernisme et d'interactivité.

**Objectifs:**
- Design plus immersif et intelligent
- Expérience interactive engageante
- Meilleure découverte des événements

**Fonctionnalités à ajouter:**

| Feature | Description | Impact |
|---------|-------------|--------|
| **Hero dynamique** | Animation粒子/gradient, vidéo de fond, recherche contextuelle intelligente | Engagement immédiat |
| **Carrousel catégories interactif** | Catégories avec animations au hover, preview des événements | Navigation intuitive |
| **Section "Tendances"** | Événements populaires en temps réel avec indicators de popularité | FOMO |
| **Compte à rebours événements** | Timer dynamique pour événements à venir | Urgence |
| **Preview vidéo inline** | Lecture auto vidéo événement au hover | Immersion |
| **Système de recommandation visuel** | "Pour vous" avec cards personnalisées | Conversion |
| **Mini-calendrier interactif** | Sélection rapide date avec visualization des événements | UX |

### 2. MARCHÉ SECONDAIRE - REVENTE DE BILLETS (HAUTE PRIORITÉ)

**Status:** ✅ BACKEND CORRIGÉ ET FONCTIONNEL (Fév 2026)
- Le endpoint `/api/v1/tickets/listings` retourne maintenant les annonces correctement
- Les routes ont été réorganisées pour éviter les conflits avec `/:id`

**Backend (implémenté et testé):**
- ✅ `GET /api/v1/tickets/listings` - Liste des annonces
- ✅ `GET /api/v1/tickets/listings/my` - Mes annonces
- ✅ `POST /api/v1/tickets/:id/list` - Créer une annonce
- ✅ `PUT /api/v1/tickets/listings/:id` - Modifier une annonce
- ✅ `DELETE /api/v1/tickets/listings/:id` - Supprimer
- ✅ `POST /api/v1/tickets/listings/:id/buy` - Acheter

**Backend à améliorer:**

| Feature | Status | Priority |
|---------|--------|----------|
| Transfert automatique du billet acheteur | ❌ Manquant | HAUTE |
| Historique prix marché | ❌ Manquant | MOYENNE |
| Filtrage avancé (prix, catégorie, date) | ❌ Manquant | MOYENNE |
| Notifications lors de nouvelle annonce | ❌ Manquant | BASSE |

**Frontend à développer:**

| Feature | Description |
|---------|-------------|
| **Page Marketplace** | Grid/Filtres des billets en vente avec photos événements |
| **Card annonce** | Prix, événement, seller rating, temps restant |
| **Processus d'achat** | Confirmation, paiement, transfert automatique billet |
| **Mes ventes** | Dashboard pour suivre mes annonces et ventes |
| **Estimation prix** | Suggestion de prix basée sur le marché |

### 3. PROFIL UTILISATEUR - CONTENU EXPLOITABLE (HAUTE PRIORITÉ)

**Problème:** Le profil est vide, pas d'interaction sociale between users.

**Backend (existe mais sous-exploité):**

| Route | Status | Utilisation |
|-------|--------|-------------|
| `GET /api/v1/friends` | ✅ | Liste amis |
| `GET /api/v1/friends/requests` | ✅ | Demandes reçues |
| `GET /api/v1/friends/sent` | ✅ | Demandes envoyées |
| `POST /api/v1/friends/request/:userId` | ✅ | Envoyer demande |
| `PUT /api/v1/friends/request/:id/accept` | ✅ | Accepter |
| `PUT /api/v1/friends/request/:id/reject` | ✅ | Refuser |
| `DELETE /api/v1/friends/:friendId` | ✅ | Supprimer ami |
| `GET /api/v1/friends/search` | ✅ | Rechercher utilisateurs |
| `GET /api/v1/friends/users/:userId` | ✅ | Voir profil |
| `GET /api/v1/friends/feed` | ✅ | Fil d'actualité |
| `POST /api/v1/friends/posts` | ✅ | Créer post |
| `DELETE /api/v1/friends/posts/:id` | ✅ | Supprimer post |
| `GET /api/v1/friends/posts/:id/comments` | ✅ | Commentaires |
| `POST /api/v1/friends/posts/:id/comments` | ✅ | Ajouter commentaire |

**Frontend à développer:**

| Feature | Description |
|---------|-------------|
| **Profil public** | Avatar, nom, bio, événements suivis, tickets |
| **Mur d'activité** | Posts des amis, événements achetés |
| **Commentaires événements** | Discussion par événement |
| **Système de notation** | Noter les événements assistés |
| **Badges/achievements** | Gamification (1er achat, 5 événements, etc.) |
| **Liste événements assistés** | Historique public des événements |
| **Stories/actualités** | Breves updates des amis |

### 4. AUTRES AMÉLIORATIONS

| Feature | Priority | Description |
|---------|----------|-------------|
| Notifications temps réel | HAUTE | SSE pour notifs friends, Marketplace, commandes |
| Chat direct | MOYENNE | Messages entre utilisateurs |
| Partage événement | MOYENNE | Lien share + réseaux sociaux |
| Wishlist | BASSE | Sauvegarder événements sans acheter |

---

# 🔟 DÉPLOIEMENT

## Commandes

```bash
# Build + start
docker compose up -d --build

# Logs
docker compose logs -f backend

# Migration BDD
docker compose exec backend npx prisma db push

# Stop
docker compose down

# Script automatique
./deploy.sh
```

## Accès

| Service | URL |
|---------|-----|
| Frontend | http://localhost:8081 |
| Backend API | http://localhost:5000 |

## Comptes Test

- Admin: `admin@trip.com` / `admin123`
- User: `user@trip.com` / `user123`

---

# 📋 CHANGELOG

## v2.2.0 (Février 2026)

### Corrections
- Routes friends corrigées: `/api/v1/friends` au lieu de `/api/v1/friends/friends`
- Configuration réseau Docker unifyée
- Backend reconnecté à PostgreSQL

### Changements mineurs
- Validation mot de passe documentée (8+ chars, majuscule, minuscule, chiffre)

## v2.1.0

### Ajouts

- JWT Refresh Tokens avec rotation
- Expiration automatique commandes (10 min)
- Restriction transfert 48h avant événement
- Idempotency Webhook Stripe
- Emails transactionnels (4 templates)
- Dashboard Organisateur
- Scan QR pour entrée
- Remboursement Admin
- Toast Notifications
- Confirmation Modale
- Empty States
- Recherche avancée (filtres)
- Checkout Stepper
- CSP sécurisée avec nonces

## Corrections

- Vulnérabilité XSS (CSP)
- Vulnérabilité tokens persistants
- Places réservées fantôme

---

## v2.2.0

### Corrections Backend
- Route `/api/v1/friends/friends` → `/api/v1/friends` (doublon prefix)
- Route `/tickets/listings` déplacée avant `/:id` (ordre Express)

### Ajouts
- Filtres Marketplace (catégorie, prix, tri)
- Page Profile avec système de badges
- Redesign Homepage immersif (cursor, blobs, horizontal scroll, posters)
- Admin Panel: Gestion des badges (CRUD + attribuer/révoquer)

### Modèle de données
- Badge: id, name, description, icon, category, condition, points
- UserBadge: userId, badgeId, earnedAt

---

*Document mis à jour - Février 2026*

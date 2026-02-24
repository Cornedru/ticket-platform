# 📋 DOCUMENTATION TECHNIQUE & STRATÉGIQUE - TICKET HUB

**Version:** 1.0.0  
**Date:** Février 2026  
**Classification:** Interne - Confidentiel  
**Auteur:** Équipe Technique  
**Objectif:** Scale vers 1M€+ CA annuel

---

# 1️⃣ EXECUTIVE SUMMARY

## Vision du Projet

**Ticket Hub** est une plateforme de réservation de billets d'événements en ligne, permettant aux utilisateurs de découvrir, acheter et gérer des billets pour des événements variés (concerts, spectacles, sports, conférences).

## Problème Résolu

Les plateformes de billetterie actuelles souffrent de :
- **Complexité excessive** pour les organisateurs indépendants
- **Frais élevés** (10-15% par transaction)
- **Expérience utilisateur médiocre** sur mobile
- **Lack de personnalisation** et d'engagement client

## Proposition de Valeur

| Pour les Utilisateurs | Pour les Organisateurs |
|------------------------|------------------------|
| Interface premium et immersive | Outil de gestion simplifié |
| Achat rapide en 3 clics | Dashboard analytics |
| QR Code pour accès instantané | Promotion ciblée |
| Historique complet des commandes | Gestion des disponibilités en temps réel |

## Positionnement Marché

- **Segment:** Mid-market (particuliers + PME)
- **Géographie:** Initialement France, scalable UE
- **Prix cible organisateur:** 5-8% par transaction (vs 10-15% concurrents)

## Différenciation Clé

1. **Design "Neo Night"** - Expérience immersive unique
2. ** Génération QR native** - Pas d'app tiers
3. **Tech moderne** - React/Vite + Node/Express + PostgreSQL
4. **Architecture extensible** - Prêt pour microservices

## Public Cible

**B2C:**
- 25-45 ans, urbains, fans de musique/divertissement
- Digital natives, achat mobile-first

**B2B2C:**
- Organisateurs d'événements (clubs, salles, festivals)
- PME culturelles et sportives

## Cas d'Usage

1. Réservation de billets pour un concert
2. Achat de places pour un match de football
3. Récupération des billets via QR code le jour J
4. Gestion d'un événement par un organisateur
5. Suivi des commandes et historique utilisateur

## Potentiel de Scalabilité

```
Court terme (0-1 an):    10,000 utilisateurs actifs
Moyen terme (1-2 ans):   100,000 utilisateurs actifs  
Long terme (2-3 ans):    500,000+ utilisateurs actifs
```

---

# 2️⃣ ARCHITECTURE TECHNIQUE GLOBALE

## Vue d'Ensemble du Système

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                        │
│                    Port 3000 ( Nginx )                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (Node.js)                         │
│                    Port 5000 ( Express )                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │   Auth    │ │  Events   │ │  Orders  │ │ Tickets  │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    POSTGRESQL (Prisma)                        │
│                       Port 5432                                │
└─────────────────────────────────────────────────────────────────┘
```

## Stack Technique

| Composant | Technologie | Version |
|-----------|-------------|---------|
| Frontend | React + Vite | React 18, Vite 5 |
| Backend | Node.js + Express | Node 20, Express 4 |
| ORM | Prisma | 5.10 |
| Base de données | PostgreSQL | 15 |
| Container | Docker | Latest |
| Cache (optionnel) | Redis | 7 |
| Paiements | Stripe SDK | 14 |
| Monitoring | Prometheus + Grafana | Latest |

## Structure des Données (Schéma Logique)

### User
```
- id: UUID (PK)
- email: String (unique)
- password: String (bcrypt hash)
- name: String
- role: Enum (USER, ADMIN)
- createdAt: DateTime
- updatedAt: DateTime
```

### Event
```
- id: UUID (PK)
- title: String
- description: String
- date: DateTime
- location: String
- price: Float
- totalSeats: Int
- availableSeats: Int
- imageUrl: String?
- createdAt: DateTime
- updatedAt: DateTime
```

### Order
```
- id: UUID (PK)
- userId: UUID (FK → User)
- eventId: UUID (FK → Event)
- quantity: Int
- totalPrice: Float
- status: Enum (PENDING, PAID, CANCELLED)
- paymentId: String?
- createdAt: DateTime
- updatedAt: DateTime
```

### Ticket
```
- id: UUID (PK)
- orderId: UUID (FK → Order)
- eventId: UUID (FK → Event)
- userId: UUID (FK → User)
- qrCode: String (base64 image)
- scanned: Boolean (default false)
- scannedAt: DateTime?
- createdAt: DateTime
```

## APIs - Routes Principales

### Authentication
| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/api/auth/register` | ❌ | Inscription utilisateur |
| POST | `/api/auth/login` | ❌ | Connexion + JWT |
| GET | `/api/auth/profile` | ✅ JWT | Profil utilisateur |

### Events
| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/api/events` | ❌ | Liste événements |
| GET | `/api/events/:id` | ❌ | Détail événement |
| POST | `/api/events` | ✅ ADMIN | Créer événement |
| PUT | `/api/events/:id` | ✅ ADMIN | Modifier événement |
| DELETE | `/api/events/:id` | ✅ ADMIN | Supprimer événement |

### Orders
| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/api/orders` | ✅ JWT | Créer commande |
| POST | `/api/orders/:id/pay` | ✅ JWT | Paiement (mock) |
| GET | `/api/orders` | ✅ JWT | Mes commandes |
| GET | `/api/orders/all` | ✅ ADMIN | Toutes commandes |

### Tickets
| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| GET | `/api/tickets` | ✅ JWT | Mes billets |
| GET | `/api/tickets/:id` | ✅ JWT | Détail billet |
| POST | `/api/tickets/scan/:id` | ✅ ADMIN | Scanner billet |

### Payments
| Méthode | Endpoint | Auth | Description |
|---------|----------|------|-------------|
| POST | `/api/payments/webhook/stripe` | ❌ | Webhook Stripe |

## Sécurité Implémentée

- ✅ **Hash bcrypt** (12 rounds) pour mots de passe
- ✅ **JWT** pour authentification (exp: 7 jours)
- ✅ **Helmet** pour headers HTTP sécurisés
- ✅ **Rate limiting** par endpoint (auth: 50/15min, payment: 10/min)
- ✅ **CORS** configuré par environnement
- ✅ **Validation input** avec validator.js
- ✅ **Stripe webhook** signature verification (prêt)

## Infrastructure & Déploiement

**Actuel (MVP):**
- Docker Compose (dev/local)
- 3 containers: Frontend, Backend, PostgreSQL

**Production recommandé:**
- Kubernetes (EKS/GKE) ou
- Docker Swarm load balancer
- CDN pour assets avec statiques
- Redis pour sessions/cache
- PostgreSQL avec replica (lecture)

---

# 3️⃣ STRUCTURE DU CODE

## Organisation des Dossiers

```
ticket-platform/
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/           # Authentication
│   │   │   │   └── auth.routes.js
│   │   │   ├── events/        # Gestion événements
│   │   │   │   └── events.routes.js
│   │   │   ├── orders/        # Commandes
│   │   │   │   └── orders.routes.js
│   │   │   ├── tickets/        # Billetterie
│   │   │   │   └── tickets.routes.js
│   │   │   └── payment/        # Paiements
│   │   │       ├── payment.routes.js
│   │   │       └── payment.service.js
│   │   └── shared/
│   │       └── middleware/
│   │           ├── security.js    # Rate limiting, CORS, Helmet
│   │           ├── cache.js        # Redis middleware
│   │           └── errorHandler.js
│   ├── prisma/
│   │   └── schema.prisma
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Application principale
│   │   ├── index.css         # Styles Neo Night
│   │   └── main.jsx          # Entry point
│   ├── nginx.conf
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── docker-compose.monitoring.yml
├── prometheus.yml
├── .env
└── README.md
```

## Responsabilités des Modules

### `backend/src/index.js`
- Point d'entrée Express
- Configuration middleware global
- Initialisation Prisma
- Seed database (création admin + événements initiaux)
- Gestion signaux (SIGTERM)

### `modules/auth/auth.routes.js`
- Inscription (email + password + name)
- Connexion (retourne JWT)
- Profil utilisateur

### `modules/events/events.routes.js`
- CRUD complet événements
- Pagination et filtres
- Authentification requise pour mutations (admin)

### `modules/orders/orders.routes.js`
- Création commande
- Traitement paiement (mock)
- Liste commandes utilisateur/admin

### `modules/tickets/tickets.routes.js`
- Liste billets utilisateur
- Scan billet (validation QR)
- Génération QR automatique post-paiement

### `modules/payment/payment.service.js`
- Intégration Stripe (prête)
- Webhook handler
- Génération QR codes

### `shared/middleware/`
- **security.js**: Rate limiting, Helmet, CORS
- **cache.js**: Middleware Redis (désactivé temporairement)
- **errorHandler.js**: Gestion centralisée erreurs

## Flux d'Exécution Principal

```
1. Requête client → Nginx (frontend)
2. /api/* → Backend Express
3. Auth middleware (JWT verification)
4. Route handler spécifique
5. Prisma ORM → PostgreSQL
6. Réponse JSON
7. Frontend React met à jour UI
```

## Dette Technique Identifiée

| Problème | Impact | Priorité |
|----------|--------|----------|
| **Cache désactivé** | Performance réduite | Haute |
| **Pas de tests unitaires** | Risque regression | Haute |
| **Stripe en mode mock** | Revenue = 0 | Critique |
| **Pas de logs structurés** | Debug difficile | Moyenne |
| **Validation分散ée** | Incohérence | Faible |
| **Pas de versioning API** | Breaking changes | Moyenne |
| **Session Redis manquante** | Scalabilité limitée | Haute |

## Points Techniques Complexes

### Génération QR Code
```javascript
// Dans orders.routes.js
const qrData = JSON.stringify({
  ticketId,
  orderId,
  eventId,
  userId,
  timestamp: Date.now()
});
const qrCode = await QRCode.toDataURL(qrData);
```
**Note:** Les QR codes sont stockés en base64 (texte). Pour les gros volumes, privilégier stockage S3 + URL.

### Paiement Mock vs Stripe
Le système actuel utilise un mock. Pour activer Stripe réel:
1. Ajouter `STRIPE_SECRET_KEY` dans `.env`
2. Le service utilise automatiquement Stripe si clé présente
3. Webhook prêt pour `payment_intent.succeeded`

---

# 4️⃣ GUIDE DE MAINTENANCE

## Installation

```bash
# Cloner le projet
git clone <repo-url>
cd ticket-platform

# Variables d'environnement
cp .env.example .env
# Éditer .env avec vos valeurs

# Lancer Docker
docker-compose up --build
```

## Variables d'Environnement Requises

```env
# Base de données
POSTGRES_USER=ticket_user
POSTGRES_PASSWORD=change_this_password
POSTGRES_DB=ticket_platform

# Auth
JWT_SECRET=super_secret_jwt_key_min_32_chars
JWT_EXPIRES_IN=7d

# Stripe (optionnel)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Redis (optionnel)
REDIS_URL=redis://redis:6379

# CORS production
ALLOWED_ORIGINS=https://votre-domaine.com

# Ports
BACKEND_PORT=5000
FRONTEND_PORT=3000
```

## Commandes Importantes

```bash
# Développement local
docker-compose up --build

# Arrêt propre
docker-compose down

# Logs temps réel
docker-compose logs -f

# Reconstruire sans cache
docker-compose build --no-cache

# Accéder au container backend
docker exec -it ticket-platform-backend sh

# Accéder à la base
docker exec -it ticket-platform-db psql -U ticket_user -d ticket_platform
```

## Ajouter une Feature

1. **Backend:** Créer route dans `modules/[domain]/`
2. **Frontend:** Ajouter composant dans `src/components/`
3. **Tester localement**
4. **Commit avec Conventional Commits**
5. **CI/CD déploie automatiquement**

## Standards de Code

- **ESLint** à configurer
- **Prettier** pour le formatting
- **Conventional Commits** (feat:, fix:, docs:)
- **Modules ES6** avec import/export nommé

## Bonnes Pratiques

- Toujours valider les entrées utilisateur
- Logger les erreurs critiques
- Utiliser les transactions Prisma pour opérations multi-tables
- Stocker les secrets en variables d'environnement, jamais dans le code

---

# 5️⃣ GUIDE D'ÉVOLUTION TECHNIQUE

## Améliorations Prioritaires (ROI Immédiat)

### 🔴 Critique (Mois 1)

| Amélioration | Effort | Impact | ROI |
|--------------|--------|--------|-----|
| **Activer Stripe réel** | 1j | Revenu | ∞ |
| **Remettre cache Redis** | 2j | Performance x5 | ++ |
| **Ajouter tests E2E** | 3j | Qualité | +++ |

### 🟠 Haute Priorité (Mois 2-3)

| Amélioration | Effort | Impact |
|--------------|--------|--------|
| Migration Next.js (SSR) | 2 sem | SEO +40% |
| Logs structurés (Pino) | 1 sem | Debug |
| Authentification OAuth (Google/Apple) | 1 sem | Conversion |
| Système de notifications (email/SMS) | 2 sem | Rétention |

### 🟡 Moyen Terme (Mois 3-6)

| Amélioration | Effort | Impact |
|--------------|--------|--------|
| Microservices (orders/tickets) | 1 mois | Scalabilité |
| GraphQL (optionnel) | 2 sem | Flexibilité API |
| Analytics (PostHog/Matomo) | 1 sem | Insight |
| CDN + CloudFront | 1 sem | Performance |

## Refactorings Recommandés

1. **Extraire validation** dans un middleware Zod partagé
2. **Centraliser logs** avec Winston/Pino
3. **Séparer config** par environnement (.env.staging, .env.prod)
4. **Implémenter Repository Pattern** pour Prisma

## Scalabilité - Architecture Cible

```
                    ┌─────────────┐
                    │    CDN     │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   Nginx     │
                    │ Load Balancer│
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐       ┌────▼────┐       ┌────▼────┐
   │Backend 1│       │Backend 2│       │Backend N│
   │ (Node) │       │ (Node)  │       │ (Node)  │
   └────┬───┘       └────┬───┘       └────┬───┘
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
              ┌───────────┼───────────┐
              │           │           │
        ┌─────▼────┐┌───▼───┐┌─────▼────┐
        │PostgreSQL ││ Redis ││ Stripe   │
        │  Master  ││ Cache ││ API      │
        └──────────┘└───────┘└──────────┘
```

## Internationalisation (i18n)

**Route:**
- Phase 1: Français (actuel)
- Phase 2: Anglais + Espagnol
- Phase 3: Allemand + Italien

**Tools:** react-i18next pour frontend, node-i18n pour backend

## Versioning API

Implémenter stratégie **URL versioning**:
```
/api/v1/events
/api/v2/events  ← avec breaking changes
```

---

# 6️⃣ BUSINESS MODEL

## Type de Produit

**SaaS de billetterie** avec modèle places de marché (marketplace).

## Sources de Revenus

| Source | Modèle | Potentiel |
|--------|--------|-----------|
| **Commission sur vente** | 5-8% par billet | 70% du CA |
| **Abonnement organisateur** | 29-99€/mois | 20% du CA |
| **Publicité événementielle** | CPC/CPM | 5% du CA |
| **Services premium** | QR code personnalisé, analytics avancés | 5% du CA |

## Pricing Recommandé

### Pour les Organisateurs

| Tier | Prix | Features |
|------|------|----------|
| **Starter** | Gratuit (limite 100 billets/mois) | Billetterie basique |
| **Pro** | 29€/mois | Analytics, support email |
| **Enterprise** | 99€/mois + 5% commission | Blanc label, API, support优先 |

### Comparatif Concurrence

| Concurrent | Commission | Positionnement |
|------------|------------|----------------|
| **Eventbrite** | 10-15% | Enterprise, global |
| **Weezevent** | 8-12% | Moyen terme France |
| **Billetweb** | 6-8% | SPÉcialisé concerts |
| **Ticket Hub** | 5-8% (objectife) | Tech moderne, UX premium |

## Stratégie d'Acquisition

### Canaux Prioritaires

1. **Inbound Marketing** (40% budget)
   - Blog SEO (actualités events)
   - Content marketing (guides organizateur)
   - Webinaires

2. **Partenariats** (30% budget)
   - Salles de concert
   - Festivals
   - Clubs sportifs

3. **Paid Acquisition** (20% budget)
   - Google Ads (marque + événements)
   - Meta Ads (retargeting)
   - LinkedIn (B2B)

4. **Referral** (10% budget)
   - Programme ambassadeur
   - Parrainage organisateur

## Tunnel de Conversion

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  VISITE  │───▶│  AVOIR   │───▶│ PANIER   │───▶│ PAIEMENT │
│          │    │          │    │          │    │          │
│ 100%     │    │  40%     │    │  25%     │    │  15%     │
└──────────┘    └──────────┘    └──────────┘    └──────────┘
```

**Optimisations:**
- Remarketing panier abandonné
- Email relance 1h, 24h, 72h
- Promo premiere commande (10%)

## Modèle Économique Projeté

| Année | Users | Transactions | GMV | Revenu |
|-------|-------|--------------|-----|--------|
| Y1    | 10K   | 50K          | 2M€ | 100K€  |
| Y2    | 50K   | 300K         | 12M€| 600K€  |
| Y3    | 150K  | 1M           | 40M€| 2M€    |

*GMV = Gross Merchandise Value (volume total transactions)*

## Coûts Structurels (Estimation Y1)

| Poste | Coût Mensuel |
|-------|--------------|
| Infrastructure (AWS) | 2,000€ |
| Stripe fees (2.9%) | 2,900€ |
| Salaires (2-3 personnes) | 8,000€ |
| Marketing | 3,000€ |
| Tools (Slack, Notion, etc) | 500€ |
| **Total** | **16,400€/mois** |

**Break-even:** ~200K€ CA annuel (12% margin)

---

# 7️⃣ STRATÉGIE COMMERCIALE

## ICP (Ideal Customer Profile)

### Persona Principal: "L'Organisateur Indépendant"

- **Démographie:** 30-50 ans, fondateur de salle/association
- **Pain points:**
  - Commission trop élevée sur autres plateformes
  - Outil compliqué, formation longue
  - Pas de données clients
  - Paiements tardifs

- **Budget:** 0-200€/mois
- **Volume:** 500-5000 billets/mois
- **Décideur:** Fondateur direct (pas de comité)

### Persona Secondaire: "Le Particulier"

- **Démographie:** 25-45 ans, achat occasionnel
- **Pain points:**
  - Interface confuse
  - Frais cachés
  - QR code qui marche pas

- **Budget:** 20-200€ par événement
- **Fréquence:** 2-6 événements/an
- **Décideur:** Auto (achat individuel)

## Problèmes Clients Majeurs

| Problème | Solution Ticket Hub |
|----------|---------------------|
| "C'est trop cher" | Commission 5% (vs 10-15%) |
| "C'est compliqué" | Interface intuitive en 3 clics |
| "J'ai pas mes fonds" | Paiement instantané Stripe |
| "Je sais pas qui achète" | Dashboard analytics inclus |

## Proposition Unique de Valeur

**"La billetterie moderne: 5% de commission, 100% de simplicité, 0% de tracas."**

## Argumentaire de Vente

### Pour les Organisateurs

1. **Économies:**
   - "Économisez 50% sur vos frais de billetterie"
   - Ex: 1000 billets à 50€ = 500€ économie/an

2. **Simplicité:**
   - "En ligne en 15 minutes"
   - "Pas de formation requise"

3. **Indépendance:**
   - "Vos clients vous appartiennent"
   - "Export data anytime"

### Pour les Acheteurs

1. **Fiabilité:**
   - "QR code garanti valide"
   - "Remboursement facile"

2. **Expérience:**
   - "Interface premium"
   - "Achats en 3 clics"

## Objections Courantes

| Objection | Réponse |
|-----------|---------|
| "Je connais pas Ticket Hub" | Réputation + témoignages + période essai |
| "C'est un nouveau joueur" | Technologie supérieure + support réactif |
| "Je suis déjà sur Eventbrite" | Migration gratuite + 1 mois gratuit |
| "J'ai pas le temps de changer" | Import en 1 clic, on gère tout |

## Différenciation Concurrentielle

| Critère | Ticket Hub | Eventbrite | Weezevent |
|---------|------------|------------|-----------|
| Commission | 5-8% | 10-15% | 8-12% |
| Interface | ★★★★★ | ★★★☆☆ | ★★★☆☆ |
| QR Code | Inclus | Payant | Inclus |
| Analytics | Pro | Entreprise | Pro |
| Support | Réactif | Lent | Moyen |

---

# 8️⃣ ROADMAP STRATÉGIQUE

## Court Terme (0-3 Mois) - Phase MVP+

### Objectifs Techniques

| Priorité | Tâche | Effort | Impact |
|----------|-------|--------|--------|
| 🔴 P0 | Activer Stripe réel | 1 sem | Revenu |
| 🟠 P1 | Remettre cache Redis | 2 j | Performance |
| 🟠 P1 | Tests E2E (Playwright) | 2 sem | Qualité |
| 🟡 P2 | Logs structurés | 1 sem | Debug |
| 🟡 P2 | Auth OAuth (Google) | 1 sem | Conversion |

### Objectifs Produit

| Feature | Description |
|---------|-------------|
| Paiement Stripe | Passage en production |
| Dashboard organisateur | Stats de vente basique |
| Email confirmation | Transactionnels (Resend) |

### Objectifs Business

- **KPIs:** 100 organisateurs, 1000 transactions/mois
- **CA:** 5,000€/mois

## Moyen Terme (3-12 Mois) - Phase Scale

### Objectifs Techniques

| Priorité | Tâche | Effort |
|----------|-------|--------|
| 🟠 P1 | Migration Next.js (SSR) | 1 mois |
| 🟠 P1 | Kubernetes production | 1 mois |
| 🟡 P2 | GraphQL API | 2 sem |
| 🟡 P2 | Analytics avancé | 1 mois |
| 🟢 P3 | Multi-devises | 2 sem |

### Objectifs Produit

| Feature | Description |
|---------|-------------|
| Abonnements | Starter/Pro/Enterprise |
| White label | URL personnalisée |
| API publique | Pour intégrations |
| App mobile | React Native |

### Objectifs Business

- **KPIs:** 500 organisateurs, 10,000 transactions/mois
- **CA:** 50,000€/mois

## Long Terme (1-3 Ans) - Phase Expansion

### Objectifs Techniques

| Tâche | Description |
|-------|-------------|
| Microservices | Decoupage orders/tickets/events |
| IA | Recommandations personnalisées |
| Scale global | Multi-pays, multi-langues |

### Objectifs Produit

| Feature | Description |
|---------|-------------|
| Marketplace | Revente entre utilisateurs |
| Abonnement annuel | Discount 20% |
| Programme fidélité | Points, avantages |

### Objectifs Business

- **KPIs:** 2000+ organizateur, 100K transactions/mois
- **CA:** 500K€/mois (6M€/an)

---

# 9️⃣ RISQUES & MITIGATION

## Risques Techniques

| Risque | Probabilité | Impact | Mitigation |
|--------|------------|--------|-------------|
| **Panne PostgreSQL** | Moyenne | Critique | Réplica, backup automatisés |
| **Performance** | Haute | Moyen | Redis cache, CDN |
| **QR code trop gros** | Basse | Moyen | Stockage S3 |

## Risques Sécurité

| Risque | Probabilité | Impact | Mitigation |
|--------|------------|--------|------------|
| **Injection SQL** | Faible | Critique | Prisma ORM |
| **JWT cracké** | Faible | Critique | Rotation secrets, HTTPS |
| **Données fuite** | Faible | Critique | Chiffrement, IAM |

## Risques Business

| Risque | Probabilité | Impact | Mitigation |
|--------|------------|--------|------------|
| **Stripe bloque compte** | Moyenne | Critique | Stripe Atlas, conformité |
| **Concurrence降低prix** | Haute | Moyen | Différenciation service |
| **Churn organisateur** | Moyenne | Moyen | Support+, features |

## Risques Concurrence

| Concurrent | Menace | Réponse |
|------------|--------|---------|
| Eventbrite | Haute | Prix + UX |
| Weezevent | Moyenne | Tech + Service |
| TikTok/Insta | Faible | Utilité pro |

## Plan de Mitigation

```python
# Checklist sécurité mensuelle
- Rotation JWT secrets
- Audit dépendances npm
- Scan vulnérabilités (Snyk)
- Backup test restore
- Penetration testing trimestriel
```

---

# 🔟 PLAN DE PASSATION

## Étapes de Transition

### Semaine 1: Compréhension

1. **Lire cette documentation** (30 min)
2. **Explorer la codebase** (2h)
3. **Lancer en local** (1h)

### Semaine 2: Opérationnel

1. **Faire un achat test** (30 min)
2. **Créer un événement** (30 min)
3. **Scanner un billet** (30 min)

### Semaine 3: Expert

1. **Comprendre workflow payment** (2h)
2. **Configurer monitoring** (1h)
3. **Préparer déploiement prod** (4h)

## Ordre de Lecture du Code

**Recommandé:**

1. `backend/prisma/schema.prisma` - Modèle de données
2. `backend/src/index.js` - Architecture globale
3. `backend/src/modules/auth/` - Flux utilisateur
4. `backend/src/modules/orders/` - Logique paiement
5. `frontend/src/App.jsx` - Interface utilisateur

## Modules Critiques

| Module | Criticité | Raison |
|--------|-----------|--------|
| `payment.service.js` | 🔴 Critique | Revenu |
| `auth.routes.js` | 🔴 Critique | Accès |
| `orders.routes.js` | 🟠 Haute | Core business |
| `tickets.routes.js` | 🟠 Haute | Expérience |

## Connaissances Nécessaires

- **Backend:** Node.js, Express, Prisma, PostgreSQL
- **Frontend:** React, Vite
- **Ops:** Docker, Kubernetes (pour prod)
- **Paiement:** Stripe API, webhooks

---

# 📌 ANNEXES

## Commandes Docker Utiles

```bash
# Démarrer tout
docker-compose up -d

# Logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db

# Database
docker exec -it ticket-platform-db psql -U ticket_user -d ticket_platform

# Reset complet
docker-compose down -v && docker-compose up --build
```

## Variables d'Environnement Complètes

```env
# ===================
# MANDATORY
# ===================

# Database
POSTGRES_USER=ticket_user
POSTGRES_PASSWORD=<secure_password>
POSTGRES_DB=ticket_platform

# JWT
JWT_SECRET=<min_32_characters>
JWT_EXPIRES_IN=7d

# ===================
# OPTIONAL
# ===================

# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Redis
REDIS_URL=redis://redis:6379

# Production
NODE_ENV=production
ALLOWED_ORIGINS=https://domain.com

# Monitoring
PROMETHEUS_ENABLED=true
```

## Ressources Externes

- [Prisma Documentation](https://prisma.io/docs)
- [Stripe Documentation](https://stripe.com/docs)
- [React Router](https://reactrouter.com)
- [Docker Compose](https://docs.docker.com/compose)

---

**Document généré:** Février 2026  
**Prochaine revue:** Mai 2026  
**Version:** 1.0.0

---

*Ce document est la propriété de Ticket Hub. Toute reproduction est soumise à accord écrit.*

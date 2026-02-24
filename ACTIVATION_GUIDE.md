# 🎫 TicketHub v2.0 — Guide d'Activation Complète

## ✅ Ce qui a été implémenté

| Feature | Fichiers modifiés | Statut |
|---------|-------------------|--------|
| **Page d'accueil** Hero vidéo, photos événements, catégories | `frontend/src/App.jsx` + `index.css` | ✅ Prêt |
| **Google OAuth** | `auth.routes.js` + `App.jsx` | ⚙️ Config requise |
| **Stripe réel** | `payment.routes.js` + `payment.service.js` | ⚙️ Config requise |
| **Emails transactionnels** | `email.service.js` | ⚙️ Config requise |
| **Analytics dashboard** | `analytics.routes.js` + Admin page | ✅ Prêt |
| **Schéma DB étendu** | `schema.prisma` (category, videoUrl, OAuth) | ✅ Prêt |

---

## 🚀 Démarrage Rapide

```bash
cd ticket-platform
cp .env.example .env   # ou modifier le .env existant
docker-compose up --build
```

L'app sera disponible sur **http://localhost:3000**

---

## 🔑 Activation des Features

### 1. Google OAuth (connexion sociale)

**Google Cloud Console:**
1. Aller sur https://console.cloud.google.com
2. Créer un projet → APIs & Services → Credentials
3. Créer des identifiants OAuth 2.0 → Application Web
4. Ajouter dans "URIs de redirection autorisés" :
   - `http://localhost:5000/api/auth/google/callback` (dev)
   - `https://votre-domaine.com/api/auth/google/callback` (prod)

**Dans `.env` :**
```env
GOOGLE_CLIENT_ID=1234567890-abcdefgh.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-votre_secret
FEATURE_OAUTH_ENABLED=true
```

---

### 2. Stripe — Paiement Production

**Dashboard Stripe (https://dashboard.stripe.com) :**
1. Récupérer les clés API (test ou production)
2. Configurer le webhook : `POST /api/payments/webhook/stripe`
   - Events à écouter : `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
3. Copier le webhook secret

**Dans `.env` :**
```env
STRIPE_SECRET_KEY=sk_live_votre_cle_secrete    # ou sk_test_ pour tests
STRIPE_PUBLISHABLE_KEY=pk_live_votre_cle_pub
STRIPE_WEBHOOK_SECRET=whsec_votre_webhook_secret
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_votre_cle_pub   # IMPORTANT pour le frontend
FEATURE_STRIPE_ENABLED=true
```

⚠️ `VITE_STRIPE_PUBLISHABLE_KEY` doit être défini AVANT le build frontend.

---

### 3. Emails Transactionnels (Resend)

**Resend (https://resend.com) — 100 emails/jour gratuits :**
1. Créer un compte → API Keys → Create API Key
2. Vérifier votre domaine d'envoi (DNS)

**Dans `.env` :**
```env
EMAIL_API_KEY=re_votre_cle_resend
EMAIL_FROM=noreply@votre-domaine.com
EMAIL_FROM_NAME=TicketHub
FEATURE_EMAIL_ENABLED=true
```

Emails envoyés automatiquement :
- ✉️ Confirmation commande + QR codes après paiement
- ✉️ Email de bienvenue à l'inscription
- ✉️ Notification d'échec de paiement

---

## 📊 Analytics Dashboard

Accessible sur `/admin` (compte admin requis).

**Métriques disponibles :**
- Chiffre d'affaires total + croissance
- Billets vendus + croissance mensuelle
- Utilisateurs actifs + nouveaux cette semaine
- Graphique revenus 30 derniers jours
- Top 5 événements par CA
- Répartition commandes (Payées / En attente / Annulées)

---

## 🏗️ Architecture des Nouveaux Fichiers

```
ticket-platform/
├── backend/src/
│   ├── modules/
│   │   ├── auth/auth.routes.js          ← + Google OAuth
│   │   ├── payment/
│   │   │   ├── payment.routes.js        ← + Stripe PaymentIntents
│   │   │   └── payment.service.js       ← + Webhooks + Emails
│   │   ├── email/
│   │   │   └── email.service.js         ← NOUVEAU — Emails Resend
│   │   └── analytics/
│   │       └── analytics.routes.js      ← NOUVEAU — KPIs + Charts
│   └── index.js                         ← + Nouveaux routes
├── frontend/src/
│   ├── App.jsx                          ← Refonte complète
│   ├── index.css                        ← Nouveau design "Velvet Noir"
│   └── ...
├── frontend/index.html                  ← + Stripe.js CDN
├── backend/prisma/schema.prisma         ← + category, videoUrl, OAuth
└── .env                                 ← + GOOGLE_, VITE_STRIPE_
```

---

## 🔒 Variables d'Environnement Critiques

| Variable | Requis | Description |
|----------|--------|-------------|
| `JWT_SECRET` | ✅ | Min 32 chars, secret de signature JWT |
| `POSTGRES_PASSWORD` | ✅ | Mot de passe DB sécurisé |
| `GOOGLE_CLIENT_ID` | OAuth | ID client Google |
| `GOOGLE_CLIENT_SECRET` | OAuth | Secret client Google |
| `STRIPE_SECRET_KEY` | Paiement | Clé secrète Stripe (sk_live_ en prod) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Paiement | Clé publique pour le frontend |
| `STRIPE_WEBHOOK_SECRET` | Paiement | Pour valider les webhooks |
| `EMAIL_API_KEY` | Emails | Clé API Resend |

---

## 🐛 Mode Démo (sans config)

Sans configuration des services externes, la plateforme fonctionne en mode démo :

- **Paiement** : Bouton "Payer" → confirmation instantanée sans carte
- **OAuth** : Bouton "Google" → endpoint backend retourne erreur 503
- **Emails** : Logs console uniquement (pas d'envoi réel)
- **Analytics** : Données réelles de la DB

---

## 📦 Commandes Docker

```bash
# Démarrer
docker-compose up --build

# Après changement .env (rebuild frontend pour VITE_)
docker-compose build --no-cache frontend
docker-compose up -d

# Logs
docker-compose logs -f backend

# Reset complet
docker-compose down -v && docker-compose up --build

# Migration DB après modif schema.prisma
docker exec ticket-platform-backend npx prisma db push
```

---

## 🚀 Déploiement Production

1. `NODE_ENV=production` dans .env
2. Remplacer `sk_test_` par `sk_live_` (Stripe)
3. Configurer domaine email vérifié (Resend)
4. Activer HTTPS → décommenter section Nginx SSL dans `nginx/nginx.conf`
5. `ALLOWED_ORIGINS=https://votre-domaine.com`
6. Changer `JWT_SECRET` (minimum 64 caractères en prod)

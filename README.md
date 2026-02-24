# 🎫 Ticket Platform - Plateforme de réservation de billets

## 🚀 Lancement rapide

```bash
cd ticket-platform
docker-compose up --build
```

L'application sera disponible sur :
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000

---

## 📋 Configuration

### Variables d'environnement (.env)

```env
POSTGRES_USER=ticket_user
POSTGRES_PASSWORD=ticket_pass
POSTGRES_DB=ticket_platform

JWT_SECRET=votre-secret-jwt
JWT_EXPIRES_IN=7d

BACKEND_PORT=5000
FRONTEND_PORT=3000
```

---

## 🏗️ Architecture

```
ticket-platform/
├── backend/
│   ├── src/
│   │   ├── controllers/    # Logique métier
│   │   ├── middleware/      # Auth, erreurs
│   │   ├── routes/         # Routes API
│   │   └── index.js        # Point d'entrée
│   ├── prisma/
│   │   └── schema.prisma   # Schéma BD
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Application React
│   │   └── index.css       # Styles
│   ├── nginx.conf
│   ├── Dockerfile
│   └── package.json
├── nginx/
│   └── default.conf
├── docker-compose.yml
└── .env
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
- `POST /api/orders/:id/pay` - Paiement (mock)
- `GET /api/orders` - Mes commandes
- `GET /api/orders/all` - Toutes les commandes (admin)

### Billets
- `GET /api/tickets` - Mes billets
- `GET /api/tickets/:id` - Détail billet
- `POST /api/tickets/scan/:id` - Scanner billet (admin)

---

## 👤 Comptes par défaut

### Admin
- Email: admin@ticket.com
- Mot de passe: admin123

### Utilisateur
- Créez un compte via l'interface

---

## 🔒 Sécurité

- ✅ Hash bcrypt des mots de passe
- ✅ JWT pour l'authentification
- ✅ Rate limiting (100 req/15min)
- ✅ Helmet pour headers HTTP
- ✅ Validation des inputs
- ✅ Protection CORS

---

## 🛠️ Commandes utiles

```bash
# Lancer en mode développement
docker-compose up --build

# Arrêter les conteneurs
docker-compose down

# Voir les logs
docker-compose logs -f

# Reconstruire sans cache
docker-compose build --no-cache
```

---

## 📦 Stack technique

- **Backend**: Node.js + Express
- **Base de données**: PostgreSQL + Prisma
- **Frontend**: React + Vite
- **Reverse proxy**: Nginx
- **Container**: Docker + Docker Compose

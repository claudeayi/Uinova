# UInova Backend

Plateforme **UInova** (nocode builder) – **Node.js + Express + Prisma + MySQL**.  
API sécurisée, temps réel (Socket.io), exports multi-formats, paiements (Stripe/PayPal/CinetPay), assistant IA, badges/notifications, uploads et back-office admin.

---

## 🚀 Fonctionnalités

- **Authentification & rôles** : JWT (user/premium/admin), hash Bcrypt, middlewares `auth` + `requireRole`.
- **Projets & pages** : CRUD complet, statuts (PLANIFIE / EN_COURS / TERMINE), schémas JSON.
- **Exports** : HTML/React/Flutter/PWA/ZIP, `styles.css`, `sitemap.xml`, `robots.txt`, gestion des assets.
- **Paiements** : Stripe (Payment Intents), PayPal (Orders), CinetPay (init + check), Mock.
- **Collaboration** : Socket.io avec auth JWT, rooms projet/page, présence, cursors, rate-limit.
- **Assistant IA** : OpenAI (`gpt-4o`), modération locale configurable.
- **Badges & notifications** : gamification simple et messagerie utilisateur.
- **Uploads** : Multer + abstraction cloud (LOCAL / S3 / Cloudinary).
- **Admin** : liste/suppression d’utilisateurs (RBAC).
- **Docs Swagger** : `/api-docs` (UI) + `/api-docs.json` (spec).
- **Sécurité** : Helmet, rate-limit, validation (express-validator), logs & quotas.

---

## 🧩 Démarrer en local

### Prérequis
- **Node.js ≥ 18**
- **MySQL 8** (ou compatible)
- **npm** ou **pnpm**

### Installation

```bash
# 1) Dépendances
npm install

# 2) Variables d'environnement
cp .env.example .env
# -> ouvre .env et renseigne DATABASE_URL, JWT_SECRET, OPENAI_API_KEY, STRIPE_KEY, SMTP_*

# 3) Base de données
npx prisma migrate dev --name init
npx prisma generate

# (optionnel) Inspecter la DB
npx prisma studio

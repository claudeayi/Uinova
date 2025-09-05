# 🚀 UInova – Backend

Backend de la plateforme **UInova**, le **no-code builder nouvelle génération**.  
Construit avec **Node.js + Express + Prisma + MySQL**, sécurisé, modulaire et extensible.  

Il gère :  
✅ **Authentification & rôles avancés**  
✅ **Projets multi-pages & exports** (HTML, React, Flutter, PWA)  
✅ **Paiements intégrés** (Stripe, PayPal, CinetPay, Mock)  
✅ **Collaboration temps réel** (Socket.io + CRDT)  
✅ **Assistant IA** (OpenAI + modération)  
✅ **Marketplace** (vente/achat de templates)  
✅ **Multi-tenant** (Organisations, workspaces, rôles)  
✅ **Billing & usage** (API calls, storage, projets)  
✅ **Monitoring & observabilité** (Prometheus, Grafana)  
✅ **Back-office admin** complet  

---

## ✨ Fonctionnalités principales

### 🔑 Authentification & Sécurité
- JWT (user / premium / admin)
- Sessions multiples
- Hashage Bcrypt
- Rate-limit global + par route
- Helmet, CORS dynamique
- Middleware `authenticate` & `authorize`
- API Keys + Sessions utilisateurs

### 📂 Projets & Pages
- CRUD complet des **projets**
- **Statuts** : `PLANIFIE` / `EN_COURS` / `TERMINE`
- Multi-pages (JSON schema)
- **Export JSON compressé** pour replays
- **Favoris** (projet + templates)
- **Share Links** publics (preview avec token)

### 📦 Exports
- Formats : **HTML / React / Flutter / PWA / ZIP**
- Enqueue async (BullMQ) ou direct
- Assets optimisés + `robots.txt`, `sitemap.xml`
- Export cloud (S3/Cloudinary/Local)

### 💳 Paiements
- **Stripe** (Payment Intents)
- **PayPal** (Orders API)
- **CinetPay** (init + check)
- **Mock** intégré pour sandbox
- **Abonnements** (FREE, PRO, BUSINESS, ENTERPRISE)
- **Historique** des paiements et factures

### 🛒 Marketplace
- Publier des **templates & composants**
- Acheter / vendre
- Paiement intégré
- Admin : validation / rejet d’items

### 🤝 Collaboration temps réel
- **Socket.io + Y.js (CRDT)**
- Rooms par projet / page
- Présence + curseurs utilisateurs
- Historique `ReplaySession`
- Reprise à l’état précédent

### 🤖 Assistant IA
- **OpenAI / DeepSeek** (gpt-4o, embeddings, moderation)
- Génération de **composants / templates**
- Suggestions UI & auto-code
- IA onboarding coach

### 🏅 Badges & Notifications
- Attribution dynamique (actions)
- Gamification utilisateurs
- Notifications in-app & mails
- Templates emails personnalisables (DB)

### 🧑‍🤝‍🧑 Organisations & Multi-tenant
- Organisations (orgs)
- Membres (roles : `OWNER`, `ADMIN`, `MEMBER`)
- Invites avec email
- Workspaces multi-utilisateurs

### 📊 Billing & Usage
- **UsageRecord** (API, AI tokens, storage, exports)
- **UsageHistory** (par jour)
- Quotas dynamiques
- `/api/billing/me` → rapport usage actuel

### 📡 Monitoring & Observabilité
- `/health`, `/healthz`, `/version`
- **Prometheus metrics** (`/metrics`)
- Business & deploy metrics custom
- Logs audit (toutes les requêtes API)
- Intégration Grafana

### 🛠 Admin
- Hub admin `/api/admin`
- Gestion utilisateurs / projets / templates
- Logs & audit
- Gestion replays
- Validation marketplace
- Gestion des templates emails
- BullBoard (jobs async)

---

## 📂 Structure du projet

```bash
backend/
├─ src/
│  ├─ app.ts                   # Config Express (middlewares, routes, Swagger, Prometheus)
│  ├─ server.ts                # Serveur HTTP + Socket.io collab
│  │
│  ├─ controllers/             # Logique métier REST
│  │  ├─ authController.ts
│  │  ├─ projectController.ts
│  │  ├─ pageController.ts
│  │  ├─ exportController.ts
│  │  ├─ paymentController.ts
│  │  ├─ marketplaceController.ts
│  │  ├─ organizationController.ts
│  │  ├─ billingController.ts
│  │  └─ admin/...
│  │
│  ├─ routes/                  # Définition routes Express
│  │  ├─ auth.ts
│  │  ├─ projects.ts
│  │  ├─ pages.ts
│  │  ├─ exports.ts
│  │  ├─ payments.ts
│  │  ├─ marketplace.ts
│  │  ├─ organizations.ts
│  │  ├─ billing.ts
│  │  ├─ favorites.ts
│  │  └─ admin.ts
│  │
│  ├─ services/                # Intégrations & logique avancée
│  │  ├─ collab.ts
│  │  ├─ paymentServices.ts
│  │  ├─ billingService.ts
│  │  ├─ aiService.ts
│  │  ├─ deployService.ts
│  │  └─ cloud.ts
│  │
│  ├─ middlewares/             # Middlewares globaux
│  ├─ validators/              # Schemas Zod centralisés
│  ├─ utils/                   # Helpers (jwt, hash, prisma, swagger)
│  ├─ __tests__/               # Tests unitaires & intégration
│  └─ types/express.d.ts       # Typage étendu req/res
│
├─ prisma/
│  ├─ schema.prisma             # ✅ complet (Users, Orgs, Billing, Marketplace, Deploy…)
│  └─ seed.ts                   # Données de démo
│
├─ uploads/                     # Fichiers uploadés
├─ swagger.yaml                 # Documentation OpenAPI
├─ docker-compose.yml           # MySQL + Prometheus + Grafana
├─ Dockerfile
├─ package.json
├─ tsconfig.json
├─ .env.example                 # Clés API (Stripe, PayPal, CinetPay, OpenAI)
└─ .github/workflows/ci.yml     # CI/CD (lint, test, migrate, swagger)

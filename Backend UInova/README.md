# 🚀 UInova – Backend

Plateforme **UInova** – un **nocode builder nouvelle génération**.  
Backend en **Node.js + Express + Prisma + MySQL**, sécurisé et extensible, avec **exports multi-formats**, **collaboration temps réel**, **paiements intégrés**, **assistant IA**, et **back-office admin**.

---

## ✨ Fonctionnalités principales

- 🔑 **Authentification & rôles**
  - JWT (user / premium / admin)
  - Hash Bcrypt
  - Middlewares `auth` + `requireRole`
  - Multi-sessions

- 📂 **Projets & pages**
  - CRUD complet
  - Statuts : `PLANIFIE` / `EN_COURS` / `TERMINE`
  - Schémas JSON persistés
  - Gestion des versions

- 📦 **Exports**
  - HTML / React / Flutter / PWA
  - Export **ZIP** avec `styles.css`, `sitemap.xml`, `robots.txt`
  - Gestion des assets optimisée

- 💳 **Paiements**
  - Stripe (Payment Intents)
  - PayPal (Orders)
  - CinetPay (init + check)
  - Mock intégré pour tests locaux

- 🤝 **Collaboration temps réel**
  - Socket.io avec auth JWT
  - Rooms par projet/page
  - Présence utilisateurs + curseurs
  - Rate-limit intégré

- 🤖 **Assistant IA**
  - OpenAI (`gpt-4o`)
  - Génération de templates / composants
  - Modération configurable

- 🏅 **Badges & notifications**
  - Gamification (badges par actions)
  - Notifications push utilisateurs

- 📤 **Uploads**
  - Multer
  - Abstraction cloud : **LOCAL / S3 / Cloudinary**
  - Statics publics via `/uploads`

- 🛠 **Admin**
  - Gestion utilisateurs (RBAC)
  - Suppression & rôles

- 📑 **Documentation API**
  - Swagger UI : `/api-docs`
  - JSON spec : `/api-docs.json`
  - Fichier : `swagger.yaml`

- 🛡 **Sécurité**
  - Helmet
  - Rate-limit global `/api`
  - Validation via `express-validator`
  - Logs + quotas
  - Headers personnalisés (`securityHeaders`)

---

## 📂 Structure du projet


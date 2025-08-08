# UInova Backend

Ce dépôt contient l’API de la plateforme UInova (nocode builder) basée sur Node.js, Express, MySQL et Prisma.

## 🚀 Fonctionnalités

- **Authentification** : inscription, connexion, JWT (avec rôles user/premium/admin).
- **Gestion des projets/pages** : CRUD complet (plusieurs projets, plusieurs pages par projet).
- **Exports** : génération multi-format (HTML, Flutter, React, Vue, JSON, ZIP) et historique.
- **Paiements** : intégration Stripe/PayPal/Cinetpay pour abonnements et achats.
- **Collaboration** : édition en temps réel via Socket.io.
- **Assistant IA** : integration OpenAI (chat, génération UI).
- **Badges & notifications** : gamification et messaging utilisateur.
- **Uploads** : envoi de fichiers/images.
- **Admin** : routes pour gérer utilisateurs, projets et logs.
- **Documentation Swagger** : accessible via `/api-docs`.
- **Sécurité** : casque Helmet, rate‑limit, validations et hashing des mots de passe.

## 🧩 Démarrer en local

### Prérequis
- Node.js ≥ 18
- MySQL
- npm

### Installation

```bash
npm install
cp .env.example .env   # puis renseigner vos valeurs
npx prisma migrate dev --name init
npx prisma generate

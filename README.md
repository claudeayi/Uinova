# 🌌 UInova – Next-Gen No-Code Builder

**UInova** est une plateforme **no-code nouvelle génération**, permettant de **créer, déployer et monétiser** des sites web et applications en quelques minutes.  
Elle combine **éditeur visuel**, **copilot IA**, **collaboration temps réel**, **paiements intégrés**, et **marketplace** pour créer un écosystème complet.  

---

## ✨ Fonctionnalités principales

- 🔑 **Authentification & rôles**
  - Login/Register avec JWT
  - Rôles : **USER / PREMIUM / ADMIN**
  - Sessions multi-devices
  - Gestion d’organisations & workspaces

- 📂 **Projets & Pages**
  - Création illimitée de projets
  - Pages multiples par projet
  - Sauvegarde en temps réel
  - Export en **HTML / React / Flutter / PWA**

- 🖌️ **Éditeur avancé**
  - Canvas drag & drop
  - Grille adaptative
  - Redimensionnement, rotation, multi-sélection
  - Historique Undo/Redo
  - **Asset Library** (images, fichiers, upload, preview)
  - Mode **Preview Live** & **Lien public partageable**

- 🤖 **Assistant IA**
  - Chat Copilot (Deepseek / OpenAI)
  - Génération d’interfaces depuis une description
  - Suggestions automatiques de composants
  - Aide à la navigation & onboarding

- 🛒 **Marketplace intégrée**
  - Templates & composants réutilisables
  - Achat / Vente entre utilisateurs
  - Validation par admin
  - Favoris, historique d’achats et revenus créateurs

- 💳 **Paiements & Billing**
  - Intégrations **Stripe, PayPal, Mobile Money (CinetPay)**
  - Abonnements **Freemium / Premium**
  - Suivi usage : API, stockage, exports, IA
  - Facturation détaillée et historique

- 🤝 **Collaboration temps réel**
  - Socket.io + Y.js (CRDT)
  - Cursors multi-utilisateurs
  - Replays collaboratifs (time travel editing)

- 🏅 **Badges & Gamification**
  - Succès utilisateurs
  - Notifications push en temps réel

- 🛠 **Cockpit Admin**
  - Gestion utilisateurs (RBAC)
  - Logs & monitoring système
  - Validation marketplace
  - Templates emails & envois automatiques

- 📊 **Monitoring & Observabilité**
  - Prometheus + Grafana
  - AuditLogs
  - Métriques API & business

---

## 🏗 Architecture

```mermaid
flowchart TD
  subgraph Frontend [Frontend – React + Vite]
    A[React + TS] --> B[TailwindCSS UI]
    A --> C[Hooks (Auth, Theme, Toast)]
    A --> D[Pages (Dashboard, Editor, Marketplace)]
    A --> E[Services API Axios]
  end

  subgraph Backend [Backend – Node.js + Express]
    F[Express API] --> G[Controllers REST]
    F --> H[Socket.io – Collab]
    F --> I[Swagger / OpenAPI]
    G --> J[Prisma ORM + MySQL]
    G --> K[Services (AI, Billing, Payments)]
  end

  subgraph Infra [Infra & Ops]
    L[MySQL DB]
    M[Prometheus + Grafana]
    N[Docker Compose]
    O[GitHub Actions CI/CD]
  end

  E <--> F
  J --> L
  F --> M
  F --> O

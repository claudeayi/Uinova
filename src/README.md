# 🎨 UInova – Frontend

Frontend de la plateforme **UInova**, le **no-code builder nouvelle génération**.  
Construit avec **React + TypeScript + TailwindCSS + Recharts**, totalement intégré avec le backend **Node.js/Prisma/MySQL**.  

Il inclut :  
✅ **Éditeur no-code avancé** (drag & drop, grille, undo/redo, assets)  
✅ **Copilot IA** (génération d’interfaces & composants)  
✅ **Gestion multi-projets & multi-pages**  
✅ **Marketplace intégrée** (templates, composants, achat/vente)  
✅ **Paiements sécurisés** (Stripe, PayPal, Mobile Money, CinetPay)  
✅ **Mode preview & partage public**  
✅ **Monitoring et cockpit utilisateur**  
✅ **Interface admin** complète  
✅ **Design moderne & responsive (dark mode inclus)**  

---

## ✨ Fonctionnalités principales

### 🔑 Authentification
- Login / Register avec JWT
- Rôles : **USER / PREMIUM / ADMIN**
- Context global `useAuth`
- Guard routes avec `ProtectedRoute`

### 📂 Projets & Pages
- Dashboard multi-projets
- CRUD complet projets
- Multi-pages dans chaque projet
- Navigation interne fluide
- Export vers HTML/React/Flutter/PWA

### 🖌️ Éditeur no-code
- **Canvas drag & drop**
- Grille adaptative
- Palette de composants
- Redimensionnement, rotation, multi-sélection
- Undo / Redo
- **Asset Library** (upload, preview, organisation)
- Mode **Preview live** (iframe readonly)
- **Share modal** (génération lien public)

### 🤖 Assistant IA
- Assistant conversationnel (Deepseek / OpenAI)
- Génération d’interfaces depuis une description
- Suggestions UI automatiques
- Copilot intégré dans l’éditeur

### 🛒 Marketplace
- Templates & composants
- Achat / vente via paiements intégrés
- Détail d’item avec preview
- Validation admin
- Favoris & achats listés dans l’espace utilisateur

### 💳 Paiements & Billing
- Stripe, PayPal, Mobile Money (CinetPay)
- Gestion abonnements (Freemium / Premium)
- Facturation & suivi usage
- Page **Billing** avec graphiques (Recharts)
- Historique consommation (API calls, stockage)

### 📊 Monitoring & Cockpit
- Dashboard utilisateur avec :
  - Projets
  - Stats API / usage
  - Notifications
  - Badges gamification
- Monitoring admin (logs, CPU, mémoire, sessions)

### 🛠 Admin
- Gestion utilisateurs
- Gestion projets
- Logs & replays
- Validation marketplace
- Gestion templates emails

---

## 📂 Structure du projet

```bash
frontend/
├─ src/
│  ├─ App.tsx                   # Routing global (lazy loading + layouts)
│  ├─ main.tsx                  # Entrée React (providers, mount root)
│  ├─ index.css                 # Styles globaux (Tailwind, animations, dark mode)
│  │
│  ├─ layouts/
│  │  ├─ Navbar.tsx             # Navigation responsive
│  │  └─ DashboardLayout.tsx    # Layout cockpit (sidebar + header)
│  │
│  ├─ context/
│  │  └─ ProjectContext.tsx     # Contexte projet actif
│  │
│  ├─ hooks/
│  │  ├─ useAuth.ts             # Hook auth global
│  │  ├─ useToast.ts            # Notifications centralisées
│  │  └─ useTheme.ts            # Dark / light mode
│  │
│  ├─ services/                 # Appels API
│  │  ├─ http.ts                # Axios configuré (baseURL + JWT)
│  │  ├─ auth.ts                # Login/Register/Me
│  │  ├─ projects.ts            # CRUD projets
│  │  ├─ marketplace.ts         # API marketplace
│  │  ├─ payments.ts            # API paiements
│  │  ├─ billing.ts             # API billing
│  │  ├─ notifications.ts       # Notifications
│  │  ├─ ai.ts                  # API assistant IA
│  │  └─ admin.ts               # API admin
│  │
│  ├─ components/
│  │  ├─ base/                  # Boutons, Inputs, etc.
│  │  ├─ advanced/              # Cards, Modal, Carousel
│  │  ├─ editor/                # Canvas, Palette, LivePreview
│  │  └─ projects/              # Sélecteur projets, etc.
│  │
│  ├─ pages/                    # Pages principales
│  │  ├─ Dashboard.tsx
│  │  ├─ ProjectsPage.tsx
│  │  ├─ EditorPage.tsx
│  │  ├─ PreviewPage.tsx
│  │  ├─ MarketplacePage.tsx
│  │  ├─ TemplatePage.tsx
│  │  ├─ BillingPage.tsx
│  │  ├─ DeployPage.tsx
│  │  ├─ MonitoringPage.tsx
│  │  ├─ AIAssistantPage.tsx
│  │  ├─ LoginPage.tsx
│  │  ├─ RegisterPage.tsx
│  │  └─ NotFound.tsx
│  │
│  └─ routes/
│     └─ ProtectedRoute.tsx      # Protection des routes
│
├─ public/                       # favicon, manifest, index.html
├─ tailwind.config.js
├─ vite.config.ts
├─ package.json
├─ tsconfig.json
└─ .env.example                  # VITE_API_URL, clés test Stripe/PayPal/OpenAI

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

frontend/
├─ src/
│  ├─ App.tsx                     # Routing global (lazy + layouts)
│  ├─ main.tsx                    # Entrée React (providers, error boundary)
│  ├─ index.css                   # Styles globaux (Tailwind, dark mode)
│  │
│  ├─ layouts/
│  │  ├─ DashboardLayout.tsx      # Layout cockpit (sidebar + header)
│  │  ├─ AdminLayout.tsx          # Layout admin (sidebar + topbar)
│  │  └─ Navbar.tsx               # Navbar responsive
│  │
│  ├─ context/
│  │  ├─ AuthContext.tsx
│  │  ├─ ProjectContext.tsx
│  │  ├─ WorkspaceContext.tsx
│  │  └─ FavoritesContext.tsx
│  │
│  ├─ hooks/
│  │  ├─ useAuth.ts
│  │  ├─ useToast.ts
│  │  ├─ useTheme.ts
│  │  └─ useWorkspace.ts
│  │
│  ├─ services/                   # Appels API
│  │  ├─ http.ts
│  │  ├─ auth.ts
│  │  ├─ projects.ts
│  │  ├─ marketplace.ts
│  │  ├─ payments.ts
│  │  ├─ billing.ts
│  │  ├─ notifications.ts
│  │  ├─ ai.ts
│  │  └─ admin.ts
│  │
│  ├─ components/
│  │  ├─ base/                    # Boutons, Inputs, etc.
│  │  ├─ advanced/                # Cards, Carousel, Modal
│  │  ├─ editor/                  # Canvas, Palette, Toolbar, AssetLibrary
│  │  │  ├─ LiveEditor.tsx
│  │  │  ├─ EditorWrapper.tsx
│  │  │  ├─ ComponentPalette.tsx
│  │  │  ├─ ProPalette.tsx
│  │  │  ├─ SelectionToolbar.tsx
│  │  │  ├─ AssetLibrary.tsx
│  │  │  └─ renderers.tsx
│  │  ├─ projects/                # Sélecteurs projets
│  │  └─ ui/                      # Shadcn/ui (Button, Card, DropdownMenu…)
│  │
│  ├─ pages/
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
│  │  ├─ ReplayPage.tsx
│  │  ├─ NotificationsPage.tsx
│  │  ├─ BadgesPage.tsx
│  │  ├─ LoginPage.tsx
│  │  ├─ RegisterPage.tsx
│  │  └─ NotFound.tsx
│  │
│  ├─ routes/
│  │  └─ ProtectedRoute.tsx
│  │
│  ├─ utils/
│  │  └─ cn.ts                    # utilitaire tailwind
│  │
│  └─ store/
│     ├─ useAppStore.ts           # Zustand (canvas, pages, history)
│     ├─ useCMS.ts                # Mock CMS pour collection
│     └─ useThemeStore.ts
│
├─ public/                         # favicon, manifest, index.html
├─ tailwind.config.js
├─ vite.config.ts
├─ package.json
├─ tsconfig.json
└─ .env.example                    # VITE_API_URL, clés Stripe/PayPal/OpenAI/CinetPay

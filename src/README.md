# 🎨 UInova – Frontend

Frontend de la plateforme **UInova**, le **no-code builder nouvelle génération**.  
Construit avec **React + TypeScript + TailwindCSS + Zustand + Recharts**, et totalement intégré avec le backend **Node.js / Prisma / MySQL**.  

## 🚀 Points forts

✅ **Éditeur no-code avancé** (drag & drop, grille, undo/redo, asset library)  
✅ **Copilot IA** intégré (DeepSeek / OpenAI pour générer des interfaces en un prompt)  
✅ **Gestion multi-projets & multi-pages** avec navigation fluide  
✅ **Marketplace** (templates & composants, achat/vente avec paiement intégré)  
✅ **Paiements sécurisés** (Stripe, PayPal, Mobile Money via CinetPay)  
✅ **Mode Preview public** (lien partageable)  
✅ **Monitoring & cockpit utilisateur** (stats, logs, badges gamification)  
✅ **Interface Admin** complète (users, projets, logs, paiements, marketplace)  
✅ **Design moderne & responsive** avec **dark mode natif**  

---

## 🛠️ Stack technique

- **Frontend** : React 18 + TypeScript + Vite  
- **UI** : TailwindCSS + Shadcn/ui + Lucide-react  
- **State Management** : Zustand (store global) + React Context API  
- **Charts & monitoring** : Recharts  
- **Auth & sécurité** : JWT, ProtectedRoute, context global `useAuth`  
- **API** : Axios (http client) → connecté au backend Node/Prisma/MySQL  
- **Qualité DX** : Hooks custom (`useAuth`, `useBilling`, `useWorkspace`), code split, lazy loading  

---

## ✨ Fonctionnalités

### 🔑 Authentification
- Login / Register avec JWT
- Rôles : **USER / PREMIUM / ADMIN**
- Route guard (`ProtectedRoute`)  
- Context global **`useAuth`**

### 📂 Projets & Pages
- CRUD projets & pages
- Multi-pages dans chaque projet
- Dupliquer / Publier / Partager
- Export **HTML / React / Flutter / PWA**

### 🖌️ Éditeur no-code
- Canvas drag & drop **intelligent**
- Grille adaptative avec snapping
- Undo / Redo
- Palette de composants & **ProPalette** (premium)
- Asset Library (upload, preview, organisation)
- Mode **Preview live** (iframe readonly)
- Partage public avec lien sécurisé

### 🤖 Copilot IA
- Génération UI depuis un prompt
- Suggestions UI intelligentes
- Preview instantanée (React/HTML)

### 🛒 Marketplace
- Templates & composants premium
- Paiement Stripe / PayPal / CinetPay
- Liste achats et favoris
- Validation admin

### 💳 Billing & Paiements
- Facturation (invoices PDF/CSV)
- Usage report (API calls, stockage, projets)
- Graphiques interactifs (Recharts)
- Abonnements (Freemium / Premium)

### 📊 Monitoring
- Cockpit utilisateur
- Stats temps réel (API, CPU, mémoire, stockage)
- Notifications & gamification (badges)

### 🛠️ Admin
- Gestion **utilisateurs / projets / logs / replays**
- Monitoring global
- Gestion marketplace
- Templates emails transactionnels

---

## 📂 Structure

```bash
frontend/
├─ src/
│  ├─ App.tsx                # Routing global
│  ├─ main.tsx               # Entrée React (providers)
│  ├─ layouts/               # Layouts (Dashboard, Admin, Navbar)
│  ├─ context/               # Auth, Projet, Workspace, Favorites
│  ├─ hooks/                 # useAuth, useBilling, useTheme…
│  ├─ services/              # API: auth, projects, billing, ai, admin…
│  ├─ components/            # Base, Advanced, Editor, UI
│  ├─ pages/                 # Dashboard, Projects, Editor, Preview, Billing…
│  ├─ routes/                # ProtectedRoute
│  ├─ store/                 # Zustand (canvas, workspace, thème)
│  └─ utils/                 # cn.ts (helpers Tailwind)
│
├─ public/                   # favicon, manifest
├─ tailwind.config.js
├─ vite.config.ts
├─ package.json
├─ tsconfig.json
└─ .env.example              # VITE_API_URL, clés Stripe/PayPal/OpenAI/CinetPay

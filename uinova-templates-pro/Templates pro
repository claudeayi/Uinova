#!/usr/bin/env bash
set -e

REPO="uinova-templates-pro"
TEMPLATES=("landing-saas" "elearning-mobile" "dashboard-saas" "ecommerce-advanced" "crm-pro" "erp-lite" "bi-dashboard" "reseau-social-mini" "seo-tool" "outil-collaboratif")

echo "📁 Création du repo $REPO"
rm -rf "$REPO"
mkdir -p "$REPO/templates"
cd "$REPO"

# -----------------------
# .gitignore global
# -----------------------
cat > .gitignore <<'EOF'
node_modules
dist
.vite
.env
.DS_Store
EOF

# -----------------------
# README global
# -----------------------
cat > README.md <<'EOF'
# UInova – Batch enrichi de 10 templates Premium

Chaque template inclut :
- **frontend/** React + Vite + Tailwind + React Router
- **backend/** Node.js + Express + CRUD (in-memory) + healthcheck
- **scripts** :
  - Front : `npm run dev` (http://localhost:5173)
  - Back :  `npm run dev` (http://localhost:3000)

Arborescence :
templates/<template>/{frontend,backend}

Démarrage type :
cd templates/landing-saas/backend && npm i && npm run dev
cd templates/landing-saas/frontend && npm i && npm run dev
EOF

# -----------------------
# HELPERS FRONT
# -----------------------
make_front () {
  ROOT="$1/frontend"
  APPTITLE="$2"

  mkdir -p "$ROOT/src/pages"
  mkdir -p "$ROOT/src"
  mkdir -p "$ROOT/public"

  # package.json
  cat > "$ROOT/package.json" <<'EOF'
{
  "private": true,
  "type": "module",
  "scripts": { "dev": "vite", "build": "vite build", "preview": "vite preview" },
  "dependencies": {
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "react-router-dom": "6.26.2"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "4.3.1",
    "autoprefixer": "10.4.20",
    "postcss": "8.4.41",
    "tailwindcss": "3.4.10",
    "vite": "5.4.10"
  }
}
EOF

  # Vite + Tailwind
  cat > "$ROOT/vite.config.js" <<'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({ plugins: [react()] })
EOF

  cat > "$ROOT/tailwind.config.js" <<'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html","./src/**/*.{js,jsx,ts,tsx}"],
  theme: { extend: {} },
  plugins: []
}
EOF

  cat > "$ROOT/postcss.config.js" <<'EOF'
export default { plugins: { tailwindcss: {}, autoprefixer: {} } }
EOF

  cat > "$ROOT/index.html" <<EOF
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>$APPTITLE</title>
  </head>
  <body class="bg-white text-slate-800">
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
EOF

  cat > "$ROOT/src/index.css" <<'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;
EOF

  # App minimale avec routes
  cat > "$ROOT/src/main.jsx" <<'EOF'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import './index.css'
import Home from './pages/Home.jsx'
import About from './pages/About.jsx'

function Layout({children}) {
  return (
    <>
      <nav className="px-6 py-3 bg-slate-100 border-b border-slate-200 flex gap-4 items-center">
        <Link to="/" className="font-extrabold">UInova</Link>
        <Link to="/about" className="hover:underline">À propos</Link>
      </nav>
      <main className="p-8 max-w-5xl mx-auto">{children}</main>
    </>
  )
}
function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home/>} />
          <Route path="/about" element={<About/>} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
createRoot(document.getElementById('root')).render(<App/>)
EOF

  # Pages de base
  cat > "$ROOT/src/pages/Home.jsx" <<'EOF'
export default function Home(){
  return (
    <section className="text-center space-y-3">
      <h1 className="text-3xl font-bold">Démarrez en 5 minutes</h1>
      <p className="text-slate-500">Starter front prêt avec React + Vite + Tailwind.</p>
      <a href="#" className="inline-block px-4 py-2 rounded bg-sky-600 text-white">Action principale</a>
    </section>
  )
}
EOF

  cat > "$ROOT/src/pages/About.jsx" <<'EOF'
export default function About(){
  return (
    <section className="prose max-w-none">
      <h2>À propos</h2>
      <p>Ce template est prêt pour vos personnalisations UI et votre logique métier.</p>
    </section>
  )
}
EOF
}

make_page () {
  FILE="$1/frontend/src/pages/$2.jsx"
  TITLE="$3"
  SUB="$4"
  CTA="$5"
  cat > "$FILE" <<EOF
export default function $2(){
  return (
    <section className="text-center space-y-3">
      <h1 className="text-3xl font-bold">$TITLE</h1>
      <p className="text-slate-500">$SUB</p>
      ${CTA:+<button className="px-4 py-2 bg-blue-600 text-white rounded">$CTA</button>}
    </section>
  )
}
EOF
}

# -----------------------
# HELPERS BACK
# -----------------------
make_back () {
  ROOT="$1/backend"
  API_IMPORTS="$2"   # lignes d'import des routers
  API_USE="$3"       # lignes d'app.use

  mkdir -p "$ROOT/src/routes"

  cat > "$ROOT/package.json" <<'EOF'
{
  "private": true,
  "type": "module",
  "scripts": { "dev": "nodemon src/index.js" },
  "dependencies": {
    "body-parser": "1.20.2",
    "cors": "2.8.5",
    "express": "4.19.2"
  },
  "devDependencies": {
    "nodemon": "3.1.4"
  }
}
EOF

  cat > "$ROOT/src/index.js" <<EOF
import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import healthRouter from './routes/health.js'
$API_IMPORTS

const app = express()
app.use(cors())
app.use(bodyParser.json())

app.use('/health', healthRouter)
$API_USE

// 404
app.use((req,res)=>res.status(404).json({error:'Not Found'}))
// error handler
app.use((err,req,res,next)=>{ console.error(err); res.status(500).json({error:'Server Error'}) })

app.listen(3000, ()=>console.log('✅ API http://localhost:3000'))
EOF

  cat > "$ROOT/src/routes/health.js" <<'EOF'
import { Router } from 'express'
const r = Router()
r.get('/', (req,res)=>res.json({status:'ok'}))
export default r
EOF
}

crud_file () {
  ROOT="$1/backend/src/routes/$2.js"
  cat > "$ROOT" <<'EOF'
import { Router } from 'express'
const r = Router()
let data = []
r.post('/', (req,res)=>{ const obj={ id:Date.now(), ...req.body }; data.push(obj); res.json(obj) })
r.get('/',  (req,res)=>res.json(data))
r.put('/:id',(req,res)=>{ const i=data.findIndex(x=>String(x.id)===req.params.id); if(i<0) return res.status(404).end(); data[i]={...data[i],...req.body}; res.json(data[i]) })
r.delete('/:id',(req,res)=>{ data=data.filter(x=>String(x.id)!==req.params.id); res.json({ok:true}) })
export default r
EOF
}

# ----------------------------------
# TEMPLATES CONCRETS
# ----------------------------------
cd templates

# 1) Landing SaaS
mkdir -p landing-saas
make_front landing-saas "Landing SaaS"
make_page  landing-saas Home  "Créez en 5 minutes" "Landing page optimisée SEO" "Commencer"
crud_file  landing-saas leads
make_back  landing-saas "import leadsRouter from './routes/leads.js'" "app.use('/leads', leadsRouter)"

# 2) E-learning Mobile
mkdir -p elearning-mobile
make_front elearning-mobile "E-learning Mobile"
make_page  elearning-mobile Home "Cours interactifs" "Modules, quiz, badges" "S'inscrire"
crud_file  elearning-mobile courses
crud_file  elearning-mobile users
make_back  elearning-mobile "import coursesRouter from './routes/courses.js'\nimport usersRouter from './routes/users.js'" "app.use('/courses', coursesRouter)\napp.use('/users', usersRouter)"

# 3) Dashboard SaaS
mkdir -p dashboard-saas
make_front dashboard-saas "Dashboard SaaS"
make_page  dashboard-saas Home "Analyse KPIs" "Graphes et stats" ""
crud_file  dashboard-saas users
crud_file  dashboard-saas metrics
make_back  dashboard-saas "import usersRouter from './routes/users.js'\nimport metricsRouter from './routes/metrics.js'" "app.use('/users', usersRouter)\napp.use('/metrics', metricsRouter)"

# 4) E-commerce avancé
mkdir -p ecommerce-advanced
make_front ecommerce-advanced "E-commerce"
make_page  ecommerce-advanced Home "Produits" "Catalogue + Paiements" "Acheter"
crud_file  ecommerce-advanced products
crud_file  ecommerce-advanced orders
make_back  ecommerce-advanced "import productsRouter from './routes/products.js'\nimport ordersRouter from './routes/orders.js'" "app.use('/products', productsRouter)\napp.use('/orders', ordersRouter)"

# 5) CRM Pro
mkdir -p crm-pro
make_front crm-pro "CRM Pro"
make_page  crm-pro Home "Pipeline" "Contacts et deals" ""
crud_file  crm-pro contacts
crud_file  crm-pro deals
make_back  crm-pro "import contactsRouter from './routes/contacts.js'\nimport dealsRouter from './routes/deals.js'" "app.use('/contacts', contactsRouter)\napp.use('/deals', dealsRouter)"

# 6) ERP Lite
mkdir -p erp-lite
make_front erp-lite "ERP Lite"
make_page  erp-lite Home "Gestion stock" "Commandes et fournisseurs" ""
crud_file  erp-lite stock
crud_file  erp-lite orders
make_back  erp-lite "import stockRouter from './routes/stock.js'\nimport ordersRouter from './routes/orders.js'" "app.use('/stock', stockRouter)\napp.use('/orders', ordersRouter)"

# 7) BI Dashboard
mkdir -p bi-dashboard
make_front bi-dashboard "BI Dashboard"
make_page  bi-dashboard Home "Tableaux dynamiques" "Données multiples + filtres" ""
crud_file  bi-dashboard reports
crud_file  bi-dashboard datasets
make_back  bi-dashboard "import reportsRouter from './routes/reports.js'\nimport datasetsRouter from './routes/datasets.js'" "app.use('/reports', reportsRouter)\napp.use('/datasets', datasetsRouter)"

# 8) Réseau Social Mini
mkdir -p reseau-social-mini
make_front reseau-social-mini "Mini Réseau Social"
make_page  reseau-social-mini Home "Fil & profils" "Posts, likes, commentaires" ""
crud_file  reseau-social-mini posts
crud_file  reseau-social-mini follows
make_back  reseau-social-mini "import postsRouter from './routes/posts.js'\nimport followsRouter from './routes/follows.js'" "app.use('/posts', postsRouter)\napp.use('/follows', followsRouter)"

# 9) SEO Tool
mkdir -p seo-tool
make_front seo-tool "SEO Tool"
make_page  seo-tool Home "Audit SEO" "Pages + rapports" "Analyser"
crud_file  seo-tool audits
crud_file  seo-tool keywords
make_back  seo-tool "import auditsRouter from './routes/audits.js'\nimport keywordsRouter from './routes/keywords.js'" "app.use('/audits', auditsRouter)\napp.use('/keywords', keywordsRouter)"

# 10) Outil collaboratif
mkdir -p outil-collaboratif
make_front outil-collaboratif "Outil collaboratif"
make_page  outil-collaboratif Home "Kanban" "Projets + tâches + chat" ""
crud_file  outil-collaboratif projects
crud_file  outil-collaboratif tasks
make_back  outil-collaboratif "import projectsRouter from './routes/projects.js'\nimport tasksRouter from './routes/tasks.js'" "app.use('/projects', projectsRouter)\napp.use('/tasks', tasksRouter)"

echo "✅ Templates enrichis générés dans $REPO"
echo "➡️ Exemple :"
echo "cd $REPO/templates/landing-saas/backend && npm i && npm run dev"
echo "cd $REPO/templates/landing-saas/frontend && npm i && npm run dev"

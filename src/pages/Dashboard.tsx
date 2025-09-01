// src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import axios from "axios";
import io from "socket.io-client";
import DashboardLayout from "@/layouts/DashboardLayout";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { PlusCircle, ShoppingBag, Cpu, Bot } from "lucide-react";
import { motion } from "framer-motion";

/* ===============================
   Interfaces
=============================== */
interface Project {
  id: string;
  name: string;
  status: string;
  updatedAt: string;
}
interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}
interface Badge {
  id: string;
  type: string;
  earnedAt: string;
}
interface Metrics {
  uptime: number;
  memory: { used: number; free: number; total: number; usagePercent: string };
  cpu: { loadAvg: number[]; cores: number };
}
interface MarketplaceItem {
  id: string;
  title: string;
  description?: string;
  priceCents: number;
  createdAt: string;
}
interface Payment {
  id: string;
  provider: string;
  amount: number;
  currency: string;
  createdAt: string;
}

/* ===============================
   Dashboard – Cockpit Central
=============================== */
export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [marketplace, setMarketplace] = useState<MarketplaceItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [aiPrompt, setAiPrompt] = useState("");
  const [liveActivity, setLiveActivity] = useState<string[]>([]);
  const [cpuHistory, setCpuHistory] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
    loadMonitoring();
    loadMarketplace();
    loadPayments();

    // ⚡ Socket temps réel
    const socket = io("http://localhost:5000", {
      auth: { token: localStorage.getItem("token") },
    });

    socket.on("metrics:update", (data: Metrics) => {
      setMetrics(data);
      setCpuHistory((prev) =>
        [...prev.slice(-9), { time: new Date().toLocaleTimeString(), cpu: data.cpu.loadAvg[0] }]
      );
    });

    socket.on("notification:new", (notif: Notification) => {
      setNotifications((prev) => [notif, ...prev].slice(0, 5));
      toast.success(`🔔 ${notif.title}`);
    });

    socket.on("activity", (msg: string) => {
      setLiveActivity((prev) => [msg, ...prev].slice(0, 10));
    });

    socket.on("payment:new", (p: Payment) => {
      setPayments((prev) => [p, ...prev].slice(0, 5));
      toast.success(`💳 Paiement ${p.amount} ${p.currency}`);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  /* ===============================
     Load Data
  =============================== */
  async function loadData() {
    try {
      const [projRes, notifRes, badgeRes] = await Promise.all([
        axios.get("/api/projects/mine"),
        axios.get("/api/notifications?limit=5"),
        axios.get("/api/badges?limit=5"),
      ]);
      setProjects(projRes.data.items || []);
      setNotifications(notifRes.data.items || []);
      setBadges(badgeRes.data.items || []);
    } catch (err) {
      console.error("❌ loadData error", err);
      toast.error("Impossible de charger vos données");
    }
  }

  async function loadMonitoring() {
    try {
      const res = await axios.get("/api/monitoring/metrics");
      setMetrics(res.data.data);
    } catch {
      console.warn("Monitoring non disponible");
    }
  }

  async function loadMarketplace() {
    try {
      const res = await axios.get("/api/marketplace/items", { params: { limit: 3 } });
      setMarketplace(res.data.items || res.data.data || []);
    } catch {
      console.warn("Marketplace non disponible");
    }
  }

  async function loadPayments() {
    try {
      const res = await axios.get("/api/payments/recent");
      setPayments(res.data.items || []);
    } catch {
      console.warn("Paiements non disponibles");
    }
  }

  function handleAISubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    navigate(`/ai?prompt=${encodeURIComponent(aiPrompt)}`);
  }

  /* ===============================
     Render
  =============================== */
  return (
    <DashboardLayout>
      {/* HEADER HERO */}
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white p-8 rounded-xl shadow mb-8"
      >
        <h1 className="text-3xl font-bold">🚀 Bienvenue dans votre Cockpit UInova</h1>
        <p className="opacity-80 mt-1">
          Pilotez vos projets no-code nouvelle génération avec temps réel, monitoring, IA et analytics.
        </p>
      </motion.div>

      {/* QUICK ACTIONS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <QuickAction to="/projects/new" icon={<PlusCircle />} label="Nouveau projet" />
        <QuickAction to="/marketplace" icon={<ShoppingBag />} label="Marketplace" />
        <QuickAction to="/monitoring" icon={<Cpu />} label="Monitoring" />
        <QuickAction to="/ai" icon={<Bot />} label="Copilot IA" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 📂 Projets récents */}
        <Card className="col-span-2">
          <CardContent>
            <SectionTitle title="📂 Mes projets récents" />
            {projects.length === 0 ? (
              <p className="text-gray-500">Aucun projet.</p>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-slate-700">
                {projects.map((p) => (
                  <li key={p.id} className="py-2 flex justify-between">
                    <Link
                      to={`/editor/${p.id}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                      {p.name}
                    </Link>
                    <span className="text-sm text-gray-500">{p.status}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* 🔔 Notifications */}
        <Card>
          <CardContent>
            <SectionTitle title="🔔 Notifications" />
            {notifications.length === 0 ? (
              <p className="text-gray-500">Aucune notification.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <span className="font-semibold">{n.title}</span> — {n.message}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* 🏆 Badges */}
        <Card>
          <CardContent>
            <SectionTitle title="🏆 Badges débloqués" />
            {badges.length === 0 ? (
              <p className="text-gray-500">Aucun badge.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {badges.map((b) => (
                  <span
                    key={b.id}
                    className="px-3 py-2 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 rounded-lg text-xs font-semibold"
                  >
                    {b.type}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 📡 Monitoring */}
        {metrics && (
          <Card className="col-span-2">
            <CardContent>
              <SectionTitle title="📡 Monitoring en direct" />
              <div className="grid md:grid-cols-3 gap-4 text-sm mb-6">
                <MetricBox label="Uptime" value={`${metrics.uptime.toFixed(0)} sec`} />
                <MetricBox label="Mémoire" value={metrics.memory.usagePercent} />
                <MetricBox
                  label="CPU"
                  value={`${metrics.cpu.loadAvg.join(", ")} (cores: ${metrics.cpu.cores})`}
                />
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={cpuHistory}>
                  <Line type="monotone" dataKey="cpu" stroke="#6366f1" />
                  <CartesianGrid stroke="#ccc" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* 💳 Paiements */}
        {payments.length > 0 && (
          <Card>
            <CardContent>
              <SectionTitle title="💳 Paiements récents" />
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={payments.map((p) => ({ name: p.provider, montant: p.amount }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="montant" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* ⚡ Live Activity */}
        {liveActivity.length > 0 && (
          <Card className="col-span-3">
            <CardContent>
              <SectionTitle title="⚡ Activité en temps réel" />
              <ul className="text-sm space-y-1 max-h-48 overflow-y-auto font-mono">
                {liveActivity.map((a, idx) => (
                  <li key={idx} className="border-b dark:border-slate-700 pb-1">
                    {a}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* 🤖 Copilot prompt */}
        <Card className="col-span-3">
          <CardContent>
            <SectionTitle title="🤖 Générer avec Copilot IA" />
            <form onSubmit={handleAISubmit} className="flex gap-2">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Décrivez ce que vous voulez générer..."
                className="flex-1 px-3 py-2 rounded border dark:bg-slate-900"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Envoyer
              </button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* ✨ Marketplace */}
      {marketplace.length > 0 && (
        <Card>
          <CardContent>
            <SectionTitle title="✨ Marketplace recommandée" />
            <div className="grid md:grid-cols-3 gap-4">
              {marketplace.map((item) => (
                <Link
                  key={item.id}
                  to={`/marketplace/${item.id}`}
                  className="p-4 rounded-lg border bg-slate-50 dark:bg-slate-900 hover:shadow transition"
                >
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="text-xs text-gray-500 line-clamp-2">
                    {item.description || "—"}
                  </p>
                  <p className="mt-2 text-sm text-blue-600 font-bold">
                    {item.priceCents
                      ? (item.priceCents / 100).toFixed(2) + " €"
                      : "Gratuit"}
                  </p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </DashboardLayout>
  );
}

/* ===============================
   Components utils
=============================== */
function QuickAction({ to, icon, label }: { to: string; icon: JSX.Element; label: string }) {
  return (
    <Link
      to={to}
      className="flex flex-col items-center justify-center p-4 rounded-xl bg-white dark:bg-gray-800 shadow hover:shadow-md transition"
    >
      <div className="text-indigo-600 dark:text-indigo-400 mb-2">{icon}</div>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h2 className="text-lg font-semibold mb-4">{title}</h2>;
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded bg-slate-50 dark:bg-slate-900">
      <strong>{label} :</strong> {value}
    </div>
  );
}

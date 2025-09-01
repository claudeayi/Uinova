// src/pages/Dashboard.tsx
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { getMyProjects } from "@/services/projects";
import { listNotifications } from "@/services/notifications";
import { listBadges } from "@/services/badges";
import axios from "axios";
import io from "socket.io-client";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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
   Dashboard
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

    // ⚡ Temps réel avec Socket.io
    const socket = io("http://localhost:5000", {
      auth: { token: localStorage.getItem("token") },
    });

    socket.on("connect", () => {
      console.log("✅ Connected to realtime server");
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
      setLiveActivity((prev) => [msg, ...prev].slice(0, 5));
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
        getMyProjects(),
        listNotifications({ unreadOnly: true, pageSize: 5 }),
        listBadges({ pageSize: 5 }),
      ]);
      setProjects(projRes.data || []);
      setNotifications(notifRes.items || []);
      setBadges(badgeRes.items || []);
    } catch (err) {
      console.error("❌ Dashboard load error:", err);
      toast.error("Impossible de charger le tableau de bord");
    }
  }

  async function loadMonitoring() {
    try {
      const res = await axios.get("/api/monitoring/metrics");
      setMetrics(res.data.data);
    } catch (err) {
      console.error("❌ Monitoring load error:", err);
    }
  }

  async function loadMarketplace() {
    try {
      const res = await axios.get("/api/marketplace/items", { params: { limit: 3 } });
      setMarketplace(res.data.items || res.data.data || []);
    } catch (err) {
      console.error("❌ Marketplace load error:", err);
    }
  }

  async function loadPayments() {
    try {
      const res = await axios.get("/api/payments/recent");
      setPayments(res.data.items || []);
    } catch (err) {
      console.error("❌ Payments load error:", err);
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
    <div className="space-y-8">
      {/* HEADER HERO */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-8 rounded-xl shadow">
        <h1 className="text-3xl font-bold">🚀 Cockpit UInova</h1>
        <p className="opacity-80 mt-1">
          Pilotez vos projets no-code nouvelle génération, avec monitoring & temps réel.
        </p>
      </div>

      {/* COPILOT IA DIRECT */}
      <section className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-3">🤖 UInova Copilot</h2>
        <form onSubmit={handleAISubmit} className="flex gap-2">
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Décrivez votre idée (site, app, template...)"
            className="flex-1 px-3 py-2 rounded border dark:bg-slate-900 dark:border-slate-700"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Générer
          </button>
        </form>
      </section>

      {/* MONITORING LIVE + CHART */}
      {metrics && (
        <section className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
          <h2 className="text-lg font-bold mb-3">📡 Monitoring en direct</h2>
          <div className="grid md:grid-cols-3 gap-4 text-sm mb-6">
            <div className="p-3 rounded bg-slate-50 dark:bg-slate-900">
              <strong>Uptime :</strong> {metrics.uptime.toFixed(0)} sec
            </div>
            <div className="p-3 rounded bg-slate-50 dark:bg-slate-900">
              <strong>Mémoire :</strong> {metrics.memory.usagePercent}
            </div>
            <div className="p-3 rounded bg-slate-50 dark:bg-slate-900">
              <strong>CPU :</strong> {metrics.cpu.loadAvg.join(", ")} (cores: {metrics.cpu.cores})
            </div>
          </div>

          {/* Chart CPU en temps réel */}
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={cpuHistory}>
              <Line type="monotone" dataKey="cpu" stroke="#6366f1" />
              <CartesianGrid stroke="#ccc" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
            </LineChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* MES PROJETS */}
      <section className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
        <h2 className="text-lg font-bold mb-3">📂 Mes projets récents</h2>
        {projects.length === 0 ? (
          <p className="text-gray-500">Aucun projet pour l’instant.</p>
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
                <span className="text-sm text-gray-500">
                  {p.status} • {new Date(p.updatedAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* NOTIFICATIONS */}
      <section className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
        <h2 className="text-lg font-bold mb-3">🔔 Notifications récentes</h2>
        {notifications.length === 0 ? (
          <p className="text-gray-500">Aucune notification.</p>
        ) : (
          <ul className="space-y-2">
            {notifications.map((n) => (
              <li key={n.id} className="text-sm">
                <span className="font-semibold">{n.title}</span> — {n.message}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* BADGES */}
      <section className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
        <h2 className="text-lg font-bold mb-3">🏆 Mes badges</h2>
        {badges.length === 0 ? (
          <p className="text-gray-500">Aucun badge pour l’instant.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {badges.map((b) => (
              <div
                key={b.id}
                className="px-3 py-2 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-200 rounded-lg text-xs font-semibold"
              >
                {b.type}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* MARKETPLACE RECOMMANDÉE */}
      {marketplace.length > 0 && (
        <section className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
          <h2 className="text-lg font-bold mb-3">✨ Templates recommandés</h2>
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
                  {item.priceCents ? (item.priceCents / 100).toFixed(2) + "€" : "Gratuit"}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* PAIEMENTS RÉCENTS */}
      {payments.length > 0 && (
        <section className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
          <h2 className="text-lg font-bold mb-3">💳 Paiements récents</h2>
          <ul className="divide-y divide-gray-200 dark:divide-slate-700 text-sm">
            {payments.map((p) => (
              <li key={p.id} className="py-2 flex justify-between">
                <span>
                  {p.provider} • {p.amount} {p.currency}
                </span>
                <span className="text-gray-500">
                  {new Date(p.createdAt).toLocaleString("fr-FR")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ACTIVITÉS EN TEMPS RÉEL */}
      {liveActivity.length > 0 && (
        <section className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
          <h2 className="text-lg font-bold mb-3">⚡ Activité en temps réel</h2>
          <ul className="space-y-1 text-sm">
            {liveActivity.map((a, i) => (
              <li key={i} className="text-gray-700 dark:text-gray-300">
                {a}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

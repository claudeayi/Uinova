// src/pages/AIAssistantPage.tsx
import { useState, useEffect, useRef } from "react";
import { askAI, streamAI } from "@/services/ai";
import { toast } from "react-hot-toast";
import DashboardLayout from "@/layouts/DashboardLayout";
import { ArrowDown } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  model?: string;
}

export default function AIAssistantPage() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem("ai-messages");
    return saved ? JSON.parse(saved) : [];
  });
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [showScroll, setShowScroll] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll + persist
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    localStorage.setItem("ai-messages", JSON.stringify(messages));
  }, [messages]);

  // Détection besoin bouton "scroll bas"
  useEffect(() => {
    const div = containerRef.current;
    if (!div) return;
    function handleScroll() {
      setShowScroll(div.scrollHeight - div.scrollTop - div.clientHeight > 200);
    }
    div.addEventListener("scroll", handleScroll);
    return () => div.removeEventListener("scroll", handleScroll);
  }, []);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;

    const newMessages = [...messages, { role: "user", content: prompt }];
    setMessages(newMessages);
    setPrompt("");
    setLoading(true);

    try {
      setStreaming(true);
      let answer = "";
      await streamAI(prompt, newMessages, {
        onStart: (info) => console.log("⚡ Model:", info?.model),
        onToken: (t) => {
          answer += t;
          setMessages([...newMessages, { role: "assistant", content: answer }]);
        },
        onEnd: (info) => {
          setStreaming(false);
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1].model = info?.model;
            return updated;
          });
        },
        onError: (err) => {
          console.error("❌ Erreur stream:", err);
          toast.error("Erreur IA (stream)");
          setStreaming(false);
        },
      });
    } catch (err) {
      console.error("❌ Erreur IA:", err);
      toast.error("Erreur lors de la réponse de l’IA");
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setMessages([]);
    localStorage.removeItem("ai-messages");
    toast.success("Conversation effacée");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as any);
    }
  }

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-100px)] bg-white dark:bg-slate-900 rounded shadow">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b dark:border-slate-700 bg-slate-100 dark:bg-slate-800 sticky top-0 z-10">
          <h1 className="text-lg font-bold text-blue-600 dark:text-blue-400">
            🤖 UInova Copilot
          </h1>
          <button
            onClick={handleClear}
            className="px-3 py-1 text-sm rounded bg-red-500 text-white hover:bg-red-600"
          >
            Effacer
          </button>
        </div>

        {/* Messages */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth"
        >
          {messages.length === 0 && (
            <p className="text-gray-500 text-sm">
              Commencez à discuter avec l’IA pour générer votre app, site ou
              composant 🚀
            </p>
          )}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`p-3 max-w-3xl rounded-lg whitespace-pre-line shadow ${
                m.role === "user"
                  ? "ml-auto bg-blue-600 text-white"
                  : "mr-auto bg-slate-200 dark:bg-slate-700 dark:text-slate-100"
              }`}
            >
              <span className="block text-xs font-semibold mb-1">
                {m.role === "user" ? "👤 Vous" : "🤖 IA"}
              </span>
              {m.content}
              {m.model && (
                <span className="ml-2 text-xs text-gray-400">
                  ({m.model})
                </span>
              )}
            </div>
          ))}
          {(loading || streaming) && (
            <p className="text-gray-500 italic">⏳ L’IA réfléchit...</p>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Scroll Down Button */}
        {showScroll && (
          <button
            onClick={() =>
              bottomRef.current?.scrollIntoView({ behavior: "smooth" })
            }
            className="absolute bottom-24 right-6 p-2 rounded-full bg-blue-600 text-white shadow hover:bg-blue-700"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        )}

        {/* Input */}
        <form
          onSubmit={handleSend}
          className="p-3 border-t dark:border-slate-700 flex space-x-2 bg-slate-50 dark:bg-slate-800"
        >
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            placeholder="Décrivez ce que vous voulez générer... (Shift+Enter = nouvelle ligne)"
            className="flex-1 px-3 py-2 rounded border dark:bg-slate-900 dark:border-slate-700 focus:outline-none resize-none"
          />
          <button
            type="submit"
            disabled={loading || streaming}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading || streaming ? "..." : "Envoyer"}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}

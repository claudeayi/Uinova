import { useState, useEffect, useRef } from "react";
import { askAI } from "@/services/ai";
import { toast } from "react-hot-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AIAssistantPage() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem("ai-messages");
    return saved ? JSON.parse(saved) : [];
  });
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll auto bas + persist
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    localStorage.setItem("ai-messages", JSON.stringify(messages));
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;

    const newMessages = [...messages, { role: "user", content: prompt }];
    setMessages(newMessages);
    setPrompt("");
    setLoading(true);

    try {
      const answer = await askAI(prompt, newMessages);
      setMessages([...newMessages, { role: "assistant", content: answer }]);
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

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] bg-white dark:bg-slate-900 rounded shadow">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
        <h1 className="text-lg font-bold text-blue-600 dark:text-blue-400">
          🤖 UInova Copilot (Deepseek)
        </h1>
        <button
          onClick={handleClear}
          className="px-3 py-1 text-sm rounded bg-red-500 text-white hover:bg-red-600"
        >
          Effacer
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-gray-500 text-sm">
            Commencez à discuter avec l’IA pour générer votre app, site ou composant 🚀
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`p-3 max-w-3xl rounded-lg ${
              m.role === "user"
                ? "ml-auto bg-blue-600 text-white"
                : "mr-auto bg-slate-200 dark:bg-slate-700 dark:text-slate-100"
            }`}
          >
            <strong>{m.role === "user" ? "Vous" : "IA"}:</strong> {m.content}
          </div>
        ))}
        {loading && <p className="text-gray-500 italic">⏳ L’IA réfléchit...</p>}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="p-3 border-t dark:border-slate-700 flex space-x-2 bg-slate-50 dark:bg-slate-800"
      >
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Décrivez ce que vous voulez générer..."
          className="flex-1 px-3 py-2 rounded border dark:bg-slate-900 dark:border-slate-700 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "..." : "Envoyer"}
        </button>
      </form>
    </div>
  );
}

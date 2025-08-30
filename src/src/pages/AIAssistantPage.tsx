import { useState } from "react";
import { askAI } from "@/services/ai";

export default function AIAssistantPage() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [loading, setLoading] = useState(false);

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
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">🤖 Assistant IA (Deepseek)</h1>
      <div className="border rounded p-4 h-96 overflow-y-auto bg-white dark:bg-slate-800">
        {messages.map((m, i) => (
          <div key={i} className={`mb-2 ${m.role === "user" ? "text-blue-600" : "text-green-600"}`}>
            <strong>{m.role === "user" ? "Vous" : "IA"}:</strong> {m.content}
          </div>
        ))}
        {loading && <p className="text-gray-500 italic">L’IA réfléchit...</p>}
      </div>
      <form onSubmit={handleSend} className="mt-4 flex space-x-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Décrivez ce que vous voulez générer..."
          className="flex-1 border rounded px-3 py-2"
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          Envoyer
        </button>
      </form>
    </div>
  );
}

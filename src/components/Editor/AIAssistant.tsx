import { useState } from 'react';
import axios from 'axios';

export default function AIAssistant({ onGenerate }: { onGenerate: (json: any) => void }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/api/ai/generate', { prompt });
      onGenerate(response.data);
    } catch (error) {
      console.error('Error generating UI:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border-b bg-white">
      <textarea
        className="w-full border rounded p-2 mb-2"
        placeholder="Décris l'interface que tu veux créer..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        {loading ? 'Génération...' : 'Générer Interface'}
      </button>
    </div>
  );
}

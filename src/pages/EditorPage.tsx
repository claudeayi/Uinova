import { useAppStore } from "../store/useAppStore";
import { useState } from "react";
import EditorWrapper from "../components/Editor/EditorWrapper";

export default function EditorPage() {
  const { pages, currentPageId, addPage, setCurrentPageId } = useAppStore();
  const [newPageName, setNewPageName] = useState("");

  return (
    <div>
      <div className="flex gap-4 mb-4">
        {pages.map(p => (
          <button key={p.id}
            className={`px-3 py-1 rounded ${currentPageId === p.id ? "bg-blue-600 text-white" : "bg-gray-200"}`}
            onClick={() => setCurrentPageId(p.id)}
          >
            {p.name}
          </button>
        ))}
        <form onSubmit={e => { e.preventDefault(); addPage(newPageName); setNewPageName(""); }}>
          <input value={newPageName} onChange={e => setNewPageName(e.target.value)} placeholder="Nom page" className="border px-2 py-1 rounded mr-2" />
          <button type="submit" className="bg-green-600 text-white px-2 py-1 rounded">+</button>
        </form>
      </div>
      <EditorWrapper />
    </div>
  );
}

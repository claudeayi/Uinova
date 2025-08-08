import { useParams } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import { generateHTML, generateFlutter } from "../utils/exporters";

export default function ExportPage() {
  const { projectId, pageId } = useParams();
  const { projects } = useAppStore();
  const project = projects.find(p => p.id === projectId);
  const page = project?.pages.find(p => p.id === pageId);

  if (!page) return <div className="p-8">Page introuvable</div>;

  const htmlCode = generateHTML(page.elements);
  const flutterCode = generateFlutter(page.elements);

  return (
    <div className="p-8 space-y-6">
      <h2 className="text-xl font-bold">Exportation de {page.name}</h2>

      <div>
        <h3 className="font-semibold mb-2">🔤 HTML</h3>
        <textarea className="w-full border p-2 text-xs" rows={10} value={htmlCode} readOnly />
      </div>

      <div>
        <h3 className="font-semibold mb-2">🧠 Flutter</h3>
        <textarea className="w-full border p-2 text-xs" rows={10} value={flutterCode} readOnly />
      </div>
    </div>
  );
}

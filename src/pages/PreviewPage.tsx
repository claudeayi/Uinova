import { useParams } from "react-router-dom";
import { useAppStore } from "../store/useAppStore";
import LivePreview from "../components/Editor/LivePreview";

export default function PreviewPage() {
  const { projectId, pageId } = useParams();
  const { projects } = useAppStore();
  const proj = projects.find(p => p.id === projectId) || projects[0];
  const page = proj.pages.find(p => p.id === pageId) || proj.pages[0];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <h1 className="text-xl font-semibold mb-4">Preview — {proj.name} / {page.name}</h1>
      <LivePreview elements={page.elements} />
    </div>
  );
}

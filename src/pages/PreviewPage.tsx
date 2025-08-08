import { useParams } from "react-router-dom";
import { useEffect } from "react";
import { useAppStore } from "../store/useAppStore";
import LivePreview from "../components/Editor/LivePreview";

export default function PreviewPage() {
  const { projectId, pageId } = useParams();
  const { projects, setCurrentProjectId, setCurrentPageId, listenElements } = useAppStore();

  useEffect(() => {
    if (projectId && pageId) {
      setCurrentProjectId(projectId);
      setCurrentPageId(pageId);
      listenElements(); // collaboration live
    }
  }, [projectId, pageId]);

  const project = projects.find(p => p.id === projectId);
  const page = project?.pages.find(p => p.id === pageId);

  if (!page) return <div className="p-8 text-center text-gray-500">Page introuvable</div>;

  return (
    <div className="min-h-screen p-8 bg-white">
      <LivePreview elements={page.elements} />
    </div>
  );
}

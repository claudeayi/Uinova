import { useState } from "react";
import { Button } from "@/components/ui/button";
import ShareModal from "./ShareModal";

export default function LiveEditor({ projectId }: { projectId: string }) {
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <div className="relative">
      {/* ... ton éditeur drag&drop existant ... */}

      <div className="absolute top-2 right-2 flex gap-2">
        <Button variant="outline" onClick={() => setShareOpen(true)}>
          🔗 Partager
        </Button>
      </div>

      {/* Modal partage */}
      <ShareModal
        projectId={projectId}
        open={shareOpen}
        onClose={() => setShareOpen(false)}
      />
    </div>
  );
}

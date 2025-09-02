import { useEffect, useRef, useState } from "react";
import { connectCollab, disconnectCollab } from "@/services/collab";
import { useAuth } from "@/hooks/useAuth";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { Socket } from "socket.io-client";
import Editor, { OnChange, OnMount } from "@monaco-editor/react";
import * as monaco from "monaco-editor";

interface CollabUser {
  id: string;
  email: string;
  cursorPos?: number;
}

interface CollabFile {
  id: string;
  name: string;
  language: string;
  content: string;
}

const COLORS = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"];

export default function CollabPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const { user, token } = useAuth();

  const [socket, setSocket] = useState<Socket | null>(null);
  const [users, setUsers] = useState<CollabUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Multi-fichiers
  const [files, setFiles] = useState<CollabFile[]>([
    { id: "1", name: "index.js", language: "javascript", content: "// JS file" },
    { id: "2", name: "style.css", language: "css", content: "/* CSS file */" },
    { id: "3", name: "index.html", language: "html", content: "<!-- HTML file -->" },
  ]);
  const [activeFileId, setActiveFileId] = useState("1");

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const isRemoteUpdate = useRef(false);

  const activeFile = files.find((f) => f.id === activeFileId)!;

  /** Connexion socket */
  useEffect(() => {
    if (!projectId || !token) return;

    const s = connectCollab(projectId, token);
    setSocket(s);

    s.on("connect", () => {
      setIsConnected(true);
      toast.success("✅ Connecté à la session collaborative");
    });

    s.on("disconnect", () => {
      setIsConnected(false);
      toast.error("❌ Déconnecté de la session");
    });

    s.on("users", (data: CollabUser[]) => {
      setUsers(data);
    });

    s.on("updateFile", ({ fileId, content }: { fileId: string; content: string }) => {
      isRemoteUpdate.current = true;
      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, content } : f))
      );
    });

    s.on("cursorUpdate", ({ userId, fileId, position }: { userId: string; fileId: string; position: number }) => {
      if (!editorRef.current || fileId !== activeFileId) return;
      const model = editorRef.current.getModel();
      if (!model) return;

      const pos = model.getPositionAt(position);
      if (!pos) return;

      const color =
        COLORS[Math.abs(userId.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) %
        COLORS.length];

      editorRef.current.deltaDecorations(
        [`cursor-${userId}`],
        [
          {
            range: new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column),
            options: {
              className: "remote-cursor",
              after: {
                content: `▏${users.find((u) => u.id === userId)?.email || "User"}`,
                inlineClassName: "remote-cursor-label",
              },
              inlineClassName: "remote-cursor-marker",
            },
          },
        ]
      );

      // CSS dynamique par utilisateur
      const styleId = `cursor-style-${userId}`;
      if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.innerHTML = `
          .monaco-editor .remote-cursor-marker {
            border-left: 2px solid ${color};
          }
          .monaco-editor .remote-cursor-label {
            color: ${color};
            font-size: 0.75rem;
            margin-left: 2px;
          }
        `;
        document.head.appendChild(style);
      }
    });

    return () => {
      s.off("connect");
      s.off("disconnect");
      s.off("users");
      s.off("updateFile");
      s.off("cursorUpdate");
      disconnectCollab();
    };
  }, [projectId, token, activeFileId, users]);

  /** Changement de code */
  const handleCodeChange: OnChange = (value) => {
    if (!value) return;
    setFiles((prev) =>
      prev.map((f) => (f.id === activeFileId ? { ...f, content: value } : f))
    );
    if (socket && !isRemoteUpdate.current) {
      socket.emit("editFile", { fileId: activeFileId, content: value, userId: user?.id });
    }
    isRemoteUpdate.current = false;
  };

  /** Initialisation éditeur Monaco */
  const handleEditorMount: OnMount = (editor) => {
    editorRef.current = editor;

    editor.onDidChangeCursorPosition((e) => {
      if (!socket || !user?.id) return;
      const model = editor.getModel();
      if (!model) return;
      const offset = model.getOffsetAt(e.position);
      socket.emit("cursor", { userId: user.id, fileId: activeFileId, position: offset });
    });
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">🖥️ IDE collaboratif</h1>

      <Card className="shadow-md rounded-2xl hover:shadow-lg transition">
        <CardContent className="p-6 space-y-6">
          {/* Status connexion */}
          <div className="flex justify-between items-center">
            <p className="text-gray-600">
              Projet ID : <span className="font-mono">{projectId}</span>
            </p>
            <span
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm transition ${
                isConnected ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isConnected ? "bg-green-500" : "bg-red-500"
                }`}
              />
              {isConnected ? "Connecté" : "Hors ligne"}
            </span>
          </div>

          {/* Onglets fichiers */}
          <div className="flex gap-2 border-b pb-2">
            {files.map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFileId(f.id)}
                className={`px-3 py-1 rounded-t-lg text-sm font-medium ${
                  f.id === activeFileId
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {f.name}
              </button>
            ))}
          </div>

          {/* Zone collaborative */}
          <div className="h-[500px] border rounded-lg overflow-hidden">
            <Editor
              height="100%"
              language={activeFile.language}
              theme="vs-dark"
              value={activeFile.content}
              onChange={handleCodeChange}
              onMount={handleEditorMount}
              options={{
                minimap: { enabled: true },
                fontSize: 14,
                scrollBeyondLastLine: false,
                wordWrap: "on",
                automaticLayout: true,
              }}
            />
          </div>

          {/* Utilisateurs connectés */}
          <div>
            <h3 className="font-semibold mb-2">Participants connectés</h3>
            {users.length === 0 ? (
              <p className="text-gray-500">Aucun utilisateur connecté.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {users.map((u) => (
                  <span
                    key={u.id}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                      u.id === user?.id
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-100 text-blue-700"
                    }`}
                  >
                    {u.email} {u.id === user?.id && "(vous)"}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Bouton sortie */}
          <div className="text-right">
            <Button
              variant="destructive"
              onClick={() => {
                disconnectCollab();
                setIsConnected(false);
                toast("👋 Vous avez quitté la session");
              }}
            >
              Quitter la session
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

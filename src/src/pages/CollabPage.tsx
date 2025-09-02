import { useEffect, useState } from "react";
import { connectCollab, disconnectCollab } from "@/services/collab";
import { useAuth } from "@/hooks/useAuth";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";

interface CollabUser {
  id: string;
  email: string;
}

export default function CollabPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const { user, token } = useAuth();

  const [socket, setSocket] = useState<any>(null);
  const [users, setUsers] = useState<CollabUser[]>([]);
  const [content, setContent] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!projectId || !token) return;

    const s = connectCollab(projectId, token);
    setSocket(s);

    s.on("connect", () => {
      setIsConnected(true);
      toast.success("Connecté à la session collaborative");
    });

    s.on("disconnect", () => {
      setIsConnected(false);
      toast.error("Déconnecté de la session");
    });

    s.on("users", (data: CollabUser[]) => {
      setUsers(data);
    });

    s.on("updateContent", (newContent: string) => {
      setContent(newContent);
    });

    return () => {
      disconnectCollab();
    };
  }, [projectId, token]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setContent(value);
    if (socket) {
      socket.emit("edit", { content: value, userId: user?.id });
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">🤝 Collaboration en temps réel</h1>

      <Card className="shadow-md rounded-2xl">
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <p className="text-gray-600">
              Projet ID : <span className="font-mono">{projectId}</span>
            </p>
            <span
              className={`px-3 py-1 rounded-full text-sm ${
                isConnected ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              }`}
            >
              {isConnected ? "Connecté" : "Hors ligne"}
            </span>
          </div>

          {/* Zone collaborative */}
          <textarea
            value={content}
            onChange={handleChange}
            placeholder="Commencez à écrire ici..."
            className="w-full h-64 border rounded-lg p-3 font-mono text-sm"
          />

          {/* Utilisateurs connectés */}
          <div className="mt-6">
            <h3 className="font-semibold mb-2">Participants connectés</h3>
            {users.length === 0 ? (
              <p className="text-gray-500">Aucun utilisateur connecté.</p>
            ) : (
              <ul className="list-disc list-inside text-gray-700">
                {users.map((u) => (
                  <li key={u.id}>
                    {u.email} {u.id === user?.id && "(vous)"}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Bouton de sortie */}
          <div className="mt-6 text-right">
            <Button
              variant="destructive"
              onClick={() => {
                disconnectCollab();
                toast("Vous avez quitté la session", { icon: "👋" });
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

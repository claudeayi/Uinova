import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";

interface Workspace {
  id: string;
  name: string;
  plan: "FREE" | "PRO" | "ENTERPRISE";
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  current: Workspace | null;
  setCurrent: (ws: Workspace) => void;
  refresh: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [current, setCurrent] = useState<Workspace | null>(null);

  const refresh = async () => {
    try {
      const res = await axios.get("/api/workspaces/me"); // retourne les workspaces de l’utilisateur
      setWorkspaces(res.data);
      if (!current && res.data.length > 0) setCurrent(res.data[0]);
    } catch (err) {
      console.error("❌ Error loading workspaces", err);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <WorkspaceContext.Provider value={{ workspaces, current, setCurrent, refresh }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export const useWorkspace = () => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return ctx;
};

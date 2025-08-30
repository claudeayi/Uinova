import { createContext, useContext, useState, ReactNode } from "react";

type ProjectContextType = {
  projectId: string | null;
  setProjectId: (id: string | null) => void;
};

const ProjectContext = createContext<ProjectContextType>({
  projectId: null,
  setProjectId: () => {},
});

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [projectId, setProjectId] = useState<string | null>(null);

  return (
    <ProjectContext.Provider value={{ projectId, setProjectId }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  return useContext(ProjectContext);
}

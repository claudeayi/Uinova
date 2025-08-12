export type ProjectCardDTO = {
  id: string;
  title: string;        // = name
  subtitle?: string;    // = tagline
  status: "EN_COURS" | "TERMINE" | "PLANIFIE";
  icon?: string;        // emoji ou URL
  updatedAt: string;
};

export function toProjectCardDTO(p: {
  id: string; name: string; tagline: string | null; icon: string | null;
  status: "IN_PROGRESS" | "DONE" | "PLANNED"; updatedAt: Date
}): ProjectCardDTO {
  const map: Record<typeof p.status, ProjectCardDTO["status"]> = {
    IN_PROGRESS: "EN_COURS",
    DONE: "TERMINE",
    PLANNED: "PLANIFIE",
  };
  return {
    id: p.id,
    title: p.name,
    subtitle: p.tagline || undefined,
    status: map[p.status],
    icon: p.icon || undefined,
    updatedAt: p.updatedAt.toISOString(),
  };
}

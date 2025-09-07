// src/components/editor/SectionLibrary.tsx
import React from "react";
import { v4 as uuid } from "uuid";
import type { ElementData } from "../../store/useAppStore";
import {
  LayoutDashboard,
  CreditCard,
  ListChecks,
  FolderPlus,
  ChevronDown,
  Grid,
  Rows,
  Navigation,
  SquareSplitVertical,
  FileText,
  Send,
  Footprints,
} from "lucide-react";
import toast from "react-hot-toast";

export default function SectionLibrary({
  onInsert,
}: {
  onInsert: (el: ElementData) => void;
}) {
  const make = (
    type: string,
    props: any = {},
    children: ElementData[] = []
  ): ElementData => ({
    id: uuid(),
    type,
    props,
    children,
  });

  const presets: {
    title: string;
    icon: React.ReactNode;
    build: () => ElementData;
  }[] = [
    {
      title: "Hero",
      icon: <LayoutDashboard className="w-4 h-4" />,
      build: () =>
        make("hero", {
          title: "Construisez plus vite avec UInova",
          subtitle: "Éditeur visuel, exports multi-formats, collaboration.",
          cta: "Commencer",
        }),
    },
    {
      title: "Pricing (2 colonnes)",
      icon: <CreditCard className="w-4 h-4" />,
      build: () =>
        make("pricing", {
          plans: [
            { name: "Free", price: "0€", features: ["1 projet", "Export HTML"] },
            {
              name: "Pro",
              price: "19€/mo",
              features: ["Projets illimités", "Export ZIP Site"],
            },
          ],
        }),
    },
    {
      title: "Features (3)",
      icon: <ListChecks className="w-4 h-4" />,
      build: () =>
        make("features", {
          items: [
            { title: "Rapide", subtitle: "Build en minutes" },
            { title: "Collaboratif", subtitle: "Édition live" },
            { title: "Exportable", subtitle: "HTML/React/Vue/Flutter" },
          ],
        }),
    },
    {
      title: "Tabs",
      icon: <FolderPlus className="w-4 h-4" />,
      build: () =>
        make("tabs", {
          active: 0,
          tabs: [
            { label: "Design", content: "Outils d'édition" },
            { label: "Data", content: "CMS & Bindings" },
            { label: "Export", content: "HTML/React/Vue/Flutter/ZIP" },
          ],
        }),
    },
    {
      title: "Accordion",
      icon: <ChevronDown className="w-4 h-4" />,
      build: () =>
        make("accordion", {
          items: [
            {
              title: "Qu’est-ce que UInova ?",
              content: "Une plateforme no-code hautes performances.",
            },
            {
              title: "Exports ?",
              content: "HTML, React, Vue, Flutter, ZIP, Site complet.",
            },
          ],
        }),
    },
    {
      title: "Form (basique)",
      icon: <FileText className="w-4 h-4" />,
      build: () =>
        make("form", { submitLabel: "Envoyer" }, [
          make("input", { label: "Votre email" }),
          make("textarea", { label: "Message" }),
          make("button", { label: "Envoyer" }),
        ]),
    },
    {
      title: "Grid 3 colonnes",
      icon: <Grid className="w-4 h-4" />,
      build: () =>
        make("grid", { cols: 3, gap: 16 }, [
          make("card", { label: "Col 1" }),
          make("card", { label: "Col 2" }),
          make("card", { label: "Col 3" }),
        ]),
    },
    {
      title: "Stack horizontal",
      icon: <Rows className="w-4 h-4" />,
      build: () =>
        make("stack", { direction: "row", gap: 12 }, [
          make("button", { label: "Action" }),
          make("input", { label: "Votre nom" }),
        ]),
    },
    {
      title: "Navbar",
      icon: <Navigation className="w-4 h-4" />,
      build: () =>
        make("navbar", {
          brand: "UInova",
          items: ["Home", "Features", "Pricing", "Contact"],
        }),
    },
    {
      title: "Footer",
      icon: <Footprints className="w-4 h-4" />,
      build: () =>
        make("footer", {
          text: "© " + new Date().getFullYear() + " UInova",
        }),
    },
  ];

  function handleInsert(el: ElementData, title: string) {
    onInsert(el);
    toast.success(`✅ Section "${title}" ajoutée`);
  }

  return (
    <aside className="w-72 h-full p-3 border-r dark:border-slate-700 bg-white dark:bg-slate-900 flex flex-col">
      <div className="text-sm font-semibold mb-2 sticky top-0 bg-white dark:bg-slate-900 py-2 border-b dark:border-slate-700">
        📚 Bibliothèque
      </div>
      <div className="grid gap-2 overflow-y-auto pr-1">
        {presets.map((p, i) => (
          <button
            key={i}
            className="flex items-center gap-2 text-left px-3 py-2 rounded border text-sm font-medium transition bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700"
            onClick={() => handleInsert(p.build(), p.title)}
          >
            {p.icon}
            <span>{p.title}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}

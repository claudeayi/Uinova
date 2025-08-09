// src/components/editor/SectionLibrary.tsx
import React from "react";
import { v4 as uuid } from "uuid";
import type { ElementData } from "../../store/useAppStore";

export default function SectionLibrary({ onInsert }: { onInsert: (el: ElementData) => void }) {
  const make = (type: string, props: any = {}, children: ElementData[] = []): ElementData => ({
    id: uuid(),
    type,
    props,
    children,
  });

  const presets: { title: string; build: () => ElementData }[] = [
    {
      title: "Hero",
      build: () =>
        make("hero", {
          title: "Construisez plus vite avec UInova",
          subtitle: "Éditeur visuel, exports multi-formats, collaboration.",
          cta: "Commencer",
        }),
    },
    {
      title: "Pricing (2 colonnes)",
      build: () =>
        make("pricing", {
          plans: [
            { name: "Free", price: "0€", features: ["1 projet", "Export HTML"] },
            { name: "Pro", price: "19€/mo", features: ["Projets illimités", "Export ZIP Site"] },
          ],
        }),
    },
    {
      title: "Features (3)",
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
      build: () =>
        make("accordion", {
          items: [
            { title: "Qu’est-ce que UInova ?", content: "Une plateforme no-code hautes performances." },
            { title: "Exports ?", content: "HTML, React, Vue, Flutter, ZIP, Site complet." },
          ],
        }),
    },
    {
      title: "Form (basique)",
      build: () =>
        make("form", { submitLabel: "Envoyer" }, [
          make("input", { label: "Votre email" }),
          make("textarea", { label: "Message" }),
        ]),
    },
    {
      title: "Grid 3 colonnes",
      build: () =>
        make("grid", { cols: 3, gap: 16 }, [
          make("card", { label: "Col 1" }),
          make("card", { label: "Col 2" }),
          make("card", { label: "Col 3" }),
        ]),
    },
    {
      title: "Stack horizontal",
      build: () =>
        make("stack", { direction: "row", gap: 12 }, [
          make("button", { label: "Action" }),
          make("input", { label: "Votre nom" }),
        ]),
    },
    {
      title: "Navbar",
      build: () => make("navbar", { brand: "UInova", items: ["Home", "Features", "Pricing", "Contact"] }),
    },
    {
      title: "Footer",
      build: () => make("footer", { text: "© " + new Date().getFullYear() + " UInova" }),
    },
  ];

  return (
    <aside className="w-72 p-3 border-r bg-white dark:bg-gray-900">
      <div className="text-sm font-semibold mb-2">Bibliothèque</div>
      <div className="grid gap-2">
        {presets.map((p, i) => (
          <button
            key={i}
            className="text-left px-3 py-2 rounded border hover:bg-gray-50 dark:hover:bg-gray-800"
            onClick={() => onInsert(p.build())}
          >
            {p.title}
          </button>
        ))}
      </div>
    </aside>
  );
}

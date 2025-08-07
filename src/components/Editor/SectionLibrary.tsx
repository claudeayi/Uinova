import { v4 as uuid } from "uuid";
import { ElementData } from "../../store/useAppStore";

const sections: { name: string; build: () => ElementData }[] = [
  {
    name: "Hero simple",
    build: () => ({
      id: uuid(),
      type: "group",
      props: { label: "Hero", p: 24, bg: "#F8FAFC" },
      children: [
        { id: uuid(), type: "card", props: { label: "Bienvenue sur UInova", fontSize: 28 } },
        { id: uuid(), type: "card", props: { label: "Créez sans coder", fontSize: 18 } },
        { id: uuid(), type: "button", props: { label: "Commencer" } },
      ],
    }),
  },
  {
    name: "Features (CMS)",
    build: () => ({
      id: uuid(),
      type: "group",
      props: { label: "Features", p: 16, bind: "features" }, // <- CMS binding
      children: [
        { id: uuid(), type: "card", props: { label: "{{title}}" } },
        { id: uuid(), type: "card", props: { label: "{{subtitle}}" } },
      ],
    }),
  },
  {
    name: "Pricing",
    build: () => ({
      id: uuid(),
      type: "group",
      props: { label: "Pricing", p: 16, bg: "#EEF2FF" },
      children: [
        { id: uuid(), type: "card", props: { label: "Freemium" } },
        { id: uuid(), type: "card", props: { label: "Premium" } },
      ],
    }),
  },
];

export default function SectionLibrary({
  onInsert,
}: {
  onInsert: (el: ElementData) => void;
}) {
  return (
    <aside className="w-64 p-3 border-r bg-gray-50 dark:bg-gray-900">
      <h3 className="font-semibold mb-2">Sections</h3>
      <div className="space-y-2">
        {sections.map((s) => (
          <button
            key={s.name}
            className="w-full text-left px-3 py-2 bg-white dark:bg-gray-800 rounded shadow hover:shadow-md"
            onClick={() => onInsert(s.build())}
          >
            {s.name}
          </button>
        ))}
      </div>
    </aside>
  );
}

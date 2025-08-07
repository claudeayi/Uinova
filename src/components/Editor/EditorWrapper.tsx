import { useState } from "react";
import { DndContext, useDraggable, useDroppable } from "@dnd-kit/core";
import { v4 as uuid } from "uuid";
import FadeInCard from "../Common/FadeInCard";
import toast from "react-hot-toast";

const palette = [
  { type: "button", label: "Button" },
  { type: "input", label: "Input" },
  { type: "card", label: "Card" },
];

type ElementData = { type: string; props: Record<string, any>; id: string };

function DraggableItem({ id, children }: any) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className="cursor-grab select-none">
      {children}
    </div>
  );
}

function DroppableCanvas({ onDrop, children }: any) {
  const { setNodeRef } = useDroppable({ id: "canvas" });
  return (
    <div ref={setNodeRef} className="min-h-[300px] bg-white dark:bg-gray-800 border rounded p-4 flex flex-col">
      {children}
    </div>
  );
}

export default function EditorWrapper() {
  const [elements, setElements] = useState<ElementData[]>([]);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  return (
    <DndContext
      onDragEnd={e => {
        if (e.over && e.over.id === "canvas") {
          const comp = palette.find(p => p.type === e.active.id);
          if (comp) {
            setElements([...elements, { type: comp.type, props: { label: comp.label }, id: uuid() }]);
            toast.success("Composant ajouté !");
          }
        }
      }}
    >
      <div className="flex">
        <div className="w-64 p-4 border-r bg-gray-50 dark:bg-gray-900">
          <h3 className="text-lg font-bold mb-2">Composants</h3>
          {palette.map(c =>
            <DraggableItem key={c.type} id={c.type}>
              <FadeInCard>{c.label}</FadeInCard>
            </DraggableItem>
          )}
        </div>
        <div className="flex-1 p-6 bg-gray-100 dark:bg-gray-900">
          <DroppableCanvas>
            {elements.map((el, idx) => (
              <div key={el.id} className="mb-2 flex items-center gap-2">
                <FadeInCard>
                  {el.type === "button" && (
                    <button
                      className="bg-blue-600 text-white px-3 py-1 rounded"
                      onClick={() => setEditIndex(idx)}
                    >
                      {el.props.label}
                    </button>
                  )}
                  {el.type === "input" && (
                    <input
                      className="border px-2 py-1 rounded"
                      placeholder={el.props.label}
                      onClick={() => setEditIndex(idx)}
                      readOnly
                    />
                  )}
                  {el.type === "card" && (
                    <div
                      className="p-2 bg-gray-100 dark:bg-gray-700 rounded"
                      onClick={() => setEditIndex(idx)}
                    >
                      {el.props.label}
                    </div>
                  )}
                </FadeInCard>
                <button onClick={() => {
                  setElements(elements.filter((_, i) => i !== idx));
                  toast.success("Composant supprimé !");
                }} className="text-red-500">✕</button>
              </div>
            ))}
          </DroppableCanvas>
        </div>
      </div>

      {/* Modale d'édition */}
      {editIndex !== null && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white dark:bg-gray-900 p-8 rounded shadow">
            <input
              className="border p-2 mb-4 w-full rounded"
              value={elements[editIndex].props.label}
              onChange={e => {
                const newArr = [...elements];
                newArr[editIndex].props.label = e.target.value;
                setElements(newArr);
              }}
            />
            <button className="bg-blue-600 text-white px-4 py-2 rounded mr-2"
              onClick={() => { setEditIndex(null); toast.success("Composant modifié !"); }}>
              Valider
            </button>
            <button onClick={() => setEditIndex(null)} className="ml-2">Annuler</button>
          </div>
        </div>
      )}
    </DndContext>
  );
}

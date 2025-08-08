import { Undo2, Redo2, Copy, Trash2, Eye, Download } from "lucide-react";

type Props = {
  canUndo?: boolean;
  canRedo?: boolean;
  hasSelection?: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onPreview: () => void;
  onExportHTML: () => void;
};

export default function ToolbarPro({
  canUndo, canRedo, hasSelection,
  onUndo, onRedo, onDuplicate, onDelete,
  onPreview, onExportHTML
}: Props) {
  const Btn = (p: any) => (
    <button
      {...p}
      className={`px-3 py-1 rounded border border-gray-300 dark:border-gray-700
                 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700
                 disabled:opacity-50 disabled:cursor-not-allowed`}
    />
  );

  return (
    <div className="flex items-center gap-2 p-2 mb-3 rounded
                    bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
      <Btn onClick={onUndo} disabled={!canUndo} title="Annuler (Ctrl+Z)"><Undo2 className="inline mr-1" size={16}/>Undo</Btn>
      <Btn onClick={onRedo} disabled={!canRedo} title="Rétablir (Ctrl+Y)"><Redo2 className="inline mr-1" size={16}/>Redo</Btn>

      <span className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1" />

      <Btn onClick={onDuplicate} disabled={!hasSelection} title="Dupliquer (Ctrl+D)">
        <Copy className="inline mr-1" size={16}/>Dupliquer
      </Btn>
      <Btn onClick={onDelete} disabled={!hasSelection} title="Supprimer (Del)">
        <Trash2 className="inline mr-1" size={16}/>Supprimer
      </Btn>

      <span className="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1" />

      <Btn onClick={onPreview} title="Aperçu live">
        <Eye className="inline mr-1" size={16}/>Aperçu
      </Btn>
      <Btn onClick={onExportHTML} title="Exporter HTML">
        <Download className="inline mr-1" size={16}/>Export HTML
      </Btn>
    </div>
  );
}

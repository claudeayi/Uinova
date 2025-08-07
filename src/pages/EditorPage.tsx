import EditorWrapper from "../components/Editor/EditorWrapper";
import AIAssistant from "../components/Editor/AIAssistant";
import { useAppStore } from "../store/useAppStore";

export default function EditorPage() {
  const role = useAppStore((s) => s.role);

  return (
    <div>
      {role === 'premium' && (
        <AIAssistant onGenerate={json => {/* intégration sur le canvas */}} />
      )}
      <EditorWrapper />
    </div>
  );
}

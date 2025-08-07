import Canvas from './Canvas';
import Sidebar from './Sidebar';

export default function EditorWrapper() {
  return (
    <div className="flex h-[calc(100vh-64px)]">
      <Sidebar />
      <div className="flex-1 p-6 bg-gray-100">
        <Canvas />
      </div>
    </div>
  );
}

export default function Sidebar() {
  return (
    <div className="w-64 p-4 border-r bg-gray-50">
      <h3 className="text-lg font-bold mb-2">Components</h3>
      <ul>
        <li className="p-2 bg-white shadow rounded mb-2 cursor-pointer">Button</li>
        <li className="p-2 bg-white shadow rounded mb-2 cursor-pointer">Input</li>
        <li className="p-2 bg-white shadow rounded mb-2 cursor-pointer">Card</li>
      </ul>
    </div>
  );
}

type ButtonProps = {
  label: string;
  onClick: () => void;
};

export default function PrimaryButton({ label, onClick }: ButtonProps) {
  return (
    <button onClick={onClick} className="bg-blue-600 text-white px-4 py-2 rounded">
      {label}
    </button>
  );
}

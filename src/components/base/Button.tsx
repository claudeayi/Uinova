export default function Button({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className="btn-base" {...props}>
      {children}
    </button>
  );
}

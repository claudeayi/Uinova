import { useState, useEffect } from "react";

export default function Navbar() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    document.body.className = dark ? "dark" : "";
  }, [dark]);
  return (
    <nav>
      {/* ...autres éléments */}
      <button onClick={() => setDark(!dark)}>
        {dark ? "☀️ Light" : "🌙 Dark"}
      </button>
    </nav>
  );
}

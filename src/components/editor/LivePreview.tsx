import { useState } from "react";
export default function LivePreview({ html }: { html: string }) {
  const [device, setDevice] = useState("desktop");
  return (
    <div>
      <div>
        <button onClick={() => setDevice("mobile")}>📱</button>
        <button onClick={() => setDevice("tablet")}>💻</button>
        <button onClick={() => setDevice("desktop")}>🖥️</button>
      </div>
      <iframe
        title="preview"
        style={{
          width: device === "mobile" ? 375 : device === "tablet" ? 800 : "100%",
          height: 600,
          border: "1px solid #eee",
          background: "#fff"
        }}
        srcDoc={html}
      />
    </div>
  );
}

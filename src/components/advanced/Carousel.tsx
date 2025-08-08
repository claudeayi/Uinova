import { useState } from "react";
export default function Carousel({ images }: { images: string[] }) {
  const [idx, setIdx] = useState(0);
  return (
    <div className="carousel">
      <img src={images[idx]} alt={`carousel-${idx}`} />
      <button onClick={() => setIdx((idx - 1 + images.length) % images.length)}>◀</button>
      <button onClick={() => setIdx((idx + 1) % images.length)}>▶</button>
    </div>
  );
}

// src/components/ui/Carousel.tsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CarouselProps {
  images: string[];
  autoPlay?: boolean;
  interval?: number;
  className?: string;
}

export default function Carousel({
  images,
  autoPlay = false,
  interval = 4000,
  className,
}: CarouselProps) {
  const [idx, setIdx] = useState(0);

  const next = () => setIdx((prev) => (prev + 1) % images.length);
  const prev = () => setIdx((prev) => (prev - 1 + images.length) % images.length);

  // Auto-play
  useEffect(() => {
    if (!autoPlay) return;
    const timer = setInterval(next, interval);
    return () => clearInterval(timer);
  }, [autoPlay, interval]);

  return (
    <div
      className={`relative w-full max-w-2xl mx-auto overflow-hidden rounded-xl shadow-lg bg-gray-100 dark:bg-slate-800 ${className}`}
      role="region"
      aria-label="Image carousel"
    >
      {/* Image */}
      <div className="relative h-64 sm:h-80 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.img
            key={idx}
            src={images[idx]}
            alt={`carousel-image-${idx}`}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.5 }}
            className="absolute w-full h-full object-cover"
          />
        </AnimatePresence>
      </div>

      {/* Boutons navigation */}
      <button
        onClick={prev}
        className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 dark:bg-slate-700/80 hover:bg-white dark:hover:bg-slate-600 p-2 rounded-full shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Précédent"
      >
        <ChevronLeft className="w-5 h-5 text-gray-800 dark:text-gray-200" />
      </button>
      <button
        onClick={next}
        className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 dark:bg-slate-700/80 hover:bg-white dark:hover:bg-slate-600 p-2 rounded-full shadow focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Suivant"
      >
        <ChevronRight className="w-5 h-5 text-gray-800 dark:text-gray-200" />
      </button>

      {/* Indicateurs */}
      <div className="absolute bottom-3 w-full flex justify-center gap-2">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            aria-label={`Aller à l’image ${i + 1}`}
            className={`w-3 h-3 rounded-full transition ${
              idx === i
                ? "bg-blue-600"
                : "bg-gray-400 dark:bg-gray-600 hover:bg-gray-500 dark:hover:bg-gray-500"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

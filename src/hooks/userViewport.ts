// src/hooks/useViewport.ts
import { useEffect, useState } from "react";

/* ============================================================================
 * Types
 * ========================================================================== */
interface Viewport {
  vw: number;
  vh: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isUltraWide: boolean;
  orientation: "portrait" | "landscape";
}

/* ============================================================================
 * Hook useViewport – Responsive + orientation
 * ========================================================================== */
export function useViewport(): Viewport {
  const getSize = () => {
    if (typeof window === "undefined") {
      return { vw: 0, vh: 0 };
    }
    return {
      vw: window.innerWidth,
      vh: window.innerHeight,
    };
  };

  const [size, setSize] = useState(getSize);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    function handleResize() {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        setSize(getSize());
      }, 150); // debounce 150ms
    }

    window.addEventListener("resize", handleResize);
    return () => {
      if (timeout) clearTimeout(timeout);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const { vw, vh } = size;

  return {
    vw,
    vh,
    isMobile: vw < 768,
    isTablet: vw >= 768 && vw < 1100,
    isDesktop: vw >= 1100 && vw < 1600,
    isUltraWide: vw >= 1600,
    orientation: vh >= vw ? "portrait" : "landscape",
  };
}

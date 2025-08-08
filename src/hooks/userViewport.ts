import { useEffect, useState } from "react";

export function useViewport() {
  const [vw, setVw] = useState(window.innerWidth);
  const [vh, setVh] = useState(window.innerHeight);
  useEffect(() => {
    function handleResize() {
      setVw(window.innerWidth);
      setVh(window.innerHeight);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return { vw, vh, isMobile: vw < 768, isTablet: vw >= 768 && vw < 1100 };
}

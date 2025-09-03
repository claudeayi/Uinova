import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { toast } from "react-hot-toast";

/* ============================================================================
 *  Types
 * ========================================================================== */
interface FavoriteItem {
  id: string;
  type: "project" | "template";
  name: string;
  shareId?: string;
  updatedAt?: string;
}

interface FavoritesContextType {
  favorites: FavoriteItem[];
  toggleFavorite: (item: FavoriteItem) => void;
  isFavorite: (id: string) => boolean;
  fetchFavorites: () => Promise<void>;
}

/* ============================================================================
 *  Contexte
 * ========================================================================== */
const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  /* ===============================
     Charger depuis localStorage
  =============================== */
  useEffect(() => {
    const stored = localStorage.getItem("uinova_favorites");
    if (stored) {
      try {
        setFavorites(JSON.parse(stored));
      } catch {
        console.warn("⚠️ Erreur parsing favoris localStorage");
      }
    }
  }, []);

  /* ===============================
     Sauvegarder dans localStorage
  =============================== */
  useEffect(() => {
    localStorage.setItem("uinova_favorites", JSON.stringify(favorites));
  }, [favorites]);

  /* ===============================
     Fonctions principales
  =============================== */
  function toggleFavorite(item: FavoriteItem) {
    setFavorites((prev) => {
      const exists = prev.find((f) => f.id === item.id);
      if (exists) {
        toast("❌ Retiré des favoris", { icon: "⭐" });
        return prev.filter((f) => f.id !== item.id);
      } else {
        toast("⭐ Ajouté aux favoris");
        return [...prev, item];
      }
    });
  }

  function isFavorite(id: string) {
    return favorites.some((f) => f.id === id);
  }

  async function fetchFavorites() {
    // Ici, on ne fait que recharger depuis localStorage.
    // Si tu veux brancher à ton backend, remplace par une requête API.
    const stored = localStorage.getItem("uinova_favorites");
    if (stored) {
      setFavorites(JSON.parse(stored));
    }
  }

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite, fetchFavorites }}>
      {children}
    </FavoritesContext.Provider>
  );
}

/* ============================================================================
 *  Hook utilitaire
 * ========================================================================== */
export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error("useFavorites must be used within FavoritesProvider");
  }
  return ctx;
}

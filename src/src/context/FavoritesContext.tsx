import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";

interface Favorite {
  id: string;
  templateId: string;
}

interface FavoritesContextType {
  favorites: string[];
  toggleFavorite: (templateId: string) => void;
  isFavorite: (templateId: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextType | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>([]);

  async function fetchFavorites() {
    try {
      const res = await axios.get("/api/favorites");
      setFavorites(res.data.map((f: Favorite) => f.templateId));
    } catch (err) {
      console.error("❌ fetchFavorites error:", err);
    }
  }

  async function toggleFavorite(templateId: string) {
    try {
      if (favorites.includes(templateId)) {
        await axios.delete(`/api/favorites/${templateId}`);
        setFavorites(favorites.filter((id) => id !== templateId));
        toast.success("❌ Retiré des favoris");
      } else {
        await axios.post("/api/favorites", { templateId });
        setFavorites([...favorites, templateId]);
        toast.success("⭐ Ajouté aux favoris");
      }
    } catch (err) {
      console.error("❌ toggleFavorite error:", err);
      toast.error("Erreur lors de la mise à jour des favoris.");
    }
  }

  function isFavorite(templateId: string) {
    return favorites.includes(templateId);
  }

  useEffect(() => {
    fetchFavorites();
  }, []);

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}

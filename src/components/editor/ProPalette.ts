// src/components/editor/ProPalette.ts
import {
  MousePointerClick,
  InputIcon,
  Square,
  LayoutGrid,
  Rows,
  Image as ImageIcon,
  Video,
  Navigation,
  PanelsTopLeft,
  Footprints,
  FolderPlus,
  Table,
  ListChecks,
  AlignLeft,
  ChevronDown,
  DollarSign,
  Sparkles,
} from "lucide-react";

export type PaletteItem = {
  type: string;
  label: string;
  icon?: React.ReactNode;
  category: string;
  description?: string;
};

export const PRO_PALETTE: PaletteItem[] = [
  // === Base ===
  { type: "button", label: "Button", icon: <MousePointerClick />, category: "Base", description: "Bouton cliquable" },
  { type: "input", label: "Input", icon: <InputIcon />, category: "Base", description: "Champ de saisie texte" },
  { type: "card", label: "Card", icon: <Square />, category: "Base", description: "Bloc avec titre, contenu, image" },
  { type: "group", label: "Group", icon: <FolderPlus />, category: "Base", description: "Conteneur d’éléments" },

  // === Layouts ===
  { type: "grid", label: "Grid", icon: <LayoutGrid />, category: "Layout", description: "Disposition en colonnes" },
  { type: "stack", label: "Stack", icon: <Rows />, category: "Layout", description: "Disposition verticale/horizontale" },

  // === Médias ===
  { type: "image", label: "Image", icon: <ImageIcon />, category: "Media", description: "Affichage d’une image" },
  { type: "video", label: "Video", icon: <Video />, category: "Media", description: "Lecteur vidéo intégré" },

  // === Navigation ===
  { type: "navbar", label: "Navbar", icon: <Navigation />, category: "Navigation", description: "Barre de navigation" },
  { type: "footer", label: "Footer", icon: <Footprints />, category: "Navigation", description: "Pied de page" },

  // === UI Avancée ===
  { type: "tabs", label: "Tabs", icon: <PanelsTopLeft />, category: "UI", description: "Navigation par onglets" },
  { type: "accordion", label: "Accordion", icon: <ChevronDown />, category: "UI", description: "Contenu repliable" },

  // === Formulaires ===
  { type: "form", label: "Form", icon: <Table />, category: "Form", description: "Formulaire avec champs" },
  { type: "textarea", label: "Textarea", icon: <AlignLeft />, category: "Form", description: "Champ multi-lignes" },
  { type: "select", label: "Select", icon: <ListChecks />, category: "Form", description: "Liste déroulante" },
  { type: "radio", label: "Radio Group", icon: <ListChecks />, category: "Form", description: "Options exclusives" },
  { type: "checkbox", label: "Checkbox", icon: <ListChecks />, category: "Form", description: "Case à cocher" },

  // === Sections ===
  { type: "hero", label: "Hero", icon: <Sparkles />, category: "Sections", description: "Bannière d’accueil" },
  { type: "pricing", label: "Pricing", icon: <DollarSign />, category: "Sections", description: "Tableau de tarification" },
  { type: "features", label: "Features", icon: <Sparkles />, category: "Sections", description: "Liste de fonctionnalités" },
];

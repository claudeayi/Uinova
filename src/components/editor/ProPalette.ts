// src/components/editor/ProPalette.ts
export type PaletteItem = { type: string; label: string };

export const PRO_PALETTE: PaletteItem[] = [
  // Base
  { type: "button", label: "Button" },
  { type: "input", label: "Input" },
  { type: "card", label: "Card" },
  { type: "group", label: "Group" },

  // Layouts
  { type: "grid", label: "Grid" },
  { type: "stack", label: "Stack" },

  // Media
  { type: "image", label: "Image" },
  { type: "video", label: "Video" },

  // Navigation / Footer
  { type: "navbar", label: "Navbar" },
  { type: "footer", label: "Footer" },

  // Tabs / Accordion
  { type: "tabs", label: "Tabs" },
  { type: "accordion", label: "Accordion" },

  // Forms
  { type: "form", label: "Form" },
  { type: "textarea", label: "Textarea" },
  { type: "select", label: "Select" },
  { type: "radio", label: "Radio Group" },
  { type: "checkbox", label: "Checkbox" },

  // Sections
  { type: "hero", label: "Hero" },
  { type: "pricing", label: "Pricing" },
  { type: "features", label: "Features" },
];

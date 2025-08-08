import { UInovaPalette } from "./palette";

export function getThemeColors(mode: "light"|"dark") {
  return UInovaPalette[mode];
}

// Exemple d'utilisation dans un composant :
// const { theme } = useTheme();
// const colors = getThemeColors(theme);

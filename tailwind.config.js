// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem"
    },
    extend: {
      colors: {
        // Palette UInova mappée sur tes variables (définies dans src/index.css)
        primary: "var(--uinova-primary)",
        secondary: "var(--uinova-secondary)",
        accent: "var(--uinova-accent)",
        success: "var(--uinova-success)",
        danger: "var(--uinova-danger)"
      },
      // Exemple d’échelles si tu veux les appeler dans l’UI
      spacing: {
        "4.5": "1.125rem",
        "7.5": "1.875rem"
      },
      borderRadius: {
        "xl2": "1rem"
      },
      boxShadow: {
        "elev-1": "0 1px 2px rgba(0,0,0,.06)",
        "elev-2": "0 6px 24px rgba(0,0,0,.08)"
      },
      // Tu peux connecter tes tokens via CSS vars ici si besoin
      // fontFamily: {
      //   sans: ["var(--uinova-font-sans)", "system-ui", "sans-serif"]
      // }
    }
  },
  safelist: [
    // Grilles & colonnes générées dynamiquement
    { pattern: /^grid-cols-(1[0-2]|[1-9])$/ },
    { pattern: /^col-span-(1[0-2]|[1-9])$/ },
    { pattern: /^row-span-(1[0-6]|[1-9])$/ },

    // Gaps / paddings / margins fréquents
    { pattern: /^gap-(0|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|8|10|12|16)$/ },
    { pattern: /^(p|px|py|pt|pr|pb|pl)-(0|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|8|10|12|16)$/ },
    { pattern: /^(m|mx|my|mt|mr|mb|ml)-(0|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|8|10|12|16)$/ },

    // Alignements / justification flex
    { pattern: /^(items|justify)-(start|center|end|between|around|evenly)$/ },

    // Text & background dynamiques
    { pattern: /^(text|bg|border)-(primary|secondary|accent|success|danger)$/ },
    { pattern: /^(text|bg|border)-(white|black|transparent)$/ },

    // Affichages courants
    "inline-block", "block", "flex", "grid"
  ],
  plugins: [
    // Ajoute si tu les installes :
    // require("@tailwindcss/forms"),
    // require("@tailwindcss/typography"),
    // require("@tailwindcss/line-clamp"),
    // require("@tailwindcss/aspect-ratio")
  ]
};

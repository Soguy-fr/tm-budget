import type { Config } from "tailwindcss";

// Palette de marque (CONSTITUTION.md §4)
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Bleu Nuit / Vert Émeraude / Blanc Cassé
        brand: {
          night: "#1E293B",
          emerald: "#0FA86B",
          paper: "#F8FAFC",
        },
        // Conventions de couleur métier (CONSTITUTION §4)
        input: "#1d4ed8", // saisie utilisateur = bleu
        formula: "#0f172a", // calcul = noir
        alert: "#dc2626", // écart / dépassement = rouge
      },
      fontFamily: {
        heading: ["Montserrat", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;

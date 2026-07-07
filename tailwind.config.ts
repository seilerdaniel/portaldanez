import type { Config } from "tailwindcss";

// Sistema de diseño de Portal Danez.
//
// Dirección: la estética del kiosco y la editorial independiente argentina
// (Eterna Cadencia, Blatt & Ríos) antes que la de un SaaS genérico.
// El elemento de firma es el "sello" — un sello circular tipo matasellos/
// lacre que marca libros destacados y autores verificados (jugando con que
// "sello" en español es tanto un timbre como el nombre de una editorial).
//
// Paleta deliberadamente alejada del combo crema+terracota+serif que por
// default producen los modelos de IA: tinta cálida casi negra, papel
// envejecido (no crema puro), vino profundo como acento principal y
// mostaza como acento de sello/firma.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#1B1B1E",
          soft: "#33323A",
        },
        paper: {
          DEFAULT: "#EFE9DD",
          card: "#FAF8F3",
        },
        wine: {
          DEFAULT: "#7A2331",
          dark: "#5A1A24",
          light: "#9C3A48",
        },
        mustard: {
          DEFAULT: "#C89116",
          dark: "#A87A10",
        },
        pine: {
          DEFAULT: "#1F4741",
          light: "#2C6058",
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "Georgia", "serif"],
        body: ["var(--font-source-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-plex-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        book: "0.25rem 0.25rem 0.375rem 0.375rem",
      },
      boxShadow: {
        cover: "2px 3px 0 0 rgb(27 27 30 / 0.15)",
      },
    },
  },
  plugins: [],
};

export default config;

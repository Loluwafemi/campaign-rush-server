import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["'Space Grotesk'", "system-ui", "sans-serif"],
      },
      colors: {
        canvas: "#0B0F14",
        surface: "#121821",
        border: "#232C3A",
        accent: "#3DDC97",
        warn: "#F2B84B",
        danger: "#E5615A",
        textPrimary: "#EAF1F8",
        textMuted: "#8CA0B3",
        // Landing-page-only palette — deep forest green + lime accent,
        // kept separate from the app's canvas/accent tokens above so
        // nothing inside the dashboards/auth pages changes.
        forest: "#121F15",
        forestLight: "#1B2E1F",
        forestBorder: "#2A4030",
        lime: "#D6FF3F",
        limeDark: "#B8E020",
        cream: "#F3F1E6",
        creamMuted: "#B9C2AE",
      },
    },
  },
  plugins: [],
};
export default config;

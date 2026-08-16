import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#0B0F14",
        surface: "#121821",
        border: "#232C3A",
        accent: "#3DDC97",
        warn: "#F2B84B",
        danger: "#E5615A",
        textPrimary: "#EAF1F8",
        textMuted: "#8CA0B3",
      },
    },
  },
  plugins: [],
};
export default config;

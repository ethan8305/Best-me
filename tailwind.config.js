/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Calm, wellness-forward palette
        ink: "#0B1020",
        surface: "#141B2E",
        card: "#1C2540",
        muted: "#8A94B0",
        line: "#283150",
        // Category accents
        work: "#5B8DEF",
        movement: "#3DD68C",
        family: "#F2A65A",
        alone: "#A98BFF",
        rest: "#6FD0E0",
        flame: "#FF7A45",
      },
    },
  },
  plugins: [],
};

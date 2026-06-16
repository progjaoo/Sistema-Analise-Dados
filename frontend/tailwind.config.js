/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#21180F",
        radio: "#FF8000",
        signal: "#FFB347",
        cream: "#FFF8F0",
        brand: {
          DEFAULT: "#FF8000",
          dark: "#D96500",
          deeper: "#A84700",
          light: "#FFF0DE",
        },
      },
      boxShadow: {
        panel: "0 18px 50px -30px rgba(120,58,0,.28)",
      },
    },
  },
  plugins: [],
};

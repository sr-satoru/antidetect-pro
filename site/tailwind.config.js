/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#080c14",
        card: "#0f172a",
        border: "#1e293b",
        primary: {
          DEFAULT: "#3b82f6",
          hover: "#2563eb",
        },
      },
    },
  },
  plugins: [],
};

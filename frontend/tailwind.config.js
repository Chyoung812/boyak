/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "boyak-blue":   "#2563EB",
        "boyak-orange": "#EA580C",
        "boyak-green":  "#16A34A",
        "boyak-red":    "#DC2626",
        "boyak-ink":    "#111827",
        "boyak-muted":  "#6B7280",
        "boyak-line":   "#D1D5DB",
        "boyak-field":  "#F9FAFB",
      },
    },
  },
  plugins: [],
};

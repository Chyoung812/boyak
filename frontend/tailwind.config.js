/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "boyak-blue":   "#3F73F0",
        "boyak-orange": "#F08312",
        "boyak-green":  "#16A3A0",
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

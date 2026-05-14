const config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        boyak: {
          blue: "#2F73ED",
          green: "#1F9E46",
          orange: "#FF7A0A",
          red: "#E82429",
          ink: "#0F1726",
          muted: "#556274",
          line: "#C9D1DB",
          field: "#F6F8FB"
        }
      },
      boxShadow: {
        soft: "0 18px 34px rgba(15, 23, 38, 0.14)"
      },
      fontFamily: {
        sans: ["Pretendard", "Apple SD Gothic Neo", "Noto Sans KR", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;

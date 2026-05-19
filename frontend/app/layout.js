import "./globals.css";

export const metadata = {
  title: "보약 — 약 안전 도우미",
  description: "약 복용 안전 확인, 병원 찾기, 진료비 안내",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

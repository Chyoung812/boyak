import "./globals.css";

export const metadata = {
  title: "보약 - 복약 안전 확인",
  description: "독거 어르신을 위한 복약 안전 확인 웹앱"
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className="font-sans">{children}</body>
    </html>
  );
}

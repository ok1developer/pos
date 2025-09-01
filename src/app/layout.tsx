import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OK Mobile Display",
  description: "Payment and content display screen",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      {/* <body> ที่นี่ควรจะเรียบง่ายที่สุด ไม่มี className */}
      <body>{children}</body>
    </html>
  );
}
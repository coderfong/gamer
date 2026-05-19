import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gamer",
  description: "Branded prize-game campaigns",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

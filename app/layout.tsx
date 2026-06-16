import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gameable Studios",
  description: "Branded prize-game campaigns",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Luckiest+Guy&family=Fredoka:wght@400;500;600;700&family=Bungee&family=Titan+One&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&family=Bangers&family=Righteous&family=Russo+One&family=Oswald:wght@400;500;600&family=Nunito:wght@400;600;700;800;900&family=Poppins:wght@400;500;600;700;800&family=Outfit:wght@400;600;700&family=Pacifico&family=Space+Grotesk:wght@400;500;600;700&family=Raleway:wght@400;600;700&family=Montserrat:wght@400;500;600;700;800;900&family=Playfair+Display:wght@400;600;700&family=Merriweather:wght@400;700&family=Lora:wght@400;600;700&family=Lobster&family=Satisfy&family=Roboto+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

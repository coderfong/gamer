import type { Metadata } from "next";
import "./globals.css";
import { CONTACT_EMAIL, CONTACT_PHONE, IDENTITY_LINE } from "@/lib/site/contact";

const SITE_URL = "https://gameablestudios.com";
const TITLE = "Gameable Studios — Digital Rewards, Stamp Cards & Game Campaigns for Small Businesses in Singapore";
const DESCRIPTION =
  "We build your branded rewards page — customers scan, join, collect stamps, and redeem in-store. Launch it with a game campaign. A loyalty program for small business, no POS needed. Singapore.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "Gameable Studios",
  keywords: [
    "digital stamp card Singapore",
    "loyalty program for small business",
    "QR rewards for café",
    "spin the wheel promotion Singapore",
    "rewards program",
    "game campaigns",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Gameable Studios",
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    locale: "en_SG",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

// Organization + Service structured data (site-wide).
const JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: "Gameable Studios",
      url: SITE_URL,
      email: CONTACT_EMAIL,
      description: IDENTITY_LINE,
      areaServed: "SG",
      contactPoint: {
        "@type": "ContactPoint",
        telephone: CONTACT_PHONE,
        contactType: "sales",
        areaServed: "SG",
        availableLanguage: ["en"],
      },
    },
    {
      "@type": "Service",
      name: "Rewards programs and game campaigns for small businesses",
      serviceType: "Loyalty rewards program and QR game campaigns",
      provider: { "@id": `${SITE_URL}/#org` },
      areaServed: { "@type": "Country", name: "Singapore" },
      description:
        "Branded digital rewards pages with stamp cards, vouchers, and in-store redemption, plus QR game campaigns that turn every player into a member. No POS required.",
    },
  ],
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

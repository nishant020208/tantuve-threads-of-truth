import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Tantuve — GI handloom traceability",
  description:
    "Tamper-evident provenance for India's GI-protected handloom textiles, from loom to wardrobe.",
  openGraph: {
    title: "Tantuve — GI handloom traceability",
    description: "Verify any GI handloom textile with a tamper-evident production ledger.",
    type: "website",
  },
  icons: { icon: "/favicon.svg" },
};

// Inline script to apply theme before first paint (prevents flash)
const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('tantuve-theme');
    if (t === 'white' || t === 'black' || t === 'aesthetic') {
      document.documentElement.setAttribute('data-theme', t);
    } else {
      document.documentElement.setAttribute('data-theme', 'aesthetic');
    }
  } catch(e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600&display=swap"
        />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

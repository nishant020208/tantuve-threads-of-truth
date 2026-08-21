import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/lib/session";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
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
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "KHAN — AI Market Companion | Crypto, Stocks & Trading Intelligence",
  description:
    "KHAN AI analyzes Bitcoin, every major cryptocurrency, stocks and trading setups in real time. Create your free account, build a watchlist and ask KHAN AI anything about the markets. Support: 9494490006 · paqilkhansab@gmail.com",
  keywords: [
    "KHAN AI", "Bitcoin", "crypto analysis", "stock market", "trading", "Ethereum",
    "Solana", "Nifty 50", "trading AI", "crypto prices", "khanai",
  ],
  authors: [{ name: "KHAN" }],
  openGraph: {
    title: "KHAN — AI Market Companion",
    description: "Powerful AI analysis for crypto, stocks and trading. Launch-ready.",
    siteName: "KHAN",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0F1C",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        {children}
        <Toaster theme="dark" position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}

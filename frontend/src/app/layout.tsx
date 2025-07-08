import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThirdwebProvider } from "thirdweb/react";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { ErrorBoundary } from "../components/ErrorBoundary";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CryptoGift Wallets - Regala el Futuro",
  description: "Regala NFT-wallets con criptomonedas. La forma más fácil de introducir a tus amigos al mundo cripto.",
  keywords: "crypto, NFT, wallet, gift, regalo, blockchain, Base, USDC",
  authors: [{ name: "CryptoGift Wallets Team" }],
  themeColor: "#3b82f6",
  openGraph: {
    title: "CryptoGift Wallets - Regala el Futuro",
    description: "Regala NFT-wallets con criptomonedas. La forma más fácil de introducir a tus amigos al mundo cripto.",
    type: "website",
    images: ["/og-image.jpg"],
  },
  twitter: {
    card: "summary_large_image",
    title: "CryptoGift Wallets - Regala el Futuro",
    description: "Regala NFT-wallets con criptomonedas. La forma más fácil de introducir a tus amigos al mundo cripto.",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <ThirdwebProvider>
          <ErrorBoundary>
            <div className="min-h-screen flex flex-col">
              <Navbar />
              <main className="flex-1">
                {children}
              </main>
              <Footer />
            </div>
          </ErrorBoundary>
        </ThirdwebProvider>
      </body>
    </html>
  );
}

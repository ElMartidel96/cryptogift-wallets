"use client";

import dynamic from "next/dynamic";
import { ErrorBoundary } from "./ErrorBoundary";

const ThirdwebWrapper = dynamic(() => import("./ThirdwebWrapper").then(mod => ({ default: mod.ThirdwebWrapper })), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-gray-50" />
});

const Navbar = dynamic(() => import("./Navbar").then(mod => ({ default: mod.Navbar })), {
  ssr: false,
  loading: () => <div className="h-16 bg-white shadow-lg" />
});

const Footer = dynamic(() => import("./Footer").then(mod => ({ default: mod.Footer })), {
  ssr: false,
  loading: () => <div className="h-32 bg-gray-900" />
});

interface ClientLayoutProps {
  children: React.ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <ThirdwebWrapper>
      <ErrorBoundary>
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </div>
      </ErrorBoundary>
    </ThirdwebWrapper>
  );
}
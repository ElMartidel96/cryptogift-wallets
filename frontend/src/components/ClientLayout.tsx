"use client";

import dynamic from "next/dynamic";
import { ErrorBoundary } from "./ErrorBoundary";
import { ThemeProvider } from "./providers/ThemeProvider";
import { StaticBackground } from "./ui/StaticBackground";
import { GlassHeader } from "./layout/GlassHeader";

const ThirdwebWrapper = dynamic(() => import("./ThirdwebWrapper").then(mod => ({ default: mod.ThirdwebWrapper })), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-background" />
});

const Navbar = dynamic(() => import("./Navbar").then(mod => ({ default: mod.Navbar })), {
  ssr: false,
  loading: () => <div className="h-16 glass-panel" />
});

const Footer = dynamic(() => import("./Footer").then(mod => ({ default: mod.Footer })), {
  ssr: false,
  loading: () => <div className="h-32 glass-panel" />
});

const MintDebugger = dynamic(() => import("./MintDebugger").then(mod => ({ default: mod.MintDebugger })), {
  ssr: false,
  loading: () => null
});

interface ClientLayoutProps {
  children: React.ReactNode;
}

export function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <ThemeProvider>
      <ThirdwebWrapper>
        <ErrorBoundary>
          {/* FONDO ESTÁTICO */}
          <StaticBackground />
          
          {/* ESTRUCTURA PRINCIPAL */}
          <div className="relative min-h-screen">
            {/* HEADER CON MOSAICO */}
            <GlassHeader>
              <div></div>
            </GlassHeader>
            
            {/* CONTENIDO PRINCIPAL */}
            <main className="relative z-0">
              {children}
            </main>
            
            {/* FOOTER */}
            <Footer />
            <MintDebugger />
          </div>
        </ErrorBoundary>
      </ThirdwebWrapper>
    </ThemeProvider>
  );
}
"use client";

import { ThirdwebProvider } from "thirdweb/react";
import { useEffect, useState } from "react";

interface ThirdwebWrapperProps {
  children: React.ReactNode;
}

export function ThirdwebWrapper({ children }: ThirdwebWrapperProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  return (
    <ThirdwebProvider>
      {children}
    </ThirdwebProvider>
  );
}
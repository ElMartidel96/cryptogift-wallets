"use client";

import { ThirdwebProvider } from "thirdweb/react";

interface ThirdwebWrapperProps {
  children: React.ReactNode;
}

export function ThirdwebWrapper({ children }: ThirdwebWrapperProps) {
  return (
    <ThirdwebProvider>
      {children}
    </ThirdwebProvider>
  );
}
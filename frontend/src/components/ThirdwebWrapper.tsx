"use client";

import { ThirdwebProvider } from "thirdweb/react";
import { client } from "../app/client";

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
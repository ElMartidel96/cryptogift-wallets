import type { AppProps } from 'next/app';
import { ThirdwebProvider } from 'thirdweb/react';
import '../app/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThirdwebProvider>
      <Component {...pageProps} />
    </ThirdwebProvider>
  );
}
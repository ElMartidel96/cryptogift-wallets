import type { AppProps } from 'next/app';
import { ThirdwebProvider } from 'thirdweb/react';
import { client } from '../app/client';
import '../app/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThirdwebProvider client={client}>
      <Component {...pageProps} />
    </ThirdwebProvider>
  );
}
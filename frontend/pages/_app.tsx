import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/react";
import { ApolloProvider } from "@apollo/client";
import { apolloClient } from "@/lib/apolloClient";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ApolloProvider client={apolloClient}>
      <Component {...pageProps} />
      <Toaster />
      <Analytics />
    </ApolloProvider>
  );
}

import type { Metadata, Viewport } from "next";
import "./globals.css";
import { QueryProvider } from "../lib/query_provider";
import { SkipLink } from "../components/SkipLink";
import { AppFrame } from "../components/shell/AppFrame";
import { ClientErrorBoundary } from "../components/ErrorBoundary";

export const metadata: Metadata = {
  title: "HimVote",
  description:
    "Institutional campus election platform with inspectable cryptographic evidence and verifiable security boundaries.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#07111e" },
  ],
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="sv-body apple-body min-h-screen flex flex-col antialiased">
        <ClientErrorBoundary>
          <QueryProvider>
            <SkipLink />
            <AppFrame>{children}</AppFrame>
          </QueryProvider>
        </ClientErrorBoundary>
      </body>
    </html>
  );
}

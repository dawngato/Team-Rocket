import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "../lib/query_provider";
import { SkipLink } from "../components/SkipLink";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { ClientErrorBoundary } from "../components/ErrorBoundary";

export const metadata: Metadata = {
  title: "HimVote | Institutional Verifiable Election Platform",
  description:
    "Institutional campus election platform with inspectable cryptographic evidence and verifiable security boundaries.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="apple-body min-h-screen flex flex-col antialiased">
        <ClientErrorBoundary>
          <QueryProvider>
            <SkipLink />
            <Navbar />
            <div
              role="status"
              className="w-full border-b border-[#AA6C0B]/30 bg-[#AA6C0B]/10 px-4 py-2 text-center text-xs text-[#6B4707] dark:text-[#FBBF24]"
            >
              <span className="font-semibold">Educational prototype.</span>{" "}
              Cryptographic security sandbox. Engine integration and independent production operations remain gated. Do not use for unverified live elections.
            </div>
            <main id="main-content" className="flex-1 focus-visible:outline-none">
              {children}
            </main>
            <Footer />
          </QueryProvider>
        </ClientErrorBoundary>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";
import { QueryProvider } from "../lib/query_provider";
import { SkipLink } from "../components/SkipLink";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";

export const metadata: Metadata = {
  title: "HimVote | Institutional Verifiable Election Platform",
  description:
    "Production grade institutional election platform providing cryptographic verification across student, faculty, and administrative contests.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col bg-[#F3F6FA] dark:bg-[#0B1524] text-[#17233B] dark:text-[#E2E8F0] antialiased">
        <QueryProvider>
          <SkipLink />
          <Navbar />
          <main id="main-content" className="flex-1 focus-visible:outline-none">
            {children}
          </main>
          <Footer />
        </QueryProvider>
      </body>
    </html>
  );
}

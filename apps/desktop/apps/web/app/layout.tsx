import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SecureVote | integrity demo",
  description:
    "A synthetic campus election interface for exploring accepted-ballot integrity and verification boundaries.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

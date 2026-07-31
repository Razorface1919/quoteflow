import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "QuoteFlow Enterprise | BOM & Quotation Management",
  description: "Enterprise-grade workflow engine for quotation and BOM management.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100`}>
        {/* Persistent App Navigation */}
        <Navbar />
        
        {/* Main Page Content */}
        <main>{children}</main>
      </body>
    </html>
  );
}
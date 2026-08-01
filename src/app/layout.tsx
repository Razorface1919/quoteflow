import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import { auth } from "@/auth";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "QuoteFlow Enterprise | BOM & Quotation Management",
  description: "Enterprise-grade workflow engine for quotation and BOM management.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch the session securely on the server before rendering the layout
  const session = await auth();

  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className={`${inter.className} bg-white dark:bg-[#0a0a0a] text-black dark:text-white`}>
        {/* Persistent App Navigation */}
        <Navbar user={session?.user} />
        
        {/* Main Page Content */}
        <main>{children}</main>
      </body>
    </html>
  );
}
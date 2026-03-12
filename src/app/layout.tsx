import type { Metadata } from "next";
import { Geist_Mono, Cinzel } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { Navbar } from "@/components/navbar";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

export const metadata: Metadata = {
  title: "KCD2 Dice Game",
  description: "Kingdom Come: Deliverance 2 — Competitive Dice Game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistMono.variable} ${cinzel.variable} antialiased min-h-screen bg-background text-foreground`}
      >
        <QueryProvider>
          <Navbar />
          <main className="container mx-auto px-4 py-6">{children}</main>
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  );
}

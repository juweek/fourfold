import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { AppChrome } from "@/components/AppChrome";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-fraunces", display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Fourfold — Personal Quest Manager",
  description: "A quiet dark-fantasy task manager for four paths of progress.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`${fraunces.variable} ${inter.variable}`}><body><AppChrome>{children}</AppChrome></body></html>;
}

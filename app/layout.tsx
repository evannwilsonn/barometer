import type { Metadata } from "next";
import { Literata, Red_Hat_Mono, Saira_Extra_Condensed } from "next/font/google";
import "./globals.css";

const saira = Saira_Extra_Condensed({ subsets: ["latin"], weight: ["600", "800"], variable: "--font-saira" });
const literata = Literata({ subsets: ["latin"], variable: "--font-literata" });
const mono = Red_Hat_Mono({ subsets: ["latin"], variable: "--font-redhat-mono" });

export const metadata: Metadata = {
  title: "Barometer",
  description: "Next-week volatility forecasts for US stocks, with the likely price range and a plain-language note.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${saira.variable} ${literata.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}

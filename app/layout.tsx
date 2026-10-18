import type { Metadata } from "next";
import { Marcellus, Newsreader, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";

const marcellus = Marcellus({ subsets: ["latin"], weight: "400", variable: "--font-marcellus" });
const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-newsreader", style: ["normal", "italic"] });
const mono = Spline_Sans_Mono({ subsets: ["latin"], variable: "--font-spline-mono" });

export const metadata: Metadata = {
  title: "Barometer",
  description: "Next-week volatility forecasts for US stocks, read off a barometer dial, with the likely price range and a plain-language note.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${marcellus.variable} ${newsreader.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}

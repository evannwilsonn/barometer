import type { Metadata } from "next";
import { Arsenal_SC, Libre_Baskerville } from "next/font/google";
import "./globals.css";

// The thumbnail's two faces: Libre Baskerville for headings and text (with its italic for the
// log), Arsenal SC for the letterspaced dial words, labels and figures.
const baskerville = Libre_Baskerville({ subsets: ["latin"], weight: ["400", "700"], style: ["normal", "italic"], variable: "--font-baskerville" });
const arsenal = Arsenal_SC({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-arsenal" });

export const metadata: Metadata = {
  title: "Barometer",
  description: "Next-week volatility forecasts for US stocks, read off a barometer dial, with the likely price range and a plain-language note.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${baskerville.variable} ${arsenal.variable}`}>
      <body>{children}</body>
    </html>
  );
}

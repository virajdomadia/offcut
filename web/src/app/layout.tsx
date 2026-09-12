import type { Metadata } from "next";
import { Archivo } from "next/font/google";
const sans = Archivo({ subsets: ["latin"], variable: "--font-sans", display: "swap", axes: ["wdth"] });
import "./globals.css";

export const metadata: Metadata = {
  title: "Offcut \u2014 streetwear, no filler",
  description: "Streetwear in short runs from Bengaluru. Drop a photo and shop the look.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}

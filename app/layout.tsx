import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layout/Providers";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "StockCopilot",
  description:
    "Promociones y restock inteligentes con IA para reducir pérdidas y aumentar ventas en retail.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${manrope.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

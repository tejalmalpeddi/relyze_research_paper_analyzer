import type { Metadata } from "next";
import { EB_Garamond } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/navbar/NavBar";

const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Relyze",
  description: "Academic paper analysis platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${ebGaramond.variable} h-full antialiased`}>
      <body className="h-full">
        <NavBar />
        {children}
      </body>
    </html>
  );
}

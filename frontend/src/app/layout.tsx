import type { Metadata } from "next";
import { EB_Garamond } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/navbar/NavBar";
import { AuthProvider } from '@/app/auth/auth-query';

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
        <AuthProvider>
          <NavBar />
          {children}
        </AuthProvider>
      </body>
      </html>
  );
}

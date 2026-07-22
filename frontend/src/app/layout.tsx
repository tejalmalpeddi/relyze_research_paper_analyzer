import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/navbar/NavBar";

export const metadata: Metadata = {
  title: "Relyze",
  description: "Research Paper Analyzer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
    >
      <body>
        <NavBar/>
        {children}
      </body>
    </html>
  );
}

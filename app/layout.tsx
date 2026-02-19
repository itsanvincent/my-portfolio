import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SiteCursor from "./components/SiteCursor";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Chroma · Study 01",
  description:
    "Chromatic study — A quiet halo follows the cursor. GLSL shaders · Three.js",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://api.fontshare.com/v2/css?f[]=pp-mori@400,600,700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${inter.variable} font-sans antialiased bg-white text-zinc-800`}
      >
        <SiteCursor />
        {children}
      </body>
    </html>
  );
}

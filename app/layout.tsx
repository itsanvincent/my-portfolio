import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SiteCursor from "./components/SiteCursor";
import Script from 'next/script';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Vincent An",
  description:
    "Personal site — Chromatic aberration effect: quiet halo follows the cursor. GLSL shaders · Three.js",
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
        <Script
            src="https://www.googletagmanager.com/gtag/js?id=G-CY7QPPTSSV"
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-CY7QPPTSSV');
            `}
          </Script>
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

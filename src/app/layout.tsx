import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import { ThemeProvider } from "@/lib/ThemeContext";
import "./globals.css";

const inter   = Inter({ variable: "--font-geist-sans", subsets: ["latin"] });
const jetMono = JetBrains_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "ระบบจัดการ IT", template: "%s | ระบบจัดการ IT" },
  description: "IT Asset Management & Smart Floor Plan System",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "IT Assets" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)",  color: "#0f172a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className={`${inter.variable} ${jetMono.variable} antialiased bg-background text-foreground`}>
        <ThemeProvider>
          <LanguageProvider>
            {children}
            <Toaster richColors position="top-right" closeButton />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

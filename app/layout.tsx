import { ThemeProvider } from "@/components/theme-provider";
import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ConditionalLayout } from "./components/conditional-layout";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "SyncUp - AI-Powered Meeting Assistant",
  description: "Intelligent meeting assistant that automatically records, transcribes, and summarizes your meetings with AI-powered insights",
  // Performance hints
  icons: {
    icon: "/favicon.ico",
  },
};

// Static generation hints for better performance
export const dynamicParams = true; // Allow dynamic pages
export const revalidate = 3600; // Revalidate static pages every hour
export const fetchCache = 'default-cache'; // Enable fetch caching

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning className="dark">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
          >
            <ConditionalLayout>{children}</ConditionalLayout>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

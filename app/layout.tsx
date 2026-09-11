import type { Metadata } from "next";
import { Fira_Sans, Inter, Geist_Mono } from "next/font/google";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const firaSans = Fira_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Invictus CRM",
  description: "Pipeline and records for the Verena go-to-market launch.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${firaSans.variable} ${inter.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {/* URL-state for filters and toggles (nuqs). Without the adapter every
              useQueryState call throws - /tasks 500'd until this was mounted. */}
          <NuqsAdapter>{children}</NuqsAdapter>
        </ThemeProvider>
      </body>
    </html>
  );
}

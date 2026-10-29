import type { Metadata } from "next";
import { Inter, Literata } from "next/font/google";
import { SyncProvider } from "@/components/sync-provider";
import { Toaster } from "@/components/ui/sonner";
import { THEME_SCRIPT } from "@/lib/theme-script";

import "./globals.css";

// Interface text.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  axes: ["opsz"],
});

// Essay text. Italic is used for French examples in correction notes.
const literata = Literata({
  variable: "--font-literata",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: "Ink",
  description: "Practice TEF writing and fix your own mistakes.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${literata.variable} h-full antialiased`}
      // THEME_SCRIPT sets data-theme before React hydrates.
      suppressHydrationWarning
    >
      <head>
        {/* Inline and blocking, so the theme is set before the first paint.
            next/script's beforeInteractive runs inline code only after
            Next's own scripts load, which is after paint: a flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
        <SyncProvider />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Public_Sans, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import AppChrome from "@/components/shared/AppChrome";
import "./globals.css";
import { cn } from "@/lib/utils";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
});

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "dobly | handled.",
  description:
    "Describe what needs doing. Connect your tools. Dobly handles the rest.",
  keywords: ["automation", "workflow", "AI", "operations", "personal productivity", "business systems"],
  openGraph: {
    title: "dobly | handled.",
    description: "People shouldn't have to think about work that can run itself.",
    url: "https://dobly.io",
    siteName: "Dobly",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "dobly | handled.",
    description: "What needs to happen, happens.",
    creator: "@doblyhq",
  },
  robots: { index: true, follow: true },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Dobly",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(spaceGrotesk.variable, publicSans.variable, jetBrainsMono.variable)}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('dobly-theme') || 'system';
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var resolved = stored === 'system' ? (prefersDark ? 'dark' : 'light') : stored;
                  document.documentElement.dataset.theme = stored;
                  document.documentElement.classList.add(resolved);
                  document.documentElement.style.colorScheme = resolved;
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`font-body bg-[var(--bg)] text-[var(--text)] antialiased`}
      >
        <AppChrome>{children}</AppChrome>
      </body>
    </html>
  );
}

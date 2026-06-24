import type { Metadata } from "next";
import { Instrument_Sans, Instrument_Serif, JetBrains_Mono } from "next/font/google";
import AppChrome from "@/components/shared/AppChrome";
import PostHogRouteTracker from "@/components/analytics/PostHogRouteTracker";
import PostHogSnippet from "@/components/analytics/PostHogSnippet";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import "./globals.css";
import { cn } from "@/lib/utils";
import WebVitalsReporter from "@/components/analytics/WebVitalsReporter";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400"],
});

const instrumentSans = Instrument_Sans({
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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://dobly.io"),
  title: "Dobly | Your business runs. You direct it.",
  description:
    "Dobly is the operating layer between owner intent and company execution. Set the standard. Dobly runs departments, work types, systems, outputs, and follow-through with trust built in.",
  keywords: ["AI operations", "business operating system", "workflow automation", "small business OS", "autonomous operations", "business systems"],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Dobly | Your business runs. You direct it.",
    description: "The operating system for businesses that need departments, outputs, and trust to move in sync.",
    url: "https://dobly.io",
    siteName: "Dobly",
    type: "website",
    images: [{ url: "/dobly-generated-light.png", alt: "Dobly workspace" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Dobly | Your business runs. You direct it.",
    description: "The operating layer between owner intent and company-wide execution.",
    creator: "@doblyhq",
    images: ["/dobly-generated-light.png"],
  },
  robots: { index: true, follow: true },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Dobly",
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
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
      className={cn(instrumentSerif.variable, instrumentSans.variable, jetBrainsMono.variable)}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Dobly",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web, iOS, Android",
              url: process.env.NEXT_PUBLIC_APP_URL || "https://dobly.io",
              description: "A workspace where businesses create and direct AI coworkers for customer, operations, finance, research, creative, and administrative work.",
              offers: { "@type": "Offer", price: "0", priceCurrency: "KES" },
            }).replace(/</g, "\\u003c"),
          }}
        />
        <PostHogSnippet />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('dobly-theme') || 'light';
                  var system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  var theme = stored === 'system' ? system : stored;
                  document.documentElement.dataset.theme = theme;
                  document.documentElement.classList.remove('light', 'dark');
                  document.documentElement.classList.add(theme);
                  document.documentElement.style.colorScheme = theme;
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`font-body bg-[var(--dobly-bg)] text-[var(--dobly-text)] antialiased`}
      >
        <ThemeProvider defaultTheme="light">
          <PostHogRouteTracker />
          <WebVitalsReporter />
          <AppChrome>{children}</AppChrome>
        </ThemeProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Noto_Sans_Devanagari, Noto_Sans_Tamil, Noto_Sans_Telugu } from "next/font/google";
import ConnectionBanner from "@/components/ConnectionBanner";
import LocaleSync from "@/components/LocaleSync";
import MotionProvider from "@/components/MotionProvider";
import { ToastProvider } from "@/components/Toast";
import { AuthProvider } from "@/lib/auth";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"] });
// Indian scripts: only downloaded when a page actually shows those characters.
const devanagari = Noto_Sans_Devanagari({ variable: "--font-devanagari", subsets: ["devanagari"], preload: false });
const tamil = Noto_Sans_Tamil({ variable: "--font-tamil", subsets: ["tamil"], preload: false });
const telugu = Noto_Sans_Telugu({ variable: "--font-telugu", subsets: ["telugu"], preload: false });

export const metadata: Metadata = {
  title: "Aptitude Teacher — Learn what you don't know",
  description: "A playful AI tutor that finds your gaps, teaches them, and tests you again, in English, Hindi, Tamil and Telugu.",
  applicationName: "Aptitude Teacher",
  appleWebApp: { capable: true, title: "Aptitude", statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0c11" },
  ],
  colorScheme: "light dark",
  // Lets the tab bar sit above the iPhone home indicator (see .pb-safe).
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const fonts = [inter, mono, devanagari, tamil, telugu].map((f) => f.variable).join(" ");
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning className={`${fonts} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <MotionProvider>
          <AuthProvider>
            <ToastProvider>
              <LocaleSync />
              <ConnectionBanner />
              {children}
            </ToastProvider>
          </AuthProvider>
        </MotionProvider>
      </body>
    </html>
  );
}

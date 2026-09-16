import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, Newsreader } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import "./globals.css";

const plex = IBM_Plex_Sans({ variable: "--font-plex", subsets: ["latin"], weight: ["400", "500", "600"] });
const newsreader = Newsreader({ variable: "--font-newsreader", subsets: ["latin"], weight: ["500", "600"] });

export const metadata: Metadata = {
  title: "Aptitude Teacher",
  description: "Adaptive aptitude practice with an AI tutor that finds what you don't know and teaches it.",
  applicationName: "Aptitude Teacher",
};

export const viewport: Viewport = {
  themeColor: "#1b7a5c",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${plex.variable} ${newsreader.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

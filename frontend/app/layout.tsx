import type { Metadata } from "next";
import { IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/AppShell";

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-ibm-mono",
});

export const metadata: Metadata = {
  title: "Adrena Squads",
  description: "Team-based trading competitions on Adrena Protocol",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={ibmPlexMono.variable}>
      <body style={{ fontFamily: "var(--font-ibm-mono), monospace" }}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

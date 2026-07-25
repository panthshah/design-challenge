import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quorum — Design Challenge",
  description:
    "Enter the Quorum fintech design challenge.",
  openGraph: {
    title: "Quorum — Design Challenge",
    description: "Enter the Quorum fintech design challenge.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Quorum — Design Challenge",
    description: "Enter the Quorum fintech design challenge.",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quorum — Choose a way in",
  description:
    "Explore the thinking behind Quorum or experience the product prototype.",
  openGraph: {
    title: "Quorum",
    description: "Make the money decision without making it personal.",
    type: "website",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Quorum — Make the money decision without making it personal.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Quorum",
    description: "Make the money decision without making it personal.",
    images: ["/og.png"],
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

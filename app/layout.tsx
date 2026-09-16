import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://valley-stage-visalia.vidspfx.chatgpt.site"),
  title: "Valley Stage | Live theater near Visalia",
  description:
    "An automated guide to live theater, upcoming productions, and auditions around Visalia, California.",
  openGraph: {
    title: "Valley Stage | Live theater near Visalia",
    description:
      "What is playing, what is coming, and where auditions are opening around Visalia.",
    images: [{ url: "/og.png", width: 1731, height: 909 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Valley Stage | Live theater near Visalia",
    description:
      "What is playing, what is coming, and where auditions are opening around Visalia.",
    images: ["/og.png"],
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

import { cormorant, jost } from "./fonts";
import type { Metadata } from "next";
import "./globals.css";

const coupleName = process.env.NEXT_PUBLIC_COUPLE_NAMES ?? "The Wedding";
const weddingDate = process.env.NEXT_PUBLIC_WEDDING_DATE ?? "";

export const metadata: Metadata = {
  title: `${coupleName} — Wedding Memories`,
  description: `Share beautiful moments from ${coupleName}'s wedding${
    weddingDate ? ` on ${weddingDate}` : ""
  }.`,
  icons: {
    icon: "/imglogo.png",
    apple: "/imglogo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`min-h-screen ${cormorant.variable} ${jost.variable}`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}

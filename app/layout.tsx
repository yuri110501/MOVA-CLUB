import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MOVA Club Orlando — Fitness. Community. Experience.",
  description: "Fitness, wellness and community experiences for women in Orlando, Florida.",
  icons: {
    icon: "/assets/favicon.png",
    shortcut: "/assets/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Survive30 — Money workspace",
  description: "Track income, spending, savings, and upcoming charges in a 30-day ₹10,000 money challenge.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

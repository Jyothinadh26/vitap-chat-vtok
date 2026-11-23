import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VIT-AP VTOP AI Assistant",
  description: "Chat-first AI assistant for VIT-AP University students powered by Antigravity and Gemini.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}

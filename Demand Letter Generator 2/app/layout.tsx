import type { Metadata } from "next";
import "./globals.css";
import { BackgroundPaths } from "@/components/ui/background-paths";

export const metadata: Metadata = {
  title: "DemandsAI - Demand Letter Generator",
  description: "AI-powered demand letter generation tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="relative">
        <BackgroundPaths />
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}


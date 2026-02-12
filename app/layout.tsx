import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppShell } from "@/app/components/shell/app-shell";
import { ThemeProvider } from "@/app/providers/theme-provider";

export const metadata: Metadata = {
  title: "TattvaMente",
  description: "First-Principles Intelligence in Your Browser",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
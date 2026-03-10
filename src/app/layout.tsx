import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Wandermate — Instant Quote",
  description: "Get a travel quotation instantly (no waiting).",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div suppressHydrationWarning>{children}</div>
      </body>
    </html>
  );
}


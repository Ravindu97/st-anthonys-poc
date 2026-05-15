import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "St. Anthony's Charge",
  description: "Fast charging network — Sri Lanka",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="header">
          <h1>St. Anthony&apos;s Charge</h1>
          <nav>
            <a href="/">Stations</a>
            <a href="/history">History</a>
            <a href="/login">Account</a>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}

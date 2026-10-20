import "./globals.css";
import type { Metadata } from "next";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "MediVault — Centralized Patient Medical Records & Medication Safety",
  description: "Cross-hospital longitudinal patient medical records, QR emergency profiles, and clinical decision support.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <Navbar />
        <main className="flex-1 w-full">{children}</main>
        <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
          <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <span className="font-semibold text-slate-800">MediVault System</span> — Academic DBMS Student Prototype. Synthetic Clinical Data.
            </div>
            <div className="flex items-center gap-4 text-slate-400">
              <span>Oracle Database 11g/19c/23ai</span>
              <span>•</span>
              <span>FastAPI Backend</span>
              <span>•</span>
              <span>Next.js App Router</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

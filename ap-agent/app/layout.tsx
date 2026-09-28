import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains" });

export const metadata: Metadata = {
  title: "AP Agent | Hindsight Memory",
  description: "Accounts Payable AI Agent with Hindsight Memory",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${jetbrains.variable} font-sans bg-[var(--bg-primary)] text-[var(--text-primary)] min-h-screen`}>
        <nav className="border-b border-[var(--border)] bg-[var(--bg-card)] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 rounded-full bg-[var(--accent-blue)] flex items-center justify-center font-bold">
              AP
            </div>
            <span className="font-semibold text-lg">Accounts Payable Agent</span>
          </div>
          <div className="flex gap-6 text-sm text-[var(--text-secondary)]">
            <a href="/dashboard" className="hover:text-white transition-colors">Dashboard</a>
            <a href="/invoices/upload" className="hover:text-white transition-colors">Upload Invoice</a>
          </div>
        </nav>
        <main className="p-8 max-w-7xl mx-auto">
          {children}
        </main>
        <Toaster 
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)'
            }
          }}
        />
      </body>
    </html>
  );
}

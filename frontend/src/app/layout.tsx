import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import Providers from "@/components/Providers";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Fixxly CLOS — Category Leader Operating System",
  description: "AI-powered category management platform for Fixxly Pvt Ltd — Quick Commerce Building Materials",
  keywords: "category management, building materials, quick commerce, AI, inventory",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-dark-800 text-white font-sans antialiased min-h-screen">
        <Providers>
          <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-y-auto bg-dark-900">
              <div className="min-h-full">{children}</div>
            </main>
          </div>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#1e2230",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.1)",
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}

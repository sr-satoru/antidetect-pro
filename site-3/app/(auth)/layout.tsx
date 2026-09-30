import React from "react";
import type { Metadata } from "next";
import { Navbar } from "@/app/components/layout/navbar";
import { Footer } from "@/app/components/layout/footer";

export const metadata: Metadata = {
  title: "Acessar Conta",
  description: "Faça login ou crie sua conta no Star Multlogin para sincronizar perfis na nuvem.",
  robots: {
    index: false,
    follow: true,
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#08090C] text-[#f4f4f5]">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-12 sm:py-16 px-4 sm:px-6">
        <div className="w-full max-w-md">{children}</div>
      </main>
      <Footer />
    </div>
  );
}

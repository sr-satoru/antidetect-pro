import React from "react";
import { Navbar } from "@/app/components/layout/navbar";
import { Footer } from "@/app/components/layout/footer";

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

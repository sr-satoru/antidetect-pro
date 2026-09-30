import React from "react";
import { Navbar } from "../components/layout/navbar";
import { Footer } from "../components/layout/footer";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#0b0b0b] text-[#f4f4f5]">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

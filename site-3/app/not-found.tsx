"use client";

import Link from "next/link";
import { Button } from "./components/ui/button";
import { useI18n } from "./contexts/i18n-context";
import { Navbar } from "./components/layout/navbar";
import { Footer } from "./components/layout/footer";

export default function NotFound() {
  const { t } = useI18n();
  const n = t.notFound;

  return (
    <div className="flex min-h-screen flex-col bg-[#08090C] text-[#f4f4f5]">
      <Navbar />
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none py-20">
        <h1 className="text-7xl font-extrabold text-white tracking-tighter">404</h1>
        <h2 className="mt-4 text-xl font-bold text-zinc-200">{n.title}</h2>
        <p className="mt-2 text-sm text-[#9093A2] max-w-sm">
          {n.description}
        </p>
        <div className="mt-6">
          <Link href="/">
            <Button variant="star">{n.btnBack}</Button>
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}

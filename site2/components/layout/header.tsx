import React from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="relative z-20 w-full h-16 border-b border-[#232530] bg-[#101116]/80 backdrop-blur-md px-6 sm:px-10 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-3 group transition-transform active:scale-98">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#00FF66] to-[#00D655] shadow-md shadow-[#00FF66]/20 group-hover:brightness-110 transition-all">
          <Star size={18} className="fill-black stroke-black" />
        </div>
        <div className="flex items-center gap-2.5">
          <span className="font-semibold text-white text-sm tracking-tight">One Star Multilogin</span>
          <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[#8E92A2]">
            Conta & Nuvem
          </span>
        </div>
      </Link>

      <div className="flex items-center gap-4">
        <a
          href="#precos"
          className="hidden sm:inline-flex text-xs font-medium text-[#8E92A2] hover:text-white transition-colors"
        >
          Planos & Preços
        </a>

        <div className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#00FF66]/10 border border-[#00FF66]/20 text-[11px] font-medium text-[#00FF66]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#00FF66] animate-pulse" />
          Nuvem Online
        </div>

        <Link
          to="/auth?action=login"
          className="rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] px-3.5 py-2 text-xs font-semibold text-[#E1E4EA] hover:text-white transition-all shadow-sm"
        >
          Entrar
        </Link>
        <Link
          to="/auth?action=register"
          className="rounded-xl bg-gradient-to-r from-[#00FF66] to-[#00D655] hover:brightness-110 px-3.5 py-2 text-xs font-bold text-black transition-all shadow-md shadow-[#00FF66]/20"
        >
          Criar Conta
        </Link>
      </div>
    </header>
  );
};

export default Header;

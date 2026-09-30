import React from 'react';
import { Link } from 'react-router-dom';
import { Star, ShieldCheck, Lock, Cloud, Zap, ArrowUpRight } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="relative z-10 w-full border-t border-[#232530] bg-[#0c0d12]/90 backdrop-blur-md pt-16 pb-12 px-6 sm:px-10 mt-24">
      <div className="mx-auto max-w-6xl">
        {/* Grid Principal do Rodapé */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 pb-12 border-b border-[#232530]">
          {/* Coluna 1 & 2: Identidade e Descrição */}
          <div className="lg:col-span-2 space-y-4 text-left">
            <Link to="/" className="inline-flex items-center gap-3 group">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#00FF66] to-[#00D655] shadow-md shadow-[#00FF66]/20 group-hover:brightness-110 transition-all">
                <Star size={18} className="fill-black stroke-black" />
              </div>
              <span className="font-bold text-white text-base tracking-tight">One Star Multilogin</span>
            </Link>

            <p className="text-xs text-[#8E92A2] leading-relaxed max-w-sm">
              Plataforma profissional de antidetect browser com isolamento avançado de fingerprints de hardware, sincronização contínua e arquitetura em nuvem ultrarrápida.
            </p>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#191A21] border border-[#232530] text-[11px] text-[#00FF66]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00FF66] animate-pulse" />
              <span>Sistemas de Nuvem Operacionais</span>
            </div>
          </div>

          {/* Coluna 3: Produto */}
          <div className="text-left space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white">Produto</h4>
            <ul className="space-y-2 text-xs text-[#8E92A2]">
              <li>
                <a href="#precos" className="hover:text-white transition-colors">Planos & Preços</a>
              </li>
              <li>
                <Link to="/auth?action=login" className="hover:text-white transition-colors">Conectar Conta</Link>
              </li>
              <li>
                <Link to="/auth?action=register" className="hover:text-white transition-colors">Criar Nova Conta</Link>
              </li>
              <li>
                <span className="text-[#5E6172] cursor-not-allowed">Download Desktop</span>
              </li>
            </ul>
          </div>

          {/* Coluna 4: Tecnologia & Recursos */}
          <div className="text-left space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white">Recursos</h4>
            <ul className="space-y-2 text-xs text-[#8E92A2]">
              <li>
                <span className="hover:text-white transition-colors cursor-pointer">Sincronização Nuvem S3</span>
              </li>
              <li>
                <span className="hover:text-white transition-colors cursor-pointer">Fingerprint Shield</span>
              </li>
              <li>
                <span className="hover:text-white transition-colors cursor-pointer">Gerenciador de Proxies</span>
              </li>
              <li>
                <span className="hover:text-white transition-colors cursor-pointer">Protocolo MCP & API</span>
              </li>
            </ul>
          </div>

          {/* Coluna 5: Segurança & Legal */}
          <div className="text-left space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white">Segurança</h4>
            <ul className="space-y-2 text-xs text-[#8E92A2]">
              <li className="flex items-center gap-1.5 text-[#8E92A2]">
                <ShieldCheck size={13} className="text-[#00FF66]" />
                <span>Privacidade Total</span>
              </li>
              <li className="flex items-center gap-1.5 text-[#8E92A2]">
                <Lock size={13} className="text-[#00D655]" />
                <span>Backup Criptografado</span>
              </li>
              <li className="flex items-center gap-1.5 text-[#8E92A2]">
                <Cloud size={13} className="text-blue-400" />
                <span>Armazenamento Isolado</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Linha Inferior com Copyright e Badges */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#5E6172]">
          <p>© {new Date().getFullYear()} One Star Multilogin. Todos os direitos reservados.</p>
          <div className="flex items-center gap-6 text-[11px] text-[#8E92A2]">
            <span className="hover:text-white transition-colors cursor-pointer">Termos de Serviço</span>
            <span className="hover:text-white transition-colors cursor-pointer">Política de Privacidade</span>
            <span className="hover:text-white transition-colors cursor-pointer">Status da Plataforma</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

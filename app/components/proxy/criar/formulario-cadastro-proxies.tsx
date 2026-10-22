import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, Info, Terminal } from 'lucide-react';
import { serviceTags } from '@/services/tags/service.tags';
import { DropdownSeletorEtiquetas } from '@/components/tags/dropdown-seletor-etiquetas';
import { TagBadge } from '@/components/tags/tag-badge';

export interface FormularioCadastroProxiesProps {
  proxyType: string;
  setProxyType: (type: string) => void;
  ipChecker: string;
  setIpChecker: (checker: string) => void;
  selectedTags: string[];
  setSelectedTags: React.Dispatch<React.SetStateAction<string[]>>;
  rawText: string;
  setRawText: (text: string) => void;
}

export const FormularioCadastroProxies: React.FC<FormularioCadastroProxiesProps> = ({
  proxyType,
  setProxyType,
  ipChecker,
  setIpChecker,
  selectedTags,
  setSelectedTags,
  rawText,
  setRawText,
}) => {
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);

  // Precarrega tags para obter cores no cache
  useEffect(() => {
    serviceTags.list().catch(console.error);
  }, []);

  const handleToggleTag = (name: string) => {
    setSelectedTags((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name],
    );
  };

  const lineCount = useMemo(() => {
    return rawText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean).length;
  }, [rawText]);

  return (
    <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12">
      {/* Coluna Esquerda: Guia & Exemplos Harmonizados */}
      <div className="flex flex-col justify-between rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#16171D] p-4.5 text-[12px] select-text shadow-xs lg:col-span-5">
        <div>
          <div className="mb-3 flex items-center gap-2 border-b border-slate-200 dark:border-white/5 pb-2.5">
            <Info size={15} className="text-emerald-600 dark:text-[#00FF66]" />
            <span className="text-[13px] font-semibold tracking-wide text-slate-900 dark:text-white">
              Guia de Preenchimento
            </span>
          </div>

          <div className="space-y-2 text-[11.5px] leading-relaxed text-slate-600 dark:text-[#9CA3AF]">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-white/5 text-[10px] font-semibold text-slate-700 dark:text-white/70">
                1
              </span>
              <p>
                Tipo padrão aplicado automaticamente caso omitido na linha do
                proxy.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-white/5 text-[10px] font-semibold text-slate-700 dark:text-white/70">
                2
              </span>
              <p>
                Protocolos suportados: <strong className="text-slate-900 dark:text-white">Socks5</strong>,{' '}
                <strong className="text-slate-900 dark:text-white">HTTP</strong>,{' '}
                <strong className="text-slate-900 dark:text-white">HTTPS</strong> e{' '}
                <strong className="text-slate-900 dark:text-white">SSH</strong>.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-white/5 text-[10px] font-semibold text-slate-700 dark:text-white/70">
                3
              </span>
              <p>Um proxy por linha (limite de até 500 proxies por importação).</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-white/5 text-[10px] font-semibold text-slate-700 dark:text-white/70">
                4
              </span>
              <p>
                Suporta IPv4 e IPv6 (hosts IPv6 devem ser colocados entre colchetes{' '}
                <code className="rounded bg-slate-200 dark:bg-[#1F2028] px-1 py-0.5 text-slate-800 dark:text-white/90">
                  [ ]
                </code>
                ).
              </p>
            </div>
          </div>
        </div>

        {/* Exemplos em Cards Minimalistas */}
        <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/5">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-slate-600 dark:text-[#A6ABB9] uppercase">
            <Terminal size={12} className="text-emerald-600 dark:text-[#00FF66]" />
            <span>Formatos Aceitos</span>
          </div>

          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="rounded-md border border-slate-200 dark:border-white/5 bg-white dark:bg-[#121318] px-2.5 py-1.5 text-slate-700 dark:text-[#C4C7D5] transition-colors hover:border-slate-300 dark:hover:border-white/15 shadow-xs">
              <span className="text-slate-500 dark:text-[#8E92A2]">host:port</span>
              <span className="text-slate-400 dark:text-white/50">{'{'}Nota{'}'}</span>
            </div>
            <div className="rounded-md border border-slate-200 dark:border-white/5 bg-white dark:bg-[#121318] px-2.5 py-1.5 text-slate-700 dark:text-[#C4C7D5] transition-colors hover:border-slate-300 dark:hover:border-white/15 shadow-xs">
              <span className="text-slate-500 dark:text-[#8E92A2]">host:port:user:pass</span>
              <span className="text-slate-400 dark:text-white/50">{'{'}Nota{'}'}</span>
            </div>
            <div className="rounded-md border border-slate-200 dark:border-white/5 bg-white dark:bg-[#121318] px-2.5 py-1.5 text-slate-700 dark:text-[#C4C7D5] transition-colors hover:border-slate-300 dark:hover:border-white/15 shadow-xs">
              <span className="text-emerald-600 dark:text-[#00FF66]/90 font-semibold">socks5://</span>
              <span className="text-slate-500 dark:text-[#8E92A2]">host:port</span>
              <span className="text-emerald-600 dark:text-[#00FF66]/80">[Link_Rotação]</span>
              <span className="text-slate-400 dark:text-white/50">{'{'}Nota{'}'}</span>
            </div>
            <div className="rounded-md border border-slate-200 dark:border-white/5 bg-white dark:bg-[#121318] px-2.5 py-1.5 text-slate-700 dark:text-[#C4C7D5] transition-colors hover:border-slate-300 dark:hover:border-white/15 shadow-xs">
              <span className="text-emerald-600 dark:text-[#00FF66]/90 font-semibold">socks5://</span>
              <span className="text-slate-500 dark:text-[#8E92A2]">user:pass@host:port</span>
              <span className="text-emerald-600 dark:text-[#00FF66]/80">[Link_Rotação]</span>
            </div>
          </div>
        </div>
      </div>

      {/* Coluna Direita: Controles e Textarea */}
      <div className="flex flex-col gap-3.5 lg:col-span-7">
        {/* Linha 1: Tipo proxy e Verificador de IP */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Tipo proxy */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-slate-600 dark:text-[#A6ABB9]">
              Tipo de Proxy
            </label>
            <div className="relative">
              <select
                value={proxyType}
                onChange={(e) => setProxyType(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#16171D] px-3.5 py-2 pr-9 text-[12.5px] font-medium text-slate-900 dark:text-white transition-all hover:border-slate-400 dark:hover:border-white/20 focus:border-emerald-500 dark:focus:border-white/60 focus:ring-1 focus:ring-emerald-500/20 dark:focus:ring-white/15 focus:outline-hidden shadow-xs"
              >
                <option value="Socks5">Socks5</option>
                <option value="HTTP">HTTP</option>
                <option value="HTTPS">HTTPS</option>
                <option value="SSH">SSH</option>
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 dark:text-[#7E8294]"
              />
            </div>
          </div>

          {/* Verificador de IP */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-slate-600 dark:text-[#A6ABB9]">
              Verificador de IP
            </label>
            <div className="relative">
              <select
                value={ipChecker}
                onChange={(e) => setIpChecker(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#16171D] px-3.5 py-2 pr-9 text-[12.5px] font-medium text-slate-900 dark:text-white transition-all hover:border-slate-400 dark:hover:border-white/20 focus:border-emerald-500 dark:focus:border-white/60 focus:ring-1 focus:ring-emerald-500/20 dark:focus:ring-white/15 focus:outline-hidden shadow-xs"
              >
                <option value="IP2Location">IP2Location</option>
                <option value="ip-api.com">ip-api.com</option>
                <option value="ipinfo.io">ipinfo.io</option>
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 dark:text-[#7E8294]"
              />
            </div>
          </div>
        </div>

        {/* Linha 2: Tags */}
        <div className="relative flex flex-col gap-1.5">
          <label className="text-[12px] font-medium text-slate-600 dark:text-[#A6ABB9]">
            Etiquetas / Tags
          </label>
          <div
            onClick={() => setTagDropdownOpen((prev) => !prev)}
            onMouseDown={(e) => e.stopPropagation()}
            className={`flex min-h-[38px] flex-1 cursor-pointer flex-wrap items-center justify-between gap-1.5 rounded-lg border px-3.5 py-1.5 text-[12.5px] text-slate-900 dark:text-white transition-all shadow-xs ${tagDropdownOpen
                ? 'border-emerald-500 ring-1 ring-emerald-500/20 dark:border-white/40 dark:ring-white/10 bg-white dark:bg-[#16171D]'
                : 'border-slate-300 dark:border-white/10 bg-white dark:bg-[#16171D] hover:border-slate-400 dark:hover:border-white/20'
              }`}
          >
            <div className="flex flex-wrap items-center gap-1.5">
              {selectedTags.length > 0 ? (
                selectedTags.map((tag) => (
                  <TagBadge
                    key={tag}
                    name={tag}
                    color={serviceTags.getColorByName(tag)}
                    onRemove={() => handleToggleTag(tag)}
                  />
                ))
              ) : (
                <span className="text-[12px] text-slate-400 dark:text-[#6C7082]">
                  Selecione ou digite para criar etiquetas...
                </span>
              )}
            </div>
            <ChevronDown
              size={14}
              className={`text-slate-400 dark:text-[#7E8294] transition-transform duration-200 ${tagDropdownOpen ? 'rotate-180 text-emerald-500 dark:text-white' : ''
                }`}
            />
          </div>

          <DropdownSeletorEtiquetas
            isOpen={tagDropdownOpen}
            onClose={() => setTagDropdownOpen(false)}
            selectedTags={selectedTags}
            onToggleTag={handleToggleTag}
            fullWidth
          />
        </div>

        {/* Linha 3: Textarea com Contador */}
        <div className="flex flex-1 flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[12px] font-medium text-slate-600 dark:text-[#A6ABB9]">
              Lista de Proxies
            </label>
            <span className="text-[11px] text-slate-500 dark:text-[#7E8294]">
              {lineCount} {lineCount === 1 ? 'linha' : 'linhas'} (máx 500)
            </span>
          </div>
          <div className="relative flex-1">
            <textarea
              rows={5}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Cole seus proxies aqui (um por linha)...&#10;ex: 192.168.0.1:8080:usuario:senha{Meu Proxy}"
              className="h-[140px] w-full resize-none rounded-xl border border-slate-300 dark:border-white/10 bg-white dark:bg-[#16171D] p-3.5 font-mono text-[12.5px] leading-relaxed text-slate-900 dark:text-[#E1E4EE] placeholder-slate-400 dark:placeholder-[#5A5E6D] transition-all hover:border-slate-400 dark:hover:border-white/20 focus:border-emerald-500 dark:focus:border-white/60 focus:ring-1 focus:ring-emerald-500/20 dark:focus:ring-white/15 focus:outline-hidden shadow-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormularioCadastroProxies;

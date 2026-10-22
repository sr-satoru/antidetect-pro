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
      <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 dark:border-[#2D3039] bg-[#F8F7F5] dark:bg-[#1F2026] p-4.5 text-[12px] select-text shadow-xs lg:col-span-5">
        <div>
          <div className="mb-3 flex items-center gap-2 border-b border-slate-200/80 dark:border-[#2D3039] pb-2.5">
            <Info size={15} className="text-[#7C3AED] dark:text-[#A78BFA]" />
            <span className="text-xs font-semibold tracking-wide text-slate-900 dark:text-white">
              Guia de Preenchimento
            </span>
          </div>

          <div className="space-y-2 text-[11.5px] leading-relaxed text-slate-600 dark:text-[#9DA2B4]">
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-[#1F2026] text-[10px] font-semibold text-slate-700 dark:text-white/80">
                1
              </span>
              <p>
                Tipo padrão aplicado automaticamente caso omitido na linha do
                proxy.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-[#1F2026] text-[10px] font-semibold text-slate-700 dark:text-white/80">
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
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-[#1F2026] text-[10px] font-semibold text-slate-700 dark:text-white/80">
                3
              </span>
              <p>Um proxy por linha (limite de até 500 proxies por importação).</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-[#1F2026] text-[10px] font-semibold text-slate-700 dark:text-white/80">
                4
              </span>
              <p>
                Suporta IPv4 e IPv6 (hosts IPv6 devem ser colocados entre colchetes{' '}
                <code className="rounded bg-slate-200 dark:bg-[#1F2026] px-1 py-0.5 text-slate-800 dark:text-white/90">
                  [ ]
                </code>
                ).
              </p>
            </div>
          </div>
        </div>

        {/* Exemplos em Cards Minimalistas */}
        <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-[#2D3039]">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-slate-600 dark:text-[#9DA2B4] uppercase">
            <Terminal size={12} className="text-[#7C3AED] dark:text-[#A78BFA]" />
            <span>Formatos Aceitos</span>
          </div>

          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="rounded-lg border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#18191E] px-2.5 py-1.5 text-slate-700 dark:text-[#E2E4EC] transition-colors hover:border-slate-300 dark:hover:border-[#4B5063] shadow-xs">
              <span className="text-slate-500 dark:text-[#9DA2B4]">host:port</span>
              <span className="text-slate-400 dark:text-white/50">{'{'}Nota{'}'}</span>
            </div>
            <div className="rounded-lg border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#18191E] px-2.5 py-1.5 text-slate-700 dark:text-[#E2E4EC] transition-colors hover:border-slate-300 dark:hover:border-[#4B5063] shadow-xs">
              <span className="text-slate-500 dark:text-[#9DA2B4]">host:port:user:pass</span>
              <span className="text-slate-400 dark:text-white/50">{'{'}Nota{'}'}</span>
            </div>
            <div className="rounded-lg border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#18191E] px-2.5 py-1.5 text-slate-700 dark:text-[#E2E4EC] transition-colors hover:border-slate-300 dark:hover:border-[#4B5063] shadow-xs">
              <span className="text-[#2ea043] font-semibold">socks5://</span>
              <span className="text-slate-500 dark:text-[#9DA2B4]">host:port</span>
              <span className="text-[#2ea043]">[Link_Rotação]</span>
              <span className="text-slate-400 dark:text-white/50">{'{'}Nota{'}'}</span>
            </div>
            <div className="rounded-lg border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#18191E] px-2.5 py-1.5 text-slate-700 dark:text-[#E2E4EC] transition-colors hover:border-slate-300 dark:hover:border-[#4B5063] shadow-xs">
              <span className="text-[#2ea043] font-semibold">socks5://</span>
              <span className="text-slate-500 dark:text-[#9DA2B4]">user:pass@host:port</span>
              <span className="text-[#2ea043]">[Link_Rotação]</span>
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
            <label className="text-xs font-medium text-slate-600 dark:text-[#9DA2B4]">
              Tipo de Proxy
            </label>
            <div className="relative">
              <select
                value={proxyType}
                onChange={(e) => setProxyType(e.target.value)}
                className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] px-3.5 pr-9 text-xs font-medium text-slate-900 dark:text-white transition-all hover:border-slate-400 dark:hover:border-[#4B5063] focus:outline-hidden shadow-2xs"
              >
                <option value="Socks5">Socks5</option>
                <option value="HTTP">HTTP</option>
                <option value="HTTPS">HTTPS</option>
                <option value="SSH">SSH</option>
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 dark:text-[#9DA2B4]"
              />
            </div>
          </div>

          {/* Verificador de IP */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-600 dark:text-[#9DA2B4]">
              Verificador de IP
            </label>
            <div className="relative">
              <select
                value={ipChecker}
                onChange={(e) => setIpChecker(e.target.value)}
                className="h-9 w-full cursor-pointer appearance-none rounded-lg border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] px-3.5 pr-9 text-xs font-medium text-slate-900 dark:text-white transition-all hover:border-slate-400 dark:hover:border-[#4B5063] focus:outline-hidden shadow-2xs"
              >
                <option value="IP2Location">IP2Location</option>
                <option value="ip-api.com">ip-api.com</option>
                <option value="ipinfo.io">ipinfo.io</option>
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 dark:text-[#9DA2B4]"
              />
            </div>
          </div>
        </div>

        {/* Linha 2: Tags */}
        <div className="relative flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-600 dark:text-[#9DA2B4]">
            Etiquetas / Tags
          </label>
          <div
            onClick={() => setTagDropdownOpen((prev) => !prev)}
            onMouseDown={(e) => e.stopPropagation()}
            className={`flex min-h-[36px] flex-1 cursor-pointer flex-wrap items-center justify-between gap-1.5 rounded-lg border px-3.5 py-1 text-xs text-slate-900 dark:text-white transition-all shadow-2xs ${
              tagDropdownOpen
                ? 'border-slate-400 dark:border-[#72768A] bg-white dark:bg-[#1F2026]'
                : 'border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] hover:border-slate-400 dark:hover:border-[#4B5063]'
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
                <span className="text-xs text-slate-400 dark:text-[#9DA2B4]">
                  Selecione ou digite para criar etiquetas...
                </span>
              )}
            </div>
            <ChevronDown
              size={14}
              className={`text-slate-400 dark:text-[#9DA2B4] transition-transform duration-200 ${
                tagDropdownOpen ? 'rotate-180 text-slate-700 dark:text-white' : ''
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
            <label className="text-xs font-medium text-slate-600 dark:text-[#9DA2B4]">
              Lista de Proxies
            </label>
            <span className="text-[11px] text-slate-500 dark:text-[#9DA2B4]">
              {lineCount} {lineCount === 1 ? 'linha' : 'linhas'} (máx 500)
            </span>
          </div>
          <div className="relative flex-1">
            <textarea
              rows={5}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Cole seus proxies aqui (um por linha)...&#10;ex: 192.168.0.1:8080:usuario:senha{Meu Proxy}"
              className="h-[140px] w-full resize-none rounded-xl border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] p-3.5 font-mono text-xs leading-relaxed text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#6C7284] transition-all hover:border-slate-400 dark:hover:border-[#4B5063] focus:outline-hidden shadow-2xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FormularioCadastroProxies;

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, Check, Plus, Info, Terminal } from 'lucide-react';
import { serviceTags, TagItem } from '@/services/tags/service.tags';

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
  const [availableTags, setAvailableTags] = useState<TagItem[]>([]);
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  // Carrega tags disponíveis do backend
  useEffect(() => {
    serviceTags
      .list()
      .then((list) => {
        setAvailableTags(Array.isArray(list) ? list : []);
      })
      .catch(console.error);
  }, []);

  // Fecha dropdown de tags ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        tagDropdownRef.current &&
        !tagDropdownRef.current.contains(e.target as Node)
      ) {
        setTagDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredTags = useMemo(() => {
    if (!tagSearch.trim()) return availableTags;
    return availableTags.filter((t) =>
      t.name.toLowerCase().includes(tagSearch.toLowerCase()),
    );
  }, [availableTags, tagSearch]);

  const handleToggleTag = (name: string) => {
    setSelectedTags((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name],
    );
  };

  const handleCreateTag = async () => {
    if (!tagSearch.trim()) return;
    try {
      const newTag = await serviceTags.create({
        name: tagSearch.trim(),
        color: '#00FF66',
      });
      setAvailableTags((prev) => [...prev, newTag]);
      setSelectedTags((prev) => [...prev, newTag.name]);
      setTagSearch('');
    } catch {
      // Ignora silenciosamente
    }
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
        <div className="relative flex flex-col gap-1.5" ref={tagDropdownRef}>
          <label className="text-[12px] font-medium text-slate-600 dark:text-[#A6ABB9]">
            Etiquetas / Tags
          </label>
          <div
            onClick={() => setTagDropdownOpen((prev) => !prev)}
            className="flex min-h-[38px] flex-1 cursor-pointer flex-wrap items-center justify-between gap-1.5 rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#16171D] px-3.5 py-1.5 text-[12.5px] text-slate-900 dark:text-white transition-all hover:border-slate-400 dark:hover:border-white/20 shadow-xs"
          >
            <div className="flex flex-wrap items-center gap-1.5">
              {selectedTags.length > 0 ? (
                selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-white/10 bg-slate-100 text-slate-800 dark:bg-[#242632] dark:text-white px-2.5 py-1 text-[11px] font-medium shadow-2xs"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleTag(tag);
                      }}
                      className="cursor-pointer text-slate-400 hover:text-slate-700 dark:text-[#8E92A2] dark:hover:text-white"
                    >
                      ×
                    </button>
                  </span>
                ))
              ) : (
                <span className="text-[12px] text-slate-400 dark:text-[#6C7082]">
                  Selecione ou digite para criar etiquetas...
                </span>
              )}
            </div>
            <ChevronDown size={14} className="text-slate-400 dark:text-[#7E8294]" />
          </div>

          {/* Dropdown de Tags */}
          {tagDropdownOpen && (
            <div className="absolute top-full right-0 left-0 z-30 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-[#171820] p-2 shadow-xl animate-in fade-in zoom-in-95 duration-100">
              <input
                type="text"
                placeholder="Pesquisar ou criar etiqueta..."
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateTag();
                  }
                }}
                className="mb-2 w-full rounded-lg border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-[#101116] px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#6C7082] focus:border-emerald-500 dark:focus:border-white/60 focus:ring-1 focus:ring-emerald-500/20 dark:focus:ring-white/15 focus:outline-hidden"
              />

              <div className="space-y-1">
                {filteredTags.map((t) => {
                  const isSelected = selectedTags.includes(t.name);
                  return (
                    <div
                      key={t.id || t.name}
                      onClick={() => handleToggleTag(t.name)}
                      className={`flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors ${
                        isSelected
                          ? 'bg-emerald-50 text-emerald-700 font-medium dark:bg-[#252835] dark:text-white'
                          : 'text-slate-700 dark:text-[#C8CBD4] hover:bg-slate-100 dark:hover:bg-[#20222B] hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: t.color || '#00FF66' }}
                        />
                        {t.name}
                      </span>
                      {isSelected && (
                        <Check size={13} className="text-emerald-600 dark:text-[#00FF66]" />
                      )}
                    </div>
                  );
                })}

                {tagSearch.trim() &&
                  !filteredTags.some(
                    (t) =>
                      t.name.toLowerCase() ===
                      tagSearch.trim().toLowerCase(),
                  ) && (
                    <div
                      onClick={handleCreateTag}
                      className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:text-[#00FF66] dark:hover:bg-[#00FF66]/10 transition-colors"
                    >
                      <Plus size={13} />
                      <span>Criar etiqueta &quot;{tagSearch.trim()}&quot;</span>
                    </div>
                  )}
              </div>
            </div>
          )}
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

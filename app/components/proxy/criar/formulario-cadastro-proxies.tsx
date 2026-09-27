import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, Check, Plus } from 'lucide-react';
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
        color: '#1677FF',
      });
      setAvailableTags((prev) => [...prev, newTag]);
      setSelectedTags((prev) => [...prev, newTag.name]);
      setTagSearch('');
    } catch {
      // Ignora silenciosamente
    }
  };

  return (
    <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12">
      {/* Coluna Esquerda: Nota de Ajuda */}
      <div className="flex flex-col justify-between rounded-lg border border-[#2E303A] bg-[#17181D] p-4 text-[12px] leading-relaxed select-text lg:col-span-5">
        <div>
          <div className="mb-2 font-medium text-[#C8CBD4]">Nota:</div>
          <div className="space-y-1 text-[11.5px] leading-snug text-[#9CA3AF]">
            <p>
              1. Se o tipo de proxy não estiver preenchido, ele será
              adicionado de acordo com o tipo de proxy configurado;
            </p>
            <p>
              2. O tipo de proxy suporta apenas HTTP, HTTPS, SSH e Socks5;
            </p>
            <p>
              3. Um proxy por linha, até 500 podem ser adicionados de uma vez;
            </p>
            <p>
              4. Suporta IPv4 e IPv6, e o host IPv6 deve ser preenchido em [ ].
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-1 font-mono text-[11px] text-[#2F80ED]">
          <p className="mb-1 font-sans text-xs font-medium text-[#2F80ED]">
            Suporte aos seguintes formatos de preenchimento:
          </p>
          <p className="break-all">192.168.0.1:8000&#123;Observação&#125;</p>
          <p className="break-all">
            192.168.0.1:8000:username:password&#123;Observação&#125;
          </p>
          <p className="break-all">
            socks5://192.168.0.1:8000[Mudar o URL IP]&#123;Observação&#125;
          </p>
          <p className="break-all">
            http://[2001:db8:2de:0:0:0:0:e13]:8000[Mudar o URL
            IP]&#123;Observação&#125;
          </p>
          <p className="break-all">
            socks5://username:password@192.168.0.1:8000[Mudar o URL
            IP]&#123;Observação&#125;
          </p>
        </div>
      </div>

      {/* Coluna Direita: Controles e Textarea */}
      <div className="flex flex-col gap-3 lg:col-span-7">
        {/* Linha 1: Tipo proxy e Verificador de IP */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {/* Tipo proxy */}
          <div className="flex items-center gap-2">
            <label className="shrink-0 text-xs text-[#8E92A2]">Tipo proxy</label>
            <div className="relative flex-1">
              <select
                value={proxyType}
                onChange={(e) => setProxyType(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-md border border-[#2E303A] bg-[#17181D] px-3 py-1.5 pr-8 text-xs text-[#E1E4EE] transition-colors hover:border-[#3E4150] focus:border-[#2F80ED] focus:outline-hidden"
              >
                <option value="Socks5">Socks5</option>
                <option value="HTTP">HTTP</option>
                <option value="HTTPS">HTTPS</option>
                <option value="SSH">SSH</option>
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[#6C6F7E]"
              />
            </div>
          </div>

          {/* Verificador de IP */}
          <div className="flex items-center gap-2">
            <label className="shrink-0 text-xs text-[#8E92A2]">Verificador de IP</label>
            <div className="relative flex-1">
              <select
                value={ipChecker}
                onChange={(e) => setIpChecker(e.target.value)}
                className="w-full cursor-pointer appearance-none rounded-md border border-[#2E303A] bg-[#17181D] px-3 py-1.5 pr-8 text-xs text-[#E1E4EE] transition-colors hover:border-[#3E4150] focus:border-[#2F80ED] focus:outline-hidden"
              >
                <option value="IP2Location">IP2Location</option>
                <option value="ip-api.com">ip-api.com</option>
                <option value="ipinfo.io">ipinfo.io</option>
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-[#6C6F7E]"
              />
            </div>
          </div>
        </div>

        {/* Linha 2: Tags */}
        <div className="relative flex items-center gap-2" ref={tagDropdownRef}>
          <label className="w-[72px] shrink-0 text-xs text-[#8E92A2] sm:w-[65px]">
            Tags
          </label>
          <div
            onClick={() => setTagDropdownOpen((prev) => !prev)}
            className="flex min-h-[32px] flex-1 cursor-pointer flex-wrap items-center justify-between gap-1.5 rounded-md border border-[#2E303A] bg-[#17181D] px-3 py-1 text-xs text-[#E1E4EE] transition-colors hover:border-[#3E4150]"
          >
            <div className="flex flex-wrap items-center gap-1">
              {selectedTags.length > 0 ? (
                selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 rounded bg-[#272935] px-2 py-0.5 text-[11px] text-[#A6ABB9]"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleTag(tag);
                      }}
                      className="text-[#6C6F7E] hover:text-white"
                    >
                      ×
                    </button>
                  </span>
                ))
              ) : (
                <span className="text-xs text-[#5A5E6D]">
                  Encontrar uma etiqueta / Criar uma etiqueta
                </span>
              )}
            </div>
            <ChevronDown size={14} className="text-[#6C6F7E]" />
          </div>

          {/* Dropdown de Tags */}
          {tagDropdownOpen && (
            <div className="absolute top-full left-[72px] z-30 mt-1 max-h-56 w-[calc(100%-72px)] overflow-y-auto rounded-lg border border-[#363847] bg-[#17181D] p-2 shadow-xl sm:left-[65px] sm:w-[calc(100%-65px)]">
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
                className="mb-2 w-full rounded border border-[#2C2E38] bg-[#121318] px-2.5 py-1 text-xs text-white placeholder-[#5A5E6D] focus:border-[#2F80ED] focus:outline-hidden"
              />

              <div className="space-y-1">
                {filteredTags.map((t) => {
                  const isSelected = selectedTags.includes(t.name);
                  return (
                    <div
                      key={t.id || t.name}
                      onClick={() => handleToggleTag(t.name)}
                      className="flex cursor-pointer items-center justify-between rounded px-2 py-1 text-xs text-[#C8CBD4] hover:bg-[#252733]"
                    >
                      <span className="flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: t.color || '#1677FF' }}
                        />
                        {t.name}
                      </span>
                      {isSelected && (
                        <Check size={13} className="text-[#2F80ED]" />
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
                      className="flex cursor-pointer items-center gap-1 rounded px-2 py-1 text-xs text-[#2F80ED] hover:bg-[#252733]"
                    >
                      <Plus size={12} />
                      <span>Criar "{tagSearch.trim()}"</span>
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>

        {/* Linha 3: Textarea */}
        <div className="flex-1">
          <textarea
            rows={5}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Por favor, insira suas informações de proxy aqui. Elas serão automaticamente analisadas e preenchidas."
            className="h-[125px] w-full resize-none rounded-md border border-[#2E303A] bg-[#17181D] p-3 font-mono text-xs leading-relaxed text-[#E1E4EE] placeholder-[#5A5E6D] transition-colors hover:border-[#3E4150] focus:border-[#2F80ED] focus:outline-hidden"
          />
        </div>
      </div>
    </div>
  );
};

export default FormularioCadastroProxies;

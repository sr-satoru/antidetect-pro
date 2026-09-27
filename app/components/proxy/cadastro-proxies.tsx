import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Search,
  ChevronDown,
  Loader2,
  Trash2,
  Plus,
  Check,
} from 'lucide-react';
import { serviceTags, TagItem } from '@/services/tags/service.tags';
import { api } from '@/services/index.api';

interface CadastroProxiesProps {
  onClose: () => void;
  onSave: (data: any | any[]) => void;
}

export interface ParsedProxyItem {
  id: string;
  type: string;
  host: string;
  port: string;
  user: string;
  pass: string;
  rotationLink: string;
  notes: string;
  outboundIp: string;
  isValid: boolean;
  status:
    | 'idle'
    | 'checking'
    | 'active'
    | 'auth_error'
    | 'connection_error'
    | 'timeout'
    | 'error';
  ping?: number;
}

function isValidHostAddress(host: string): boolean {
  const clean = host.trim().replace(/^\[|\]$/g, '');
  if (!clean) return false;

  // 1. IPv4 (4 números de 0 a 255)
  const ipv4Parts = clean.split('.');
  if (ipv4Parts.length === 4) {
    const isIpv4 = ipv4Parts.every((part) => {
      if (!/^\d+$/.test(part)) return false;
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
    if (isIpv4) return true;
  }

  // 2. IPv6 (contém múltiplos colons e caracteres hexadecimais)
  if (clean.includes(':') && /^[0-9a-fA-F:]+$/.test(clean)) {
    return true;
  }

  // 3. Nome de domínio / hostname válido ou localhost
  if (/^([a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/.test(clean) || clean.toLowerCase() === 'localhost') {
    return true;
  }

  return false;
}

function isValidPortNumber(port: string): boolean {
  if (!/^\d+$/.test(port.trim())) return false;
  const num = parseInt(port.trim(), 10);
  return num >= 1 && num <= 65535;
}

function parseProxyLine(
  rawLine: string,
  defaultType: string = 'Socks5',
): ParsedProxyItem | null {
  let str = rawLine.trim();
  if (!str) return null;

  // 1. Extrair Notas {Observação}
  let notes = '';
  const notesMatch = str.match(/\{([^}]+)\}/);
  if (notesMatch) {
    notes = notesMatch[1].trim();
    str = str.replace(notesMatch[0], '').trim();
  }

  // 2. Extrair URL de Rotação [Mudar o URL IP] se não for o host IPv6
  let rotationLink = '';
  const bracketMatches = Array.from(str.matchAll(/\[([^\]]+)\]/g));
  for (const m of bracketMatches) {
    const content = m[1];
    const isIpv6 = content.includes(':') && /^[0-9a-fA-F:]+$/.test(content);
    if (!isIpv6) {
      rotationLink = content.trim();
      str = str.replace(m[0], '').trim();
    }
  }

  // 3. Extrair Protocolo tipo://
  let pType = defaultType.toLowerCase();
  if (str.includes('://')) {
    const parts = str.split('://');
    pType = parts[0].toLowerCase().trim();
    str = parts.slice(1).join('://').trim();
  }

  // 4. Credenciais e Host/Porta
  let user = '';
  let pass = '';
  let host = '';
  let port = '';

  if (str.includes('@')) {
    const atIdx = str.lastIndexOf('@');
    const authPart = str.substring(0, atIdx);
    const hostPart = str.substring(atIdx + 1);

    const authSplit = authPart.split(':');
    user = authSplit[0] || '';
    pass = authSplit.slice(1).join(':') || '';

    if (hostPart.startsWith('[') && hostPart.includes(']:')) {
      const closeIdx = hostPart.indexOf(']:');
      host = hostPart.substring(0, closeIdx + 1);
      port = hostPart.substring(closeIdx + 2);
    } else {
      const hSplit = hostPart.split(':');
      host = hSplit[0] || '';
      port = hSplit[1] || '';
    }
  } else if (str.startsWith('[') && str.includes(']:')) {
    const closeIdx = str.indexOf(']:');
    host = str.substring(0, closeIdx + 1);
    const rest = str.substring(closeIdx + 2).split(':');
    port = rest[0] || '';
    user = rest[1] || '';
    pass = rest.slice(2).join(':') || '';
  } else {
    const parts = str.split(':');
    host = parts[0] || '';
    port = parts[1] || '';
    user = parts[2] || '';
    pass = parts[3] || '';
  }

  if (!host && !port) return null;

  const validTypes = ['socks5', 'http', 'https', 'ssh'];
  const finalType = validTypes.includes(pType.toLowerCase())
    ? pType.toLowerCase()
    : defaultType.toLowerCase();

  const isHostValid = isValidHostAddress(host);
  const isPortValid = isValidPortNumber(port);
  const isValid = isHostValid && isPortValid;

  return {
    id: Math.random().toString(36).substring(2, 9),
    type: finalType,
    host: host.trim(),
    port: port.trim(),
    user: user.trim(),
    pass: pass.trim(),
    rotationLink: rotationLink.trim(),
    notes: notes.trim(),
    outboundIp: '-',
    isValid,
    status: 'idle',
  };
}

export const CadastroProxies: React.FC<CadastroProxiesProps> = ({
  onClose,
  onSave,
}) => {
  const [proxyType, setProxyType] = useState('Socks5');
  const [ipChecker, setIpChecker] = useState('IP2Location');
  const [checkDuplicates, setCheckDuplicates] = useState(true);
  const [rawText, setRawText] = useState('');
  const [parsedList, setParsedList] = useState<ParsedProxyItem[]>([]);
  const [isChecking, setIsChecking] = useState(false);

  // Tags state
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<TagItem[]>([]);
  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  // Carrega tags disponíveis do backend
  useEffect(() => {
    serviceTags.list().then((list) => {
      setAvailableTags(Array.isArray(list) ? list : []);
    }).catch(console.error);
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

  // Atualiza a lista de proxies parseados ao alterar o texto, tipo ou duplicatas
  useEffect(() => {
    const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
    const result: ParsedProxyItem[] = [];
    const seen = new Set<string>();

    for (const line of lines) {
      const item = parseProxyLine(line, proxyType);
      if (item) {
        const key = `${item.host}:${item.port}`.toLowerCase();
        if (checkDuplicates) {
          if (seen.has(key)) continue;
          seen.add(key);
        }
        result.push(item);
      }
    }

    setParsedList(result);
  }, [rawText, proxyType, checkDuplicates]);

  // Verifica se há pelo menos um proxy com URL/parâmetros válidos
  const hasValidProxies = useMemo(() => {
    return parsedList.some((p) => p.isValid);
  }, [parsedList]);

  // Testar proxies no backend através do módulo desacoplado de validação real
  const handleTestAll = async () => {
    const validItems = parsedList.filter((p) => p.isValid);
    if (validItems.length === 0 || isChecking) return;

    setIsChecking(true);
    try {
      for (let i = 0; i < parsedList.length; i++) {
        const current = parsedList[i];
        if (!current.isValid) continue;

        setParsedList((prev) =>
          prev.map((item, idx) =>
            idx === i
              ? { ...item, status: 'checking', outboundIp: 'Testando...' }
              : item,
          ),
        );

        try {
          const res = await api.proxies.test({
            type: current.type,
            host: current.host.replace(/[\[\]]/g, ''),
            port: Number(current.port),
            username: current.user || undefined,
            password: current.pass || undefined,
          });

          const status = res.status;
          let display = '-';
          let finalStatus: ParsedProxyItem['status'] = 'error';

          if (status === 'active' || status === 'success') {
            finalStatus = 'active';
            const latencyStr = res.latency_ms ? ` (${res.latency_ms}ms)` : '';
            display = `${res.exit_ip || current.host}${latencyStr}`;
          } else if (status === 'auth_error') {
            finalStatus = 'auth_error';
            display = 'Erro autenticação';
          } else if (status === 'timeout') {
            finalStatus = 'timeout';
            display = 'Tempo esgotado';
          } else if (status === 'connection_error') {
            finalStatus = 'connection_error';
            display = 'Falha conexão';
          } else {
            finalStatus = 'error';
            display = res.message || 'Erro';
          }

          setParsedList((prev) =>
            prev.map((item, idx) =>
              idx === i
                ? {
                    ...item,
                    status: finalStatus,
                    outboundIp: display,
                    ping: res.latency_ms ?? item.ping,
                  }
                : item,
            ),
          );
        } catch {
          setParsedList((prev) =>
            prev.map((item, idx) =>
              idx === i
                ? { ...item, status: 'error', outboundIp: 'Erro conexão' }
                : item,
            ),
          );
        }
      }
    } finally {
      setIsChecking(false);
    }
  };

  const handleRemoveRow = (index: number) => {
    setParsedList((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = () => {
    const validItems = parsedList.filter((p) => p.isValid);
    if (validItems.length === 0) return;

    const payloads = validItems.map((item) => ({
      name: item.notes || `Proxy ${item.host}:${item.port}`,
      type: item.type,
      host: item.host.replace(/[\[\]]/g, ''),
      port: item.port,
      user: item.user,
      pass: item.pass,
      rotationLink: item.rotationLink,
      ip:
        item.outboundIp &&
        item.outboundIp !== '-' &&
        !item.outboundIp.includes('Erro') &&
        !item.outboundIp.includes('Falha') &&
        !item.outboundIp.includes('Tempo')
          ? item.outboundIp.split(' ')[0]
          : item.host.replace(/[\[\]]/g, ''),
      country: 'BR - Brasil',
      status: item.status === 'active' ? 'active' : 'active',
      ping: item.ping || 45,
      tags: selectedTags,
      lastChecked: new Date()
        .toISOString()
        .substring(5, 19)
        .replace('T', ' '),
      usageCount: 0,
      createdAt: new Date().toISOString().substring(5, 19).replace('T', ' '),
    }));

    onSave(payloads);
    onClose();
  };

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
      // Ignora silenciosamente sem toasts
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-[#1E1F24] text-[#D1D5DB]">
      {/* Top Header / Bar */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#2C2E38] bg-[#17181D] px-6 select-none">
        <span className="text-xs font-semibold text-white">
          Adicionar Proxy
        </span>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-md p-1.5 text-[#8E92A2] transition-colors hover:bg-[#282932] hover:text-white"
          title="Fechar"
        >
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 flex-col space-y-4 overflow-y-auto p-5 select-text [scrollbar-color:#3E4150_#1E1F24] [scrollbar-width:thin]">
        {/* Grid Superior: Nota informativa à esquerda e Controles/Textarea à direita */}
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
                  3. Um proxy por linha, até 500 podem ser adicionados de uma
                  vez;
                </p>
                <p>
                  4. Suporta IPv4 e IPv6, e o host IPv6 deve ser preenchido
                  em [ ].
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
                <label className="shrink-0 text-xs text-[#8E92A2]">
                  Tipo proxy
                </label>
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
                <label className="shrink-0 text-xs text-[#8E92A2]">
                  Verificador de IP
                </label>
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

        {/* Barra de Ações: Verificar proxy, Verificar duplicatas, Agentes adicionados */}
        <div className="flex flex-wrap items-center gap-4 border-t border-[#2C2E38] pt-2 select-none">
          <button
            type="button"
            onClick={handleTestAll}
            disabled={!hasValidProxies || isChecking}
            className="flex cursor-pointer items-center gap-1.5 rounded-full border border-[#383A46] bg-[#1C1D23] px-3.5 py-1 text-xs font-medium text-[#A0A5B5] transition-colors hover:bg-[#282A33] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            title={
              hasValidProxies
                ? 'Testar conexões com os proxies informados'
                : 'Insira ao menos um formato de proxy válido para verificar'
            }
          >
            {isChecking ? (
              <Loader2 size={13} className="animate-spin text-[#2F80ED]" />
            ) : (
              <Search size={13} />
            )}
            <span>Verificar proxy</span>
          </button>

          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[#A0A5B5] select-none hover:text-white">
            <input
              type="checkbox"
              checked={checkDuplicates}
              onChange={(e) => setCheckDuplicates(e.target.checked)}
              className="h-3.5 w-3.5 cursor-pointer rounded accent-[#1677FF]"
            />
            <span className="border-b border-dotted border-[#6C6F7E]">
              Verificar duplicatas
            </span>
          </label>

          <span className="text-xs text-[#8E92A2]">
            Agentes adicionados:{parsedList.length}
          </span>
        </div>

        {/* Tabela de Visualização dos Proxies Analisados */}
        <div className="max-h-[260px] min-h-[170px] overflow-x-auto overflow-y-auto rounded-md border border-[#2C2E38] bg-[#17181D] [scrollbar-color:#3E4150_#17181D] [scrollbar-width:thin]">
          <table className="w-full border-collapse text-left text-xs whitespace-nowrap">
            <thead className="sticky top-0 z-10 border-b border-[#2C2E38] bg-[#1B1C22] text-[11px] font-medium text-[#8E92A2] select-none">
              <tr className="h-8">
                <th className="px-3 py-1.5 font-normal">Tipo de P...</th>
                <th className="px-3 py-1.5 font-normal">Máquina de Proxy</th>
                <th className="px-3 py-1.5 font-normal">Porta d...</th>
                <th className="px-3 py-1.5 font-normal">
                  Nome do utilizador do proxy
                </th>
                <th className="px-3 py-1.5 font-normal">Senha do Proxy</th>
                <th className="px-3 py-1.5 font-normal">Mudar o URL IP</th>
                <th className="px-3 py-1.5 font-normal">Notas</th>
                <th className="px-3 py-1.5 font-normal">Outbound IP</th>
                <th className="w-8 px-2 py-1.5 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#242630]">
              {parsedList.length > 0 ? (
                parsedList.map((item, idx) => (
                  <tr
                    key={item.id}
                    className="group transition-colors hover:bg-[#1E2028]"
                  >
                    <td className="px-3 py-2 text-white uppercase">
                      {item.type}
                    </td>
                    <td className="px-3 py-2 font-mono text-[#D2D5DF]">
                      {item.host}
                    </td>
                    <td className="px-3 py-2 font-mono text-[#D2D5DF]">
                      {item.port}
                    </td>
                    <td className="px-3 py-2 text-[#9CA3AF]">
                      {item.user || '-'}
                    </td>
                    <td className="px-3 py-2 font-mono text-[#9CA3AF]">
                      {item.pass ? '••••••' : '-'}
                    </td>
                    <td className="max-w-[150px] truncate px-3 py-2 font-mono text-xs text-[#2F80ED]">
                      {item.rotationLink || '-'}
                    </td>
                    <td className="max-w-[120px] truncate px-3 py-2 text-[#9CA3AF]">
                      {item.notes || '-'}
                    </td>
                    <td className="px-3 py-2">
                      {!item.isValid ? (
                        <span className="text-[11px] font-medium text-[#eab308]">
                          Formato inválido
                        </span>
                      ) : item.status === 'checking' ? (
                        <span className="flex items-center gap-1 text-[#2F80ED]">
                          <Loader2 size={11} className="animate-spin" />
                          Testando...
                        </span>
                      ) : item.status === 'active' ? (
                        <span className="flex items-center gap-1 font-mono text-[#10b981]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
                          {item.outboundIp}
                        </span>
                      ) : item.status === 'auth_error' ? (
                        <span
                          className="flex items-center gap-1 font-mono text-[#f59e0b]"
                          title="Erro de autenticação: usuário ou senha incorretos"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]" />
                          Erro autenticação
                        </span>
                      ) : item.status === 'timeout' ? (
                        <span
                          className="flex items-center gap-1 font-mono text-[#f97316]"
                          title="Tempo limite esgotado"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-[#f97316]" />
                          Tempo esgotado
                        </span>
                      ) : item.status === 'connection_error' ? (
                        <span
                          className="flex items-center gap-1 font-mono text-[#ef4444]"
                          title="Falha de conexão: host inacessível ou porta fechada"
                        >
                          <span className="h-1.5 w-1.5 rounded-full bg-[#ef4444]" />
                          Falha conexão
                        </span>
                      ) : item.status === 'error' ? (
                        <span className="flex items-center gap-1 font-mono text-[#ef4444]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#ef4444]" />
                          {item.outboundIp}
                        </span>
                      ) : (
                        <span className="text-[#6C6F7E]">-</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(idx)}
                        className="opacity-0 transition-opacity group-hover:opacity-100 text-[#6C6F7E] hover:text-[#ef4444]"
                        title="Remover linha"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="h-28 text-center text-[#5A5E6D]">
                    {/* Área escura como na imagem de referência */}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer do Modal */}
      <div className="flex h-14 shrink-0 items-center justify-start gap-3 border-t border-[#2C2E38] bg-[#17181D] px-6 select-none">
        <button
          type="button"
          onClick={handleSave}
          disabled={!hasValidProxies}
          className="flex cursor-pointer items-center justify-center rounded-md bg-[#1677FF] px-6 py-1.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-[#4096FF] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
        >
          OK
        </button>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-md px-4 py-1.5 text-xs font-medium text-[#8E92A2] transition-colors hover:bg-[#282932] hover:text-white"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default CadastroProxies;

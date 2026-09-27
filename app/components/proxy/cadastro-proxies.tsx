import React, { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import { api } from '@/services/index.api';
import { FormularioCadastroProxies } from './formulario-cadastro-proxies';
import { TabelaPreviaProxies } from './tabela-previa-proxies';
import {
  ParsedProxyItem,
  parseProxyLine,
  formatProxyTestResult,
} from '@/utils/proxy-utils';

export type { ParsedProxyItem } from '@/utils/proxy-utils';

export interface CadastroProxiesProps {
  onClose: () => void;
  onSave: (data: any | any[]) => void;
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
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

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

  // Verifica se há pelo menos um proxy com formato válido
  const hasValidProxies = useMemo(() => {
    return parsedList.some((p) => p.isValid);
  }, [parsedList]);

  // Testar todos os proxies válidos em lote no backend Rust
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

          const formatted = formatProxyTestResult(res, current.host);

          setParsedList((prev) =>
            prev.map((item, idx) =>
              idx === i
                ? {
                    ...item,
                    status: formatted.status,
                    outboundIp: formatted.text,
                    ping: formatted.latencyMs ?? item.ping,
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

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-[#1E1F24] text-[#D1D5DB]">
      {/* Top Header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#2C2E38] bg-[#17181D] px-6 select-none">
        <span className="text-xs font-semibold text-white">Adicionar Proxy</span>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-md p-1.5 text-[#8E92A2] transition-colors hover:bg-[#282932] hover:text-white"
          title="Fechar"
        >
          <X size={16} />
        </button>
      </div>

      {/* Body: Formulário Superior e Tabela de Prévia Inferior */}
      <div className="flex min-h-0 flex-1 flex-col space-y-4 overflow-y-auto p-5 select-text [scrollbar-color:#3E4150_#1E1F24] [scrollbar-width:thin]">
        <FormularioCadastroProxies
          proxyType={proxyType}
          setProxyType={setProxyType}
          ipChecker={ipChecker}
          setIpChecker={setIpChecker}
          selectedTags={selectedTags}
          setSelectedTags={setSelectedTags}
          rawText={rawText}
          setRawText={setRawText}
        />

        <TabelaPreviaProxies
          items={parsedList}
          isChecking={isChecking}
          hasValidProxies={hasValidProxies}
          checkDuplicates={checkDuplicates}
          setCheckDuplicates={setCheckDuplicates}
          onTestAll={handleTestAll}
          onRemoveItem={handleRemoveRow}
        />
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

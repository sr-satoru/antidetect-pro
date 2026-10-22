import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, Network } from 'lucide-react';
import { api } from '@/services/index.api';
import { FormularioCadastroProxies } from './formulario-cadastro-proxies';
import { TabelaPreviaProxies } from './tabela-previa-proxies';
import {
  ParsedProxyItem,
  parseProxyLine,
  formatProxyTestResult,
} from '@/services/proxies/service.proxies';

export type { ParsedProxyItem } from '@/services/proxies/service.proxies';

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

  const validCount = useMemo(() => {
    return parsedList.filter((p) => p.isValid).length;
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
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-white dark:bg-[#181920] text-slate-800 dark:text-[#D1D5DB]">
      {/* Top Header */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#14151B] px-6 select-none">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 dark:border-white/10 bg-emerald-50 dark:bg-[#1E202A] text-emerald-600 dark:text-[#00FF66]">
            <Network size={16} />
          </div>
          <div>
            <h2 className="text-[13.5px] font-semibold text-slate-900 dark:text-white">
              Adicionar Proxies em Lote
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-[#7E8294]">
              Importe e valide múltiplos proxies para uso nos seus perfis
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-lg p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-[#8E92A2] dark:hover:bg-white/5 dark:hover:text-white transition-colors"
          title="Fechar"
        >
          <X size={16} />
        </button>
      </div>

      {/* Body: Formulário Superior e Tabela de Prévia Inferior */}
      <div className="flex min-h-0 flex-1 flex-col space-y-5 overflow-y-auto p-6 select-text [scrollbar-width:thin]">
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
      <div className="flex h-16 shrink-0 items-center justify-between border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#14151B] px-6 select-none">
        <div className="text-[12px] text-slate-500 dark:text-[#7E8294]">
          {hasValidProxies ? (
            <span className="text-slate-700 dark:text-[#C4C7D5]">
              Pronto para salvar{' '}
              <strong className="text-slate-900 dark:text-white font-semibold">
                {validCount} {validCount === 1 ? 'proxy' : 'proxies'}
              </strong>
            </span>
          ) : (
            <span>Insira ao menos um formato válido para salvar</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-slate-300 dark:border-white/10 bg-white dark:bg-[#20222B] px-4 py-2 text-xs font-medium text-slate-700 dark:text-[#A6ABB9] transition-all hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:border-white/20 dark:hover:bg-[#282B36] dark:hover:text-white shadow-xs"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasValidProxies}
            className="flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-[#238636] hover:bg-[#2ea043] text-white px-5 py-2 text-xs font-semibold shadow-xs transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Check size={14} strokeWidth={2.5} />
            <span>Salvar Proxies</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CadastroProxies;

import React, { useState, useEffect } from 'react';
import {
  Bot,
  Terminal,
  Code2,
} from 'lucide-react';
import { CompactCredentials } from '@/components/mcp-api/compact-credentials';
import { McpTab } from '@/components/mcp-api/mcp-tab';
import { ApiTab } from '@/components/mcp-api/api-tab';
import { AutomationTab } from '@/components/mcp-api/automation-tab';
import { serviceMcp } from '@/services/mcp/service.mcp';

type TabKey = 'mcp' | 'automation' | 'api';

export const McpApiPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('mcp');
  const [showToken, setShowToken] = useState(false);
  const [token, setToken] = useState<string>(serviceMcp.getCachedToken());

  useEffect(() => {
    serviceMcp.getInfo()
      .then((res) => {
        if (res?.token) {
          setToken(res.token);
        }
      })
      .catch(() => {});
  }, []);

  const handleToggleShowToken = () => {
    setShowToken((prev) => !prev);
  };

  const tabs = [
    { id: 'mcp', label: 'Agentes de IA (MCP)', icon: Bot },
    { id: 'automation', label: 'Playwright Nativo', icon: Code2 },
    { id: 'api', label: 'API REST', icon: Terminal },
  ] as const;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 dark:border-[#484A54] bg-[#F8F7F5] dark:bg-[#1C1D21] shadow-xs select-none">
      {/* ═══════════════════════════════════════════════════════════════
          MENU SUPERIOR DE ABAS CENTRALIZADO (Estilo Oficial Configuration)
      ═══════════════════════════════════════════════════════════════ */}
      <header className="flex shrink-0 items-center border-b border-slate-200/80 dark:border-[#484A54] bg-white/90 dark:bg-[#28292E]/90 backdrop-blur-md px-6 py-3 select-none">
        <div className="max-w-4xl mx-auto w-full flex items-center justify-center">
          <div className="bg-slate-100/90 dark:bg-[#323338] p-1.5 rounded-xl border border-slate-200/60 dark:border-[#484A54] flex items-center gap-1.5 shadow-xs">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as TabKey)}
                  className={`rounded-lg px-6 py-2.5 text-[13.5px] font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-[#454750] text-slate-900 dark:text-white font-semibold shadow-xs border border-slate-200/50 dark:border-white/10'
                      : 'text-slate-600 dark:text-[#A6A9B6] hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════
          SUB-BARRA DE CREDENCIAIS (Abaixo do menu de abas)
      ═══════════════════════════════════════════════════════════════ */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200/80 dark:border-[#484A54] bg-slate-100/60 dark:bg-[#24252A] px-6 py-2.5 backdrop-blur-xs select-none">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-[#8E92A2]">
          <span className="font-medium text-slate-700 dark:text-[#E4E6EE]">Chave de Acesso da API:</span>
          <span className="hidden sm:inline">Utilizada para autenticar requisições de agentes MCP, Playwright e REST.</span>
        </div>
        <div className="shrink-0">
          <CompactCredentials
            token={token}
            showToken={showToken}
            onToggleShowToken={handleToggleShowToken}
            onTokenChange={setToken}
          />
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          ÁREA CENTRAL DE CONTEÚDO (Scrollável padronizada com p-6 space-y-5)
      ═══════════════════════════════════════════════════════════════ */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5 custom-scrollbar">
        {activeTab === 'mcp' && (
          <McpTab
            token={token}
            showToken={showToken}
            onRevealKey={() => setShowToken(true)}
          />
        )}
        {activeTab === 'automation' && (
          <AutomationTab
            token={token}
            showToken={showToken}
            onRevealKey={() => setShowToken(true)}
          />
        )}
        {activeTab === 'api' && (
          <ApiTab
            token={token}
            showToken={showToken}
            onRevealKey={() => setShowToken(true)}
          />
        )}
      </div>
    </div>
  );
};

export default McpApiPage;

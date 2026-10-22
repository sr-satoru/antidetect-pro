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
    <div className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-slate-200 dark:border-[#353744] bg-white dark:bg-[#24252D] shadow-xl shadow-slate-900/5 dark:shadow-2xl select-none">
      {/* ═══════════════════════════════════════════════════════════════
          MENU SUPERIOR DE ABAS (Estilo Oficial Configuration & Criar Perfil)
      ═══════════════════════════════════════════════════════════════ */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 dark:border-[#30323E] bg-slate-50/80 dark:bg-[#24252D] px-6 pt-4 select-none">
        <div className="flex items-center gap-8 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as TabKey)}
                className={`relative flex items-center gap-2 cursor-pointer pb-3 text-[13.5px] tracking-wide transition-all ${
                  isActive
                    ? 'font-semibold text-slate-900 dark:text-white after:absolute after:right-0 after:bottom-0 after:left-0 after:h-[2.5px] after:rounded-t-sm after:bg-[#238636] dark:after:bg-[#2ea043] after:content-[""]'
                    : 'text-slate-500 hover:text-slate-900 dark:text-[#8E92A2] dark:hover:text-[#C4C7D5]'
                }`}
              >
                <IconComponent
                  size={15}
                  className={isActive ? 'text-[#238636] dark:text-[#2ea043]' : 'text-slate-400 dark:text-[#7E8294]'}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Credenciais compactas alinhadas à direita com as abas */}
        <div className="pb-3 shrink-0">
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

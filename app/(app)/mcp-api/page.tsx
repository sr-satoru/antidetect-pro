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

export const McpApiPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'mcp' | 'automation' | 'api'>('mcp');
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

  return (
    <div className="h-full flex flex-col space-y-4 overflow-y-auto pr-1">
      {/* Top Bar with Navigation Tabs and Compact Credentials */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        {/* Modern Segmented Navigation Pill (3 Tabs) */}
        <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-[#13141B] border border-slate-200 dark:border-white/10 rounded-2xl w-fit shrink-0 shadow-sm dark:shadow-none">
          <button
            type="button"
            onClick={() => setActiveTab('mcp')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-[12px] font-bold transition-all cursor-pointer ${
              activeTab === 'mcp'
                ? 'text-emerald-700 dark:text-[#00FF66] bg-emerald-50 dark:bg-[#222430] border border-emerald-200 dark:border-white/15 shadow-xs'
                : 'text-slate-600 dark:text-[#9EA2AE] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04]'
            }`}
          >
            <Bot size={15} className={activeTab === 'mcp' ? 'text-emerald-600 dark:text-[#00FF66]' : 'text-slate-400 dark:text-[#7E8294]'} />
            <span>Agentes de IA (MCP)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('automation')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-[12px] font-bold transition-all cursor-pointer ${
              activeTab === 'automation'
                ? 'text-emerald-700 dark:text-[#00FF66] bg-emerald-50 dark:bg-[#222430] border border-emerald-200 dark:border-white/15 shadow-xs'
                : 'text-slate-600 dark:text-[#9EA2AE] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04]'
            }`}
          >
            <Code2 size={15} className={activeTab === 'automation' ? 'text-emerald-600 dark:text-[#00FF66]' : 'text-slate-400 dark:text-[#7E8294]'} />
            <span>Playwright Nativo (Zero BiDi)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('api')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-[12px] font-bold transition-all cursor-pointer ${
              activeTab === 'api'
                ? 'text-emerald-700 dark:text-[#00FF66] bg-emerald-50 dark:bg-[#222430] border border-emerald-200 dark:border-white/15 shadow-xs'
                : 'text-slate-600 dark:text-[#9EA2AE] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04]'
            }`}
          >
            <Terminal size={15} className={activeTab === 'api' ? 'text-emerald-600 dark:text-[#00FF66]' : 'text-slate-400 dark:text-[#7E8294]'} />
            <span>API REST</span>
          </button>
        </div>

        {/* Ultra-clean Compact Credentials Bar */}
        <CompactCredentials
          token={token}
          showToken={showToken}
          onToggleShowToken={handleToggleShowToken}
          onTokenChange={setToken}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 pb-4">
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

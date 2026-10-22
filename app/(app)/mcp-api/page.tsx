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
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#15151A] border border-slate-200 dark:border-[#2E2E38] rounded-xl w-fit shrink-0 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('mcp')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[12.5px] font-semibold transition-all cursor-pointer ${
              activeTab === 'mcp'
                ? 'text-[#238636] dark:text-[#2ea043] bg-white dark:bg-[#24252D] border border-slate-200/80 dark:border-[#383A48] shadow-xs'
                : 'text-slate-600 dark:text-[#90909D] hover:text-slate-900 dark:hover:text-[#F1F1F4] hover:bg-slate-200/50 dark:hover:bg-[#1E1F27]'
            }`}
          >
            <Bot size={15} className={activeTab === 'mcp' ? 'text-[#238636] dark:text-[#2ea043]' : 'text-slate-400 dark:text-[#7E8294]'} />
            <span>Agentes de IA (MCP)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('automation')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[12.5px] font-semibold transition-all cursor-pointer ${
              activeTab === 'automation'
                ? 'text-[#238636] dark:text-[#2ea043] bg-white dark:bg-[#24252D] border border-slate-200/80 dark:border-[#383A48] shadow-xs'
                : 'text-slate-600 dark:text-[#90909D] hover:text-slate-900 dark:hover:text-[#F1F1F4] hover:bg-slate-200/50 dark:hover:bg-[#1E1F27]'
            }`}
          >
            <Code2 size={15} className={activeTab === 'automation' ? 'text-[#238636] dark:text-[#2ea043]' : 'text-slate-400 dark:text-[#7E8294]'} />
            <span>Playwright Nativo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('api')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-[12.5px] font-semibold transition-all cursor-pointer ${
              activeTab === 'api'
                ? 'text-[#238636] dark:text-[#2ea043] bg-white dark:bg-[#24252D] border border-slate-200/80 dark:border-[#383A48] shadow-xs'
                : 'text-slate-600 dark:text-[#90909D] hover:text-slate-900 dark:hover:text-[#F1F1F4] hover:bg-slate-200/50 dark:hover:bg-[#1E1F27]'
            }`}
          >
            <Terminal size={15} className={activeTab === 'api' ? 'text-[#238636] dark:text-[#2ea043]' : 'text-slate-400 dark:text-[#7E8294]'} />
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

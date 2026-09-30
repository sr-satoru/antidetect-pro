import React, { useState } from 'react';
import {
  Bot,
  Terminal,
} from 'lucide-react';
import { CompactCredentials } from '@/components/mcp-api/compact-credentials';
import { McpTab } from '@/components/mcp-api/mcp-tab';
import { ApiTab } from '@/components/mcp-api/api-tab';

export const McpApiPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'mcp' | 'api'>('mcp');

  return (
    <div className="h-full flex flex-col space-y-4 overflow-y-auto pr-1">
      {/* Top Executive Header with Compact Credentials in One Line */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0">
        <div>
          <div className="flex items-center gap-2 text-[12px] text-[#A6A6A6]">
            <span>Automação</span>
            <span className="text-[#666666]">/</span>
            <span className="text-[#00FF66] font-semibold">API & MCP</span>
          </div>
          <h1 className="text-[20px] font-extrabold text-white tracking-tight mt-0.5 flex items-center gap-2">
            Central de Automação & IA
            <span className="relative flex h-2 w-2 ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </h1>
        </div>

        {/* Ultra-clean Compact Credentials Bar */}
        <CompactCredentials />
      </div>

      {/* Modern Segmented Navigation Pill (2 Tabs) */}
      <div className="flex items-center gap-1.5 p-1 bg-[#383838]/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl w-fit shrink-0 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveTab('mcp')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-[12px] font-bold transition-all ${
            activeTab === 'mcp'
              ? 'text-[#00FF66] bg-[#484848] border border-white/[0.08] shadow-xs'
              : 'text-[#A0A0A0] hover:text-white'
          }`}
        >
          <Bot size={15} className={activeTab === 'mcp' ? 'text-[#00FF66]' : 'text-[#8E8E93]'} />
          <span>Agentes de IA (MCP)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('api')}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-[12px] font-bold transition-all ${
            activeTab === 'api'
              ? 'text-[#00FF66] bg-[#484848] border border-white/[0.08] shadow-xs'
              : 'text-[#A0A0A0] hover:text-white'
          }`}
        >
          <Terminal size={15} className={activeTab === 'api' ? 'text-[#00FF66]' : 'text-[#8E8E93]'} />
          <span>API REST & Playwright</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 pb-4">
        {activeTab === 'mcp' && <McpTab />}
        {activeTab === 'api' && <ApiTab />}
      </div>
    </div>
  );
};

export default McpApiPage;

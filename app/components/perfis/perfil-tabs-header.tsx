import React from 'react';
import config from '@/config/perfil.json';

interface PerfilTabsHeaderProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const PerfilTabsHeader: React.FC<PerfilTabsHeaderProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-slate-200/80 dark:border-[#2D3039] bg-[#F8F7F5] dark:bg-[#1F2026] px-6 py-2.5 select-none">
      {config.tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              isActive
                ? 'bg-white dark:bg-[#282A33] text-slate-900 dark:text-white font-semibold shadow-xs border border-slate-200/50 dark:border-white/10'
                : 'text-slate-600 dark:text-[#9DA2B4] hover:bg-slate-200/60 dark:hover:bg-[#282A33]/50 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

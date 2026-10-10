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
    <div className="flex shrink-0 items-center gap-8 overflow-x-auto border-b border-slate-200 dark:border-[#30323E] bg-slate-50 dark:bg-[#24252D] px-6 pt-4 select-none">
      {config.tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`relative cursor-pointer pb-3 text-[13.5px] tracking-wide transition-all ${
              isActive
                ? 'font-semibold text-slate-900 dark:text-white after:absolute after:right-0 after:bottom-0 after:left-0 after:h-[2.5px] after:rounded-t-sm after:bg-emerald-600 dark:after:bg-white after:content-[""]'
                : 'text-slate-500 hover:text-slate-900 dark:text-[#8E92A2] dark:hover:text-[#C4C7D5]'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

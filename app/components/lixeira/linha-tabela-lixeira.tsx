import React from 'react';
import { OsIcon } from '../ui/os-icon';
import { Folder } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';

export interface ItemLixeira {
  id: string | number;
  originalId: string | number;
  name: string;
  group: string;
  os: 'windows' | 'macos' | 'linux' | 'android' | 'ios' | string;
  ip?: string;
  country?: string;
  deletedAt?: string | number;
  deleted_at?: number;
  created_at?: number;
  updated_at?: number;
  daysRemaining?: number;
  deletedBy?: string;
  raw?: any;
}

interface LinhaTabelaLixeiraProps {
  item: ItemLixeira;
  isSelected: boolean;
  index?: number;
  onSelect: (id: string | number) => void;
  onRestore?: (id: string | number) => void;
  onDeletePermanent?: (id: string | number) => void;
}

const renderOsIcon = (os: string) => {
  return <OsIcon os={os} size={14} className="shrink-0 text-slate-400 dark:text-[#9DA2B4]" />;
};

const getDeletedDate = (item: ItemLixeira): Date => {
  const ts = item.deleted_at ?? item.deletedAt ?? item.updated_at;
  if (!ts) return new Date();
  const num = Number(ts);
  if (!isNaN(num)) {
    return new Date(num < 10000000000 ? num * 1000 : num);
  }
  const parsed = new Date(ts);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

const formatDateTime = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} às ${hours}:${minutes}`;
};

const getExpirationDetails = (deletedDate: Date) => {
  const RETENTION_DAYS = 30;
  const expirationDate = new Date(
    deletedDate.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000,
  );
  const now = new Date();
  const diffMs = expirationDate.getTime() - now.getTime();
  const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  return {
    expirationDate,
    formattedExpiration: formatDateTime(expirationDate),
    daysRemaining,
  };
};

export const LinhaTabelaLixeira: React.FC<LinhaTabelaLixeiraProps> = ({
  item,
  isSelected,
  index = 0,
  onSelect,
}) => {
  const isDarkRow = index % 2 === 0;

  // Cores do Zebrado: Sempre começando com a primeira escura (index 0), depois intercalando
  const rowBg = isSelected
    ? 'bg-[#7C3AED]/[0.08] dark:bg-[#7C3AED]/15 border-l-[3px] border-l-[#7C3AED] dark:border-l-[#A78BFA]'
    : isDarkRow
      ? 'bg-[#F4F3EF] dark:bg-[#141519] hover:bg-slate-200/50 dark:hover:bg-[#252733]'
      : 'bg-white dark:bg-[#1C1D24] hover:bg-slate-200/50 dark:hover:bg-[#252733]';

  const deletedDate = getDeletedDate(item);
  const expiration = getExpirationDetails(deletedDate);

  return (
    <tr
      className={`group h-[60px] border-b border-slate-100 dark:border-white/[0.06] transition-colors ${rowBg}`}
    >
      {/* 1. Checkbox */}
      <td
        className="w-[44px] min-w-[44px] max-w-[44px] px-2 py-2 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-center">
          <Checkbox
            checked={isSelected}
            onChange={() => onSelect(item.id)}
            aria-label={`Selecionar item ${item.name || item.id}`}
          />
        </div>
      </td>

      {/* 2. ID Original */}
      <td className="w-[75px] min-w-[75px] px-3.5 py-2 font-mono text-xs font-semibold whitespace-nowrap text-slate-900 dark:text-white">
        #{!isNaN(Number(item.originalId)) && Number(item.originalId) < 10 ? `0${Number(item.originalId)}` : item.originalId}
      </td>

      {/* 3. Nome do Perfil & Sistema Operacional */}
      <td className="w-[230px] min-w-[230px] px-3.5 py-2 whitespace-nowrap">
        <div className="flex items-center gap-2">
          {renderOsIcon(item.os)}
          <span className="max-w-[190px] truncate text-xs font-semibold text-slate-900 dark:text-white">
            {item.name}
          </span>
        </div>
      </td>

      {/* 4. Grupo */}
      <td className="w-[150px] min-w-[150px] px-3.5 py-2 whitespace-nowrap">
        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-[#9DA2B4]">
          <Folder size={13} className="shrink-0 text-slate-400 dark:text-[#9DA2B4]" />
          <span className="truncate">{item.group}</span>
        </div>
      </td>

      {/* 5. IP & País */}
      <td className="w-[180px] min-w-[180px] px-3.5 py-2 whitespace-nowrap">
        <div className="flex flex-col leading-tight">
          <span className="font-mono text-xs font-semibold text-slate-800 dark:text-white">
            {item.ip || 'Sem Proxy'}
          </span>
          <span className="text-[11px] text-slate-400 dark:text-[#9DA2B4]">
            {item.country || 'Direto'}
          </span>
        </div>
      </td>

      {/* 6. Data e Hora de Exclusão */}
      <td className="w-[180px] min-w-[180px] px-3.5 py-2 font-mono text-xs whitespace-nowrap text-slate-700 dark:text-[#E2E4EC]">
        {formatDateTime(deletedDate)}
      </td>

      {/* 7. Exclusão Definitiva (30 dias) */}
      <td className="w-[190px] min-w-[190px] px-3.5 py-2 whitespace-nowrap">
        <div className="flex flex-col leading-tight">
          <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white">
            {expiration.formattedExpiration}
          </span>
          <span
            className={`text-[11px] font-medium mt-0.5 ${
              expiration.daysRemaining <= 3
                ? 'text-red-500 dark:text-red-400'
                : expiration.daysRemaining <= 7
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-slate-500 dark:text-[#9DA2B4]'
            }`}
          >
            {expiration.daysRemaining === 0
              ? 'Expira hoje'
              : expiration.daysRemaining === 1
                ? 'Expira amanhã'
                : `${expiration.daysRemaining} dias restantes`}
          </span>
        </div>
      </td>
    </tr>
  );
};

export default LinhaTabelaLixeira;

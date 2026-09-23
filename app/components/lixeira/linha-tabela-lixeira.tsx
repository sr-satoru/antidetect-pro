import React from 'react';
import {
  RotateCcw,
  Trash2,
  Apple,
  Bot,
  Smartphone,
  Tablet,
  Monitor,
  Clock,
  Globe,
  Folder,
} from 'lucide-react';

export interface ItemLixeira {
  id: string | number;
  originalId: string | number;
  name: string;
  group: string;
  os: 'windows' | 'macos' | 'linux' | 'android' | 'ios' | string;
  ip?: string;
  country?: string;
  deletedAt: string;
  daysRemaining: number;
  deletedBy: string;
  raw?: any;
}

interface LinhaTabelaLixeiraProps {
  item: ItemLixeira;
  isSelected: boolean;
  index?: number;
  onSelect: (id: string | number) => void;
  onRestore: (id: string | number) => void;
  onDeletePermanent: (id: string | number) => void;
}

const renderOsIcon = (os: string) => {
  const norm = os.toLowerCase();
  switch (norm) {
    case 'macos':
      return <Apple size={14} className="shrink-0 text-[#9EA2AE]" />;
    case 'linux':
      return <Bot size={14} className="shrink-0 text-[#9EA2AE]" />;
    case 'android':
      return <Smartphone size={14} className="shrink-0 text-[#9EA2AE]" />;
    case 'ios':
      return <Tablet size={14} className="shrink-0 text-[#9EA2AE]" />;
    case 'windows':
    default:
      return <Monitor size={14} className="shrink-0 text-[#9EA2AE]" />;
  }
};

export const LinhaTabelaLixeira: React.FC<LinhaTabelaLixeiraProps> = ({
  item,
  isSelected,
  index = 0,
  onSelect,
  onRestore,
  onDeletePermanent,
}) => {
  const isStriped = index % 2 === 1;

  const rowBg = isSelected
    ? 'bg-[#DFE104]/14 border-l-2 border-l-[#DFE104]'
    : isStriped
      ? 'bg-[#24252B] hover:bg-[#32343D]'
      : 'bg-[#1E1F26] hover:bg-[#32343D]';

  const stickyBg = isSelected
    ? 'bg-[#181a20]'
    : isStriped
      ? 'bg-[#24252B] group-hover:bg-[#32343D]'
      : 'bg-[#1E1F26] group-hover:bg-[#32343D]';

  const getDaysBadge = (days: number) => {
    if (days <= 1) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-[#EF4444]/40 bg-[#EF4444]/15 px-2 py-0.5 text-[11px] font-bold text-[#FF6B6B]">
          <Clock size={11} />
          <span>{days} dia restante</span>
        </span>
      );
    }
    if (days <= 3) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md border border-[#DFE104]/40 bg-[#DFE104]/15 px-2 py-0.5 text-[11px] font-semibold text-[#DFE104]">
          <Clock size={11} />
          <span>{days} dias restantes</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-[#10B981]/30 bg-[#10B981]/10 px-2 py-0.5 text-[11px] font-medium text-[#10B981]">
        <Clock size={11} />
        <span>{days} dias restantes</span>
      </span>
    );
  };

  return (
    <tr
      className={`group h-[56px] border-b border-[#363847] transition-colors ${rowBg}`}
    >
      {/* 1. Checkbox */}
      <td className="w-[38px] max-w-[38px] min-w-[38px] px-3.5 py-2.5 text-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onSelect(item.id)}
          className="h-3.5 w-3.5 cursor-pointer rounded accent-[#DFE104]"
        />
      </td>

      {/* 2. ID Original */}
      <td className="w-[75px] min-w-[75px] px-3.5 py-2.5 font-mono text-xs font-semibold whitespace-nowrap text-white">
        #{typeof item.originalId === 'number' && item.originalId < 10 ? `0${item.originalId}` : item.originalId}
      </td>

      {/* 3. Nome do Perfil & Sistema Operacional */}
      <td className="w-[230px] min-w-[230px] px-3.5 py-2.5 whitespace-nowrap">
        <div className="flex items-center gap-2">
          {renderOsIcon(item.os)}
          <span className="max-w-[190px] truncate text-xs font-semibold text-white">
            {item.name}
          </span>
        </div>
      </td>

      {/* 4. Grupo */}
      <td className="w-[150px] min-w-[150px] px-3.5 py-2.5 whitespace-nowrap">
        <div className="flex items-center gap-1.5 text-xs text-[#A6ABB9]">
          <Folder size={13} className="shrink-0 text-[#717586]" />
          <span className="truncate">{item.group}</span>
        </div>
      </td>

      {/* 5. IP & País */}
      <td className="w-[180px] min-w-[180px] px-3.5 py-2.5 whitespace-nowrap">
        <div className="flex flex-col leading-tight">
          <span className="font-mono text-xs font-semibold text-[#DFE104]">
            {item.ip || 'Sem Proxy'}
          </span>
          <span className="text-[10.5px] text-[#8E92A2]">
            {item.country || 'Direto'}
          </span>
        </div>
      </td>

      {/* 6. Data de Exclusão */}
      <td className="w-[160px] min-w-[160px] px-3.5 py-2.5 font-mono text-xs whitespace-nowrap text-[#C8CBD4]">
        {item.deletedAt}
      </td>

      {/* 7. Tempo Restante */}
      <td className="w-[140px] min-w-[140px] px-3.5 py-2.5 whitespace-nowrap">
        {getDaysBadge(item.daysRemaining)}
      </td>

      {/* 8. Responsável */}
      <td className="w-[130px] min-w-[130px] px-3.5 py-2.5 text-xs whitespace-nowrap text-[#8E92A2]">
        {item.deletedBy}
      </td>

      {/* 9. Ações (Restaurar, Excluir Permanente) - Sticky */}
      <td
        className={`sticky right-0 z-10 w-[110px] max-w-[110px] min-w-[110px] px-3 py-2.5 transition-colors ${stickyBg}`}
      >
        <div className="flex items-center justify-center gap-2">
          {/* Botão Restaurar */}
          <button
            type="button"
            onClick={() => onRestore(item.id)}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[#10B981] transition-all hover:bg-[#10B981]/15 hover:text-white"
            title="Restaurar perfil"
          >
            <RotateCcw size={14} />
          </button>

          {/* Botão Excluir Permanente */}
          <button
            type="button"
            onClick={() => onDeletePermanent(item.id)}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[#8E92A2] transition-all hover:bg-[#EF4444]/15 hover:text-[#FF6B6B]"
            title="Excluir permanentemente"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default LinhaTabelaLixeira;

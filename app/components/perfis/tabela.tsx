import React, { useState, useRef, useEffect } from 'react';
import { LinhaTabela } from './linhatabela';
import {
  Layers,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  RotateCw,
} from 'lucide-react';
import { Checkbox } from '../ui/checkbox';

interface TabelaProps {
  profiles: any[];
  selectedIds: (string | number)[];
  onSelectProfile: (id: any) => void;
  onSelectAll: () => void;
  onToggleRunning: (id: any) => void;
  onEdit: (profile: any) => void;
  onEditTags?: (profile: any) => void;
  onEditNotes?: (profile: any) => void;
  onDelete: (id: any) => void;
  onDuplicate?: (profile: any) => void;
  isSyncing?: boolean;
}

export const Tabela: React.FC<TabelaProps> = ({
  profiles,
  selectedIds,
  onSelectProfile,
  onSelectAll,
  onToggleRunning,
  onEdit,
  onEditTags,
  onEditNotes,
  onDelete,
  onDuplicate,
  isSyncing = false,
}) => {
  const isAllSelected =
    profiles.length > 0 && selectedIds.length === profiles.length;
  const isSomeSelected =
    selectedIds.length > 0 && selectedIds.length < profiles.length;
  const runningCount = profiles.filter((p) => p.isRunning || p.status === 'running').length;

  const [pageSize, setPageSize] = useState('20');
  const [isPageDropdownOpen, setIsPageDropdownOpen] = useState(false);
  const pageDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pageDropdownRef.current && !pageDropdownRef.current.contains(event.target as Node)) {
        setIsPageDropdownOpen(false);
      }
    };
    if (isPageDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPageDropdownOpen]);

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#181920] shadow-sm shadow-slate-200/50 dark:shadow-none">
      <div className="flex-1 custom-scrollbar overflow-auto relative">
        <table className="min-w-full w-full border-collapse text-left text-xs whitespace-nowrap">
          {/* Header */}
          <thead className="sticky top-0 z-20 border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#14151B] text-[11px] font-semibold tracking-wider text-slate-500 dark:text-[#A6ABB9] uppercase select-none">
            <tr className="h-11">
              <th className="w-[44px] min-w-[44px] max-w-[44px] px-2 py-2.5 text-center">
                <div className="flex items-center justify-center">
                  <Checkbox
                    checked={isAllSelected}
                    indeterminate={isSomeSelected}
                    onChange={onSelectAll}
                    aria-label="Selecionar todos os perfis"
                  />
                </div>
              </th>
              <th className="w-[85px] min-w-[85px] px-3.5 py-2.5">ID</th>
              <th className="w-[115px] min-w-[115px] px-3.5 py-2.5">Grupo</th>
              <th className="w-[220px] min-w-[220px] px-3.5 py-2.5">
                Nome do Perfil
              </th>
              <th className="w-[220px] min-w-[220px] px-3.5 py-2.5">
                Proxy / IP
              </th>
              <th className="w-[120px] min-w-[120px] px-3.5 py-2.5">
                Última Sessão
              </th>
              <th className="w-[210px] min-w-[210px] px-3.5 py-2.5">
                Plataforma
              </th>
              <th className="w-[190px] min-w-[190px] px-3.5 py-2.5">Tags</th>
              <th className="w-[170px] min-w-[170px] px-3.5 py-2.5">
                Observação
              </th>
              <th className="w-[120px] min-w-[120px] px-3.5 py-2.5">Criação</th>
              <th className="sticky right-[48px] z-20 w-[124px] max-w-[124px] min-w-[124px] bg-slate-50 dark:bg-[#14151B] px-3 py-2.5 text-center">
                Ação
              </th>
              <th className="sticky right-0 z-20 w-[48px] max-w-[48px] min-w-[48px] bg-slate-50 dark:bg-[#14151B] px-2 py-2.5 text-center">
                <SlidersHorizontal
                  size={13}
                  className="mx-auto text-slate-400 dark:text-[#9EA2AE]"
                />
              </th>
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {profiles.length > 0 ? (
              profiles.map((profile, index) => (
                <LinhaTabela
                  key={profile.id}
                  index={index}
                  profile={profile}
                  isSelected={selectedIds.includes(profile.id)}
                  onSelect={onSelectProfile}
                  onToggleRunning={onToggleRunning}
                  onEdit={onEdit}
                  onEditTags={onEditTags}
                  onEditNotes={onEditNotes}
                  onDelete={onDelete}
                  onDuplicate={onDuplicate}
                />
              ))
            ) : isSyncing ? (
              <tr>
                <td colSpan={12} className="py-20 text-center text-slate-400 dark:text-[#5E6172]">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <RotateCw
                      size={28}
                      className="animate-spin text-emerald-500"
                    />
                    <p className="text-sm font-semibold text-slate-700 dark:text-[#E1E4EE]">
                      Sincronizando perfis com a VPS...
                    </p>
                    <p className="text-xs text-slate-400 dark:text-[#8E92A2]">
                      Baixando e descriptografando dados locais com segurança.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              <tr>
                <td colSpan={12} className="py-16 text-center text-slate-400 dark:text-[#5E6172]">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Layers
                      size={32}
                      strokeWidth={1.5}
                      className="text-slate-300 dark:text-[#353849]"
                    />
                    <p className="text-sm font-medium text-slate-600 dark:text-[#8e92a4]">
                      Nenhum perfil encontrado
                    </p>
                    <p className="text-xs text-slate-400 dark:text-[#5E6172]">
                      Ajuste os filtros de pesquisa ou crie um novo perfil.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação no Rodapé Minimalista */}
      <div className="relative z-20 mt-auto flex h-12 shrink-0 items-center justify-between border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#14151B] px-4 text-xs text-slate-600 dark:text-[#C8CBD4]">
        <div className="flex items-center gap-4">
          <span>
            Total: <strong className="text-slate-900 dark:text-white">{profiles.length}</strong>{' '}
            perfis
          </span>
          <span>
            Executando:{' '}
            <strong className="text-emerald-600 dark:text-[#4ade80]">{runningCount}</strong>
          </span>
          {selectedIds.length > 0 && (
            <span className="rounded border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-[#00FF66]/20 dark:bg-[#00FF66]/10 dark:text-[#00FF66] px-2 py-0.5 text-[11px] font-medium">
              {selectedIds.length} marcado{selectedIds.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-slate-400 dark:text-[#9EA2AE]">1 / 1</span>
          <div className="relative" ref={pageDropdownRef}>
            <button
              type="button"
              onClick={() => setIsPageDropdownOpen(!isPageDropdownOpen)}
              className="flex h-[26px] items-center gap-1.5 rounded-md border border-slate-200 dark:border-white/15 bg-white dark:bg-[#1A1B22] px-2.5 text-[11px] text-slate-700 dark:text-[#C8CBD4] hover:border-slate-300 dark:hover:border-white/30 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer select-none focus:outline-hidden shadow-2xs"
            >
              <span>{pageSize} / pág</span>
              <ChevronDown
                size={12}
                className={`text-slate-400 dark:text-[#8E92A2] transition-transform duration-150 ${isPageDropdownOpen ? 'rotate-180 text-emerald-600 dark:text-[#00FF66]' : ''}`}
              />
            </button>

            {isPageDropdownOpen && (
              <div className="absolute bottom-full right-0 mb-1.5 z-50 min-w-[95px] overflow-hidden rounded-md border border-slate-200 dark:border-[#3E404D] bg-white dark:bg-[#1A1B21] py-1 shadow-lg shadow-slate-200/60 dark:shadow-2xl animate-in fade-in zoom-in-95 duration-100">
                {['10', '20', '50', '100'].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      setPageSize(size);
                      setIsPageDropdownOpen(false);
                    }}
                    className={`flex w-full items-center px-3 py-1 text-[11px] transition-colors cursor-pointer select-none text-left ${pageSize === size
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-[#00FF66]/10 dark:text-[#00FF66] font-medium'
                        : 'text-slate-700 dark:text-[#C8CBD4] hover:bg-slate-100 dark:hover:bg-[#2A2C38] hover:text-slate-900 dark:hover:text-white'
                      }`}
                  >
                    {size} / pág
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled
              className="flex h-[26px] w-[26px] cursor-not-allowed items-center justify-center rounded border border-slate-200 dark:border-[#3E404D] bg-white dark:bg-[#1A1B21] text-slate-400 dark:text-[#C8CBD4] disabled:opacity-40"
              title="Página anterior"
            >
              <ChevronLeft size={13} />
            </button>
            <button
              type="button"
              disabled
              className="flex h-[26px] w-[26px] cursor-not-allowed items-center justify-center rounded border border-slate-200 dark:border-[#3E404D] bg-white dark:bg-[#1A1B21] text-slate-400 dark:text-[#C8CBD4] disabled:opacity-40"
              title="Próxima página"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tabela;

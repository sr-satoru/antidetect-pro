import React from 'react';
import { LinhaTabela } from './linhatabela';
import {
  Layers,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

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
}) => {
  const isAllSelected =
    profiles.length > 0 && selectedIds.length === profiles.length;
  const runningCount = profiles.filter((p) => p.isRunning || p.status === 'running').length;

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl border border-[#3E404D] bg-[#24252B] shadow-xs">
      {/* Scrollable Table Area */}
      <div className="flex-1 [scrollbar-width:thin] [scrollbar-color:#44444C_#141418] overflow-x-auto overflow-y-visible [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded [&::-webkit-scrollbar-thumb]:bg-[#44444C] [&::-webkit-scrollbar-thumb:hover]:bg-[#DFE104] [&::-webkit-scrollbar-track]:bg-[#141418]">
        <table className="w-full border-collapse text-left text-xs whitespace-nowrap">
          {/* Header */}
          <thead className="sticky top-0 z-20 border-b border-[#3E404D] bg-[#24252B] text-[11px] font-semibold tracking-wider text-[#C8CBD4] uppercase select-none">
            <tr className="h-11">
              <th className="w-[38px] max-w-[38px] min-w-[38px] px-3.5 py-2.5 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={onSelectAll}
                  aria-label="Selecionar todos"
                  className="h-3.5 w-3.5 cursor-pointer rounded accent-[#DFE104]"
                />
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
              <th className="sticky right-[48px] z-20 w-[124px] max-w-[124px] min-w-[124px] bg-[#24252B] px-3 py-2.5 text-center">
                Ação
              </th>
              <th className="sticky right-0 z-20 w-[48px] max-w-[48px] min-w-[48px] bg-[#24252B] px-2 py-2.5 text-center">
                <SlidersHorizontal
                  size={13}
                  className="mx-auto text-[#9EA2AE]"
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
            ) : (
              <tr>
                <td colSpan={12} className="py-16 text-center text-[#5E6172]">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Layers
                      size={32}
                      strokeWidth={1.5}
                      className="text-[#353849]"
                    />
                    <p className="text-sm font-medium text-[#8e92a4]">
                      Nenhum perfil encontrado
                    </p>
                    <p className="text-xs text-[#5E6172]">
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
      <div className="relative z-20 mt-auto flex h-12 shrink-0 items-center justify-between border-t border-[#3E404D] bg-[#24252B] px-4 text-xs text-[#C8CBD4]">
        <div className="flex items-center gap-4">
          <span>
            Total: <strong className="text-white">{profiles.length}</strong>{' '}
            perfis
          </span>
          <span>
            Executando:{' '}
            <strong className="text-[#4ade80]">{runningCount}</strong>
          </span>
          {selectedIds.length > 0 && (
            <span className="rounded border border-[#DFE104]/20 bg-[#DFE104]/10 px-2 py-0.5 text-[11px] font-medium text-[#DFE104]">
              {selectedIds.length} marcado{selectedIds.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-[#9EA2AE]">1 / 1</span>
          <select
            className="cursor-pointer rounded border border-[#3E404D] bg-[#1A1B21] px-2 py-1 text-[11px] text-white outline-hidden focus:border-[#DFE104]"
            defaultValue="20"
          >
            <option value="10">10 / pág</option>
            <option value="20">20 / pág</option>
            <option value="50">50 / pág</option>
            <option value="100">100 / pág</option>
          </select>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled
              className="flex h-[26px] w-[26px] cursor-not-allowed items-center justify-center rounded border border-[#3E404D] bg-[#1A1B21] text-[#C8CBD4] disabled:opacity-40"
              title="Página anterior"
            >
              <ChevronLeft size={13} />
            </button>
            <button
              type="button"
              disabled
              className="flex h-[26px] w-[26px] cursor-not-allowed items-center justify-center rounded border border-[#3E404D] bg-[#1A1B21] text-[#C8CBD4] disabled:opacity-40"
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

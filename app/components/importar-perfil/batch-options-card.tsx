import React, { useEffect, useState } from 'react';
import { Folder, Globe, Settings2, Plus } from 'lucide-react';
import { AstroBrowserIcon, AstroFoxIcon } from '../icons';
import { serviceGrupos } from '@/services/grupos/service.grupos';

interface BatchOptionsCardProps {
  selectedGroup: string;
  onGroupChange: (group: string) => void;
  selectedKernel: string;
  onKernelChange: (kernel: string) => void;
  selectedPlatform: string;
  onPlatformChange: (platform: string) => void;
  overrideGroup: boolean;
  onOverrideGroupChange: (val: boolean) => void;
}

const PLATFORMS = [
  { value: '', label: 'Nenhuma / Personalizada' },
  { value: 'Google', label: 'Google / Gmail' },
  { value: 'Facebook', label: 'Facebook / Meta' },
  { value: 'TikTok', label: 'TikTok' },
  { value: 'Twitter', label: 'X (Twitter)' },
  { value: 'Amazon', label: 'Amazon' },
  { value: 'Shopee', label: 'Shopee' },
  { value: 'Mercado Livre', label: 'Mercado Livre' },
  { value: 'Discord', label: 'Discord' },
];

export const BatchOptionsCard: React.FC<BatchOptionsCardProps> = ({
  selectedGroup,
  onGroupChange,
  selectedKernel,
  onKernelChange,
  selectedPlatform,
  onPlatformChange,
  overrideGroup,
  onOverrideGroupChange,
}) => {
  const [existingGroups, setExistingGroups] = useState<string[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  useEffect(() => {
    serviceGrupos.list().then((groups) => {
      if (Array.isArray(groups)) {
        setExistingGroups(groups.map((g: any) => g.name || g));
      }
    }).catch(() => {});
  }, []);

  const handleCreateGroup = () => {
    const clean = newGroupName.trim();
    if (!clean) return;
    if (!existingGroups.includes(clean)) {
      setExistingGroups((prev) => [...prev, clean]);
    }
    onGroupChange(clean);
    setIsCreatingGroup(false);
    setNewGroupName('');
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#18191E] p-5 shadow-xs select-none">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/[0.06]">
        <Settings2 size={16} className="text-[#7C3AED] dark:text-[#A78BFA]" />
        <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Configurações Padrão do Lote
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Grupo de Destino */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-[#E2E4EC] flex items-center gap-1.5">
            <Folder size={13} className="text-slate-400 dark:text-[#9DA2B4]" />
            <span>Grupo de Destino</span>
          </label>

          {isCreatingGroup ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                autoFocus
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateGroup();
                  if (e.key === 'Escape') setIsCreatingGroup(false);
                }}
                placeholder="Nome do novo grupo..."
                className="flex-1 h-9 bg-white dark:bg-[#1F2026] border border-slate-200/80 dark:border-[#2D3039] focus:border-[#7C3AED] dark:focus:border-[#A78BFA] text-slate-900 dark:text-white text-xs px-3 rounded-lg focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleCreateGroup}
                className="h-9 px-3 rounded-lg bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-xs font-semibold cursor-pointer"
              >
                Criar
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingGroup(false)}
                className="h-9 px-2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <select
                value={selectedGroup}
                onChange={(e) => {
                  if (e.target.value === '__NEW__') {
                    setIsCreatingGroup(true);
                  } else {
                    onGroupChange(e.target.value);
                  }
                }}
                className="flex-1 h-9 bg-white dark:bg-[#1F2026] border border-slate-200/80 dark:border-[#2D3039] focus:border-[#7C3AED] dark:focus:border-[#A78BFA] text-slate-900 dark:text-white text-xs px-3 rounded-lg focus:outline-hidden cursor-pointer"
              >
                <option value="">Manter original do arquivo ou Desagrupado</option>
                {existingGroups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
                <option value="__NEW__">+ Criar Novo Grupo...</option>
              </select>
            </div>
          )}

          <label className="flex items-center gap-2 mt-1 cursor-pointer text-[11px] text-slate-500 dark:text-[#9DA2B4]">
            <input
              type="checkbox"
              checked={overrideGroup}
              onChange={(e) => onOverrideGroupChange(e.target.checked)}
              className="rounded accent-[#7C3AED]"
            />
            <span>Forçar este grupo em todos os perfis importados</span>
          </label>
        </div>

        {/* 2. Motor do Navegador Padrão */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-[#E2E4EC] flex items-center gap-1.5">
            <Globe size={13} className="text-slate-400 dark:text-[#9DA2B4]" />
            <span>Motor do Navegador</span>
          </label>

          <div className="grid grid-cols-2 gap-2 h-9">
            <button
              type="button"
              onClick={() => onKernelChange('AstroFox')}
              className={`flex items-center justify-center gap-2 px-3 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                selectedKernel === 'AstroFox'
                  ? 'border-[#7C3AED] bg-[#7C3AED]/10 dark:bg-[#7C3AED]/20 text-slate-900 dark:text-white shadow-2xs'
                  : 'border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] text-slate-600 dark:text-[#9DA2B4] hover:bg-slate-50 dark:hover:bg-[#282A33]'
              }`}
            >
              <AstroFoxIcon size={14} />
              <span>AstroFox</span>
            </button>

            <button
              type="button"
              onClick={() => onKernelChange('AstroBrowser')}
              className={`flex items-center justify-center gap-2 px-3 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                selectedKernel === 'AstroBrowser'
                  ? 'border-[#7C3AED] bg-[#7C3AED]/10 dark:bg-[#7C3AED]/20 text-slate-900 dark:text-white shadow-2xs'
                  : 'border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] text-slate-600 dark:text-[#9DA2B4] hover:bg-slate-50 dark:hover:bg-[#282A33]'
              }`}
            >
              <AstroBrowserIcon size={14} />
              <span>AstroBrowser</span>
            </button>
          </div>

          <span className="text-[11px] text-slate-400 dark:text-[#6C7284]">
            {selectedKernel === 'AstroFox' ? 'Motor Firefox com stealth nativo.' : 'Motor Chromium para compatibilidade total.'}
          </span>
        </div>

        {/* 3. Plataforma Padrão */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-[#E2E4EC] flex items-center gap-1.5">
            <Globe size={13} className="text-slate-400 dark:text-[#9DA2B4]" />
            <span>Plataforma Vinculada</span>
          </label>

          <select
            value={selectedPlatform}
            onChange={(e) => onPlatformChange(e.target.value)}
            className="w-full h-9 bg-white dark:bg-[#1F2026] border border-slate-200/80 dark:border-[#2D3039] focus:border-[#7C3AED] dark:focus:border-[#A78BFA] text-slate-900 dark:text-white text-xs px-3 rounded-lg focus:outline-hidden cursor-pointer"
          >
            {PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>

          <span className="text-[11px] text-slate-400 dark:text-[#6C7284]">
            Define o ícone e notas da conta automaticamente.
          </span>
        </div>
      </div>
    </div>
  );
};

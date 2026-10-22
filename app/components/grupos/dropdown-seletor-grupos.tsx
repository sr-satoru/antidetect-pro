import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Folder, Check, CornerDownLeft } from 'lucide-react';
import { toast } from '@/components/ui/notification';
import { serviceGrupos } from '../../services/grupos/service.grupos';

interface DropdownSeletorGruposProps {
  isOpen: boolean;
  onClose: () => void;
  selectedGroup: string;
  onSelectGroup: (groupName: string) => void;
  className?: string;
  fullWidth?: boolean;
}

export const DropdownSeletorGrupos: React.FC<DropdownSeletorGruposProps> = ({
  isOpen,
  onClose,
  selectedGroup,
  onSelectGroup,
  className = '',
  fullWidth = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [availableGroups, setAvailableGroups] = useState<string[]>(() =>
    serviceGrupos.getCached()
  );
  const [isLoading, setIsLoading] = useState(false);

  // Carrega grupos do backend sempre que abrir
  const loadGroups = async () => {
    try {
      setIsLoading(true);
      const list = await serviceGrupos.list();
      setAvailableGroups(list);
    } catch (err) {
      console.warn('Erro ao listar grupos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadGroups();
      setSearchTerm('');
      // Foca automaticamente no campo de busca/criação
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Se inscreve para atualizações reativas do serviceGrupos
  useEffect(() => {
    const unsubscribe = serviceGrupos.subscribe(() => {
      setAvailableGroups(serviceGrupos.getCached());
    });
    return unsubscribe;
  }, []);

  // Fecha ao clicar fora ou apertar Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        const target = e.target as HTMLElement;
        if (target.closest?.('[data-group-trigger="true"]')) return;
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Filtragem dos grupos disponíveis
  const filteredGroups = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return availableGroups;
    return availableGroups.filter((g) => g.toLowerCase().includes(q));
  }, [availableGroups, searchTerm]);

  // Verifica se já existe um grupo exatamente igual ao digitado
  const exactMatch = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return null;
    return availableGroups.find((g) => g.toLowerCase() === q);
  }, [availableGroups, searchTerm]);

  // Handler para selecionar grupo existente ou criar novo grupo
  const handleCreateOrSelect = () => {
    const trimmed = searchTerm.trim();
    if (!trimmed) return;

    if (exactMatch) {
      onSelectGroup(exactMatch);
      onClose();
      return;
    }

    // Registra o novo grupo localmente e seleciona na hora
    const registered = serviceGrupos.registerLocalGroup(trimmed);
    onSelectGroup(registered);
    setSearchTerm('');
    toast.success(`Grupo "${registered}" criado`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className={`animate-in fade-in zoom-in-95 absolute top-full z-50 mt-1.5 rounded-lg border border-slate-200 dark:border-[#2D3039] bg-white dark:bg-[#1E2028] shadow-xl shadow-slate-900/10 dark:shadow-2xl dark:shadow-black/80 select-none overflow-hidden duration-100 ${
        fullWidth ? 'left-0 right-0 w-full' : 'left-0 w-[300px]'
      } ${className}`}
    >
      {/* 1. Barra de Busca / Criação */}
      <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-slate-100 dark:border-[#2D3039]">
        <Search size={15} className="text-slate-400 dark:text-[#9DA2B4] shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleCreateOrSelect();
            }
          }}
          placeholder="Pesquisar ou criar grupo..."
          className="w-full bg-transparent text-xs text-slate-900 dark:text-[#E1E4EE] placeholder-slate-400 dark:placeholder-[#6C7082] focus:outline-hidden"
        />
      </div>

      {/* 2. Opção dinâmica "Criar / Selecionar [nome] ↵" se digitou texto */}
      {searchTerm.trim().length > 0 && (
        <div
          onClick={handleCreateOrSelect}
          className="flex items-center justify-between border-b border-slate-100 dark:border-[#2D3039] px-3 py-2 bg-slate-50 dark:bg-[#17181F]/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-[#252733] transition-colors text-xs"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-slate-500 dark:text-[#9DA2B4] shrink-0">
              {exactMatch ? 'Selecionar' : 'Criar'}
            </span>
            <div className="flex items-center gap-1.5 min-w-0">
              <Folder size={13} className="text-[#7C3AED] dark:text-[#A78BFA] shrink-0" />
              <span className="font-medium text-slate-900 dark:text-white truncate">
                "{searchTerm.trim()}"
              </span>
            </div>
          </div>

          <button
            type="button"
            className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-800 dark:text-[#9DA2B4] dark:hover:bg-[#2C2E3B] dark:hover:text-white transition-colors ml-2"
            title={exactMatch ? 'Pressione Enter para selecionar' : 'Pressione Enter para criar'}
          >
            <CornerDownLeft size={13} />
          </button>
        </div>
      )}

      {/* 3. Lista de Grupos Existentes */}
      <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-[#2C2E3B]/40">
        {filteredGroups.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 dark:text-[#82889A] select-none">
            {isLoading ? 'Carregando grupos...' : 'Nenhum grupo encontrado'}
          </div>
        ) : (
          filteredGroups.map((group) => {
            const isSelected = selectedGroup === group;

            return (
              <div
                key={group}
                onClick={() => {
                  onSelectGroup(group);
                  onClose();
                }}
                className={`flex cursor-pointer items-center justify-between px-3 py-2 text-xs transition-colors hover:bg-slate-50 dark:hover:bg-[#252733] ${
                  isSelected ? 'bg-violet-500/10 dark:bg-violet-500/15' : ''
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Folder
                    size={14}
                    className={`shrink-0 ${
                      isSelected
                        ? 'text-[#7C3AED] dark:text-[#A78BFA]'
                        : 'text-slate-400 dark:text-[#9DA2B4]'
                    }`}
                  />
                  <span
                    className={`truncate ${
                      isSelected
                        ? 'font-medium text-[#7C3AED] dark:text-white'
                        : 'text-slate-700 dark:text-[#9DA2B4]'
                    }`}
                  >
                    {group}
                  </span>
                </div>

                {/* Checkmark no lado direito se selecionado */}
                {isSelected && (
                  <Check size={14} className="text-[#7C3AED] dark:text-[#A78BFA] shrink-0 ml-2" />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DropdownSeletorGrupos;

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, Copy, Trash2, CloudDownload } from 'lucide-react';

interface MenuAcoesPerfilProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRect: DOMRect | null;
  onEditFull: (tab?: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onRestoreCloud?: () => void;
}

export const MenuAcoesPerfil: React.FC<MenuAcoesPerfilProps> = ({
  isOpen,
  onClose,
  anchorRect,
  onEditFull,
  onDuplicate,
  onDelete,
  onRestoreCloud,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !anchorRect) return null;

  // Calcula posição para não estourar a tela verticalmente
  const menuHeight = 210;
  const isNearBottom = anchorRect.bottom + menuHeight > window.innerHeight;
  const top = isNearBottom
    ? Math.max(10, anchorRect.top - menuHeight - 4)
    : anchorRect.bottom + 4;
  const right = Math.max(10, window.innerWidth - anchorRect.right);

  const menuContent = (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        top: `${top}px`,
        right: `${right}px`,
        zIndex: 9999,
      }}
      className="animate-in fade-in zoom-in-95 w-44 rounded-lg border border-slate-200 dark:border-[#303241] bg-white dark:bg-[#1a1b24] p-1.5 shadow-xl shadow-slate-900/10 dark:shadow-2xl dark:shadow-black/80 duration-100 select-none"
    >
      {/* Grupo Superior */}
      <div className="space-y-0.5">
        <button
          type="button"
          onClick={() => {
            onClose();
            onEditFull('geral');
          }}
          className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[12px] font-normal text-slate-700 dark:text-[#E1E3EB] transition-colors hover:bg-slate-100 dark:hover:bg-[#2A2B38] hover:text-slate-900 dark:hover:text-white"
        >
          <Pencil size={13} className="text-slate-400 dark:text-[#8E92A2]" />
          <span>Editar</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onClose();
            onDuplicate();
          }}
          className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[12px] font-normal text-slate-700 dark:text-[#E1E3EB] transition-colors hover:bg-slate-100 dark:hover:bg-[#2A2B38] hover:text-slate-900 dark:hover:text-white"
        >
          <Copy size={13} className="text-slate-400 dark:text-[#8E92A2]" />
          <span>Copiar</span>
        </button>

        {onRestoreCloud && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onRestoreCloud();
            }}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[12px] font-normal text-slate-600 dark:text-[#C8CBD6] transition-colors hover:bg-slate-100 dark:hover:bg-[#2A2B38] hover:text-slate-900 dark:hover:text-white"
          >
            <CloudDownload size={13} className="text-emerald-600 dark:text-[#8E92A2]" />
            <span>Restaurar da Nuvem</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            onClose();
            onDelete();
          }}
          className="flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[12px] font-normal text-red-500 dark:text-[#ff5a6e] transition-colors hover:bg-red-50 dark:hover:bg-[#ff334b]/12 hover:text-red-600 dark:hover:text-[#ff334b]"
        >
          <Trash2 size={13} className="text-red-500/80 dark:text-[#ff5a6e]/80" />
          <span>Apagar</span>
        </button>
      </div>

      {/* Linha Divisória */}
      <div className="my-1.5 border-t border-slate-100 dark:border-[#292B38]" />

      {/* Grupo Inferior: Edição Direta por Abas (Estilo AdsPower) */}
      <div className="space-y-0.5">
        <button
          type="button"
          onClick={() => {
            onClose();
            onEditFull('proxy');
          }}
          className="flex w-full cursor-pointer items-center rounded-md px-2.5 py-1.5 text-left text-[12px] font-normal text-slate-600 dark:text-[#C8CBD6] transition-colors hover:bg-slate-100 dark:hover:bg-[#2A2B38] hover:text-slate-900 dark:hover:text-white"
        >
          <span>Editar proxy</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onClose();
            onEditFull('plataforma');
          }}
          className="flex w-full cursor-pointer items-center rounded-md px-2.5 py-1.5 text-left text-[12px] font-normal text-slate-600 dark:text-[#C8CBD6] transition-colors hover:bg-slate-100 dark:hover:bg-[#2A2B38] hover:text-slate-900 dark:hover:text-white"
        >
          <span>Editar conta</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onClose();
            onEditFull('impressao');
          }}
          className="flex w-full cursor-pointer items-center rounded-md px-2.5 py-1.5 text-left text-[12px] font-normal text-slate-600 dark:text-[#C8CBD6] transition-colors hover:bg-slate-100 dark:hover:bg-[#2A2B38] hover:text-slate-900 dark:hover:text-white"
        >
          <span>Editar impressão digital</span>
        </button>
      </div>
    </div>
  );

  return createPortal(menuContent, document.body);
};

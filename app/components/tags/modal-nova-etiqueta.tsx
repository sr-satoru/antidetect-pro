import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Check } from 'lucide-react';
import { TAG_COLORS, DEFAULT_TAG_COLOR } from './tag-palette';
import { TagItem } from '../../services/tags/service.tags';

interface ModalNovaEtiquetaProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { id?: string; name: string; color: string }) => Promise<void>;
  tagParaEditar?: TagItem | null;
}

export const ModalNovaEtiqueta: React.FC<ModalNovaEtiquetaProps> = ({
  isOpen,
  onClose,
  onSave,
  tagParaEditar,
}) => {
  const [selectedColor, setSelectedColor] = useState<string>(DEFAULT_TAG_COLOR);
  const [nome, setNome] = useState('');
  const [erro, setErro] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (tagParaEditar) {
        setNome(tagParaEditar.name);
        setSelectedColor(tagParaEditar.color || DEFAULT_TAG_COLOR);
      } else {
        setNome('');
        setSelectedColor(DEFAULT_TAG_COLOR);
      }
      setErro(false);
    }
  }, [isOpen, tagParaEditar]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nome.trim();
    if (!trimmed) {
      setErro(true);
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        id: tagParaEditar?.id,
        name: trimmed,
        color: selectedColor,
      });
      onClose();
    } catch (err: any) {
      alert(`Erro ao salvar etiqueta: ${err.message || 'Falha na requisição'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-[460px] rounded-xl border border-[#303241] bg-[#1E2028] shadow-2xl shadow-black/80 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2C2E3B] px-5 py-4">
          <h3 className="text-[15px] font-semibold text-[#E1E4EE]">
            {tagParaEditar ? 'Editar Etiqueta' : 'Nova Etiqueta'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[#8E92A2] hover:bg-[#2A2C38] hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Seletor de Cores */}
          <div className="flex items-center gap-3">
            {TAG_COLORS.map((c) => {
              const isSelected =
                c.hex.toLowerCase() === selectedColor.toLowerCase();
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedColor(c.hex)}
                  style={{ backgroundColor: c.hex }}
                  className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full transition-transform hover:scale-110 active:scale-95 shadow-sm"
                  title={c.name}
                >
                  {isSelected && <Check size={13} className="text-white stroke-[3]" />}
                </button>
              );
            })}
          </div>

          {/* Campo de Nome da Etiqueta */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <label className="text-[13px] text-[#A6ABB9] select-none whitespace-nowrap">
                <span className="text-[#FF4D4F] mr-1">*</span>Etiqueta
              </label>
              <div className="relative flex-1">
                <input
                  type="text"
                  maxLength={50}
                  value={nome}
                  onChange={(e) => {
                    setNome(e.target.value);
                    if (erro && e.target.value.trim()) setErro(false);
                  }}
                  placeholder="Por favor, insira."
                  className={`w-full rounded-md border bg-[#14151B] px-3 py-2 pr-14 text-[13px] text-white placeholder-[#585B6A] focus:outline-hidden transition-colors ${
                    erro
                      ? 'border-[#FF4D4F] focus:border-[#FF4D4F]'
                      : 'border-[#303241] focus:border-[#1677FF]'
                  }`}
                  autoFocus
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#6C7082] select-none">
                  {nome.length} / 50
                </span>
              </div>
            </div>
            {erro && (
              <p className="text-[11px] text-[#FF4D4F] pl-20 animate-in fade-in duration-100">
                Por favor, insira.
              </p>
            )}
          </div>

          {/* Botões OK e Cancelar */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="h-8 min-w-[76px] cursor-pointer rounded-md bg-[#1677FF] px-4 text-xs font-semibold text-white shadow-xs transition-all hover:bg-[#0E63D8] active:scale-[0.98] disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando...' : 'OK'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-8 cursor-pointer rounded-md px-3 text-xs font-medium text-[#8E92A2] transition-colors hover:bg-[#2A2C38] hover:text-white"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ModalNovaEtiqueta;

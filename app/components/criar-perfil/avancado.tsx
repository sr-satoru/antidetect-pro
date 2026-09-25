import React, { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface AvancadoTabProps {
  formData: any;
  onChange: (key: string, value: any) => void;
}

const EXTENSION_OPTIONS = [
  {
    id: 'team',
    label: 'Usar extensões da equipe',
    desc: (
      <>
        As extensões habilitadas de{' '}
        <span className="text-[#9BA1B4]">
          [Extensões - Extensões da equipe]
        </span>{' '}
        serão instaladas no perfil
      </>
    ),
  },
  {
    id: 'none',
    label: 'Não usar extensões',
    desc: <>Nenhuma extensão será pré-instalada neste perfil</>,
  },
];

export const AvancadoTab: React.FC<AvancadoTabProps> = ({
  formData,
  onChange,
}) => {
  const [showExtensionDropdown, setShowExtensionDropdown] = useState(false);

  const currentMode = formData.extensionMode || 'team';
  const currentOption =
    EXTENSION_OPTIONS.find((opt) => opt.id === currentMode) ||
    EXTENSION_OPTIONS[0];

  const handleSelectMode = (modeId: string) => {
    onChange('extensionMode', modeId);
    setShowExtensionDropdown(false);
  };

  return (
    <div className="flex-1 space-y-4 pr-1 text-[#D2D5DF]">
      {/* Campo Extensões conforme o layout padrão */}
      <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:items-start sm:gap-4">
        <label className="shrink-0 pt-2 text-left text-[13px] text-[#A6ABB9] select-none sm:w-[130px] sm:text-right">
          Extensões
        </label>

        <div className="flex-1 max-w-2xl">
          {/* Dropdown Seletor */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowExtensionDropdown(!showExtensionDropdown)}
              className="flex min-h-[38px] w-full cursor-pointer items-center justify-between rounded-md border border-[#3A3D4B] bg-[#1E1F27] px-3.5 py-2 text-[13px] text-[#E0E2EC] transition-colors hover:border-[#4B4E5E] focus:border-[#2F80ED] focus:outline-none"
            >
              <span>{currentOption.label}</span>
              <ChevronDown
                size={14}
                className={`text-[#7B7F91] transition-transform duration-150 ${
                  showExtensionDropdown ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showExtensionDropdown && (
              <div className="absolute top-full left-0 z-30 mt-1 w-full rounded-md border border-[#383A49] bg-[#22232C] py-1 shadow-2xl">
                {EXTENSION_OPTIONS.map((opt) => {
                  const isSelected = opt.id === currentMode;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleSelectMode(opt.id)}
                      className={`flex cursor-pointer items-center justify-between px-3.5 py-2.5 text-[12.5px] transition-colors ${
                        isSelected
                          ? 'bg-[#1D2536] font-medium text-white'
                          : 'text-[#C5C8D6] hover:bg-[#2B2D38] hover:text-white'
                      }`}
                    >
                      <span>{opt.label}</span>
                      {isSelected && (
                        <Check size={14} className="text-[#2F80ED]" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Subtítulo / Descrição */}
          <p className="pt-1.5 text-[12px] text-[#6E7385] leading-relaxed">
            {currentOption.desc}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AvancadoTab;

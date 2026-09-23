import React from 'react';

interface AvancadoTabProps {
  formData: any;
  onChange: (key: string, value: any) => void;
}

export const AvancadoTab: React.FC<AvancadoTabProps> = ({
  formData,
  onChange,
}) => {
  return (
    <div className="flex-1 space-y-4 pr-1 text-[#D2D5DF]">
      <div className="flex items-center gap-3">
        <span className="text-[12px] font-medium text-[#7E8294] select-none">
          Configurações Avançadas
        </span>
        <div className="h-[1px] flex-1 bg-[#2E303B]" />
      </div>

      <div className="rounded-lg border border-[#333541] bg-[#1C1D24] p-8 text-center text-[#8E92A2]">
        <span className="mb-1 block text-sm font-medium text-white">
          Recursos Avançados de Automação
        </span>
        <p className="text-xs text-[#707486]">
          Configuração de scripts em segundo plano, porta de depuração remota e
          extensões do navegador.
        </p>
      </div>
    </div>
  );
};

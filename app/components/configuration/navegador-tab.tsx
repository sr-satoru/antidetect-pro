import React from 'react';
import { GeralTab } from '@/components/criar-perfil/geral';
import { ProxyTab } from '@/components/criar-perfil/proxy';
import { PlataformaTab } from '@/components/criar-perfil/plataforma';
import { ImpressaoDigitalTab } from '@/components/criar-perfil/impressoes';
import { AvancadoTab } from '@/components/criar-perfil/avancado';

export interface NavegadorTabProps {
  formData: any;
  onChange: (key: string, value: any) => void;
  onSave: () => void;
  onReset: () => void;
}

export const NavegadorTab: React.FC<NavegadorTabProps> = ({
  formData,
  onChange,
  onSave,
  onReset,
}) => {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 focus-visible:outline-none">
      {/* ─── Seção 1: Geral ────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 pt-2">
          <span className="text-[12px] font-medium text-slate-500 dark:text-[#7E8294] select-none">
            Geral
          </span>
          <div className="h-[1px] flex-1 bg-slate-200 dark:bg-white/10" />
        </div>
        <GeralTab formData={formData} onChange={onChange} />
      </div>

      {/* ─── Seção 2: Proxy ────────────────────────────────────── */}
      <div className="space-y-4">
        <ProxyTab formData={formData} onChange={onChange} />
      </div>

      {/* ─── Seção 3: Plataforma ────────────────────────────────── */}
      <div className="space-y-4">
        <PlataformaTab formData={formData} onChange={onChange} />
      </div>

      {/* ─── Seção 4: Impressão Digital (Fingerprint) ───────────── */}
      <div className="space-y-4">
        <ImpressaoDigitalTab formData={formData} onChange={onChange} />
      </div>

      {/* ─── Seção 5: Avançado ──────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 pt-2">
          <span className="text-[12px] font-medium text-slate-500 dark:text-[#7E8294] select-none">
            Avançado
          </span>
          <div className="h-[1px] flex-1 bg-slate-200 dark:bg-white/10" />
        </div>
        <AvancadoTab formData={formData} onChange={onChange} />
      </div>

      {/* ─── Ações Inferiores (Conforme referência do sistema) ───── */}
      <div className="flex items-center gap-4 pt-6 pb-4 border-t border-slate-200/60 dark:border-white/[0.06]">
        <button
          type="button"
          onClick={onSave}
          className="rounded-lg bg-[#1877F2] hover:bg-[#166fe5] px-6 py-2.5 text-[13px] font-semibold text-white shadow-xs transition-all cursor-pointer active:scale-[0.98]"
        >
          Gravar a Configuração
        </button>
        <button
          type="button"
          onClick={onReset}
          className="text-[13px] text-slate-500 hover:text-slate-800 dark:text-[#8E92A2] dark:hover:text-white transition-colors cursor-pointer select-none"
        >
          Restaurar configurações padrão
        </button>
      </div>
    </div>
  );
};

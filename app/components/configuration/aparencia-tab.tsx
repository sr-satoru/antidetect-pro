import React, { useState } from 'react';
import { Palette, Moon, Sun, Check, Volume2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/contexts/theme-context';
import { appUpdateService, CURRENT_APP_VERSION } from '@/services/app-update/service.update';
import { toast } from '@/components/ui/notification';

export interface AparenciaTabProps {
  soundEnabled: boolean;
  onSoundEnabledChange: (enabled: boolean) => void;
}

export const AparenciaTab: React.FC<AparenciaTabProps> = ({
  soundEnabled,
  onSoundEnabledChange,
}) => {
  const { theme, setTheme } = useTheme();
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    try {
      const res = await appUpdateService.checkForAppUpdate();
      if (res?.hasUpdate) {
        toast.info(`Atualização disponível: ${res.latestVersion}`);
      } else {
        toast.success('O Star Multilogin já está na versão mais recente!');
      }
    } catch {
      toast.error('Falha ao verificar atualizações.');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 focus-visible:outline-none">
      {/* Escolha do Tema Visual com Mini Previews */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#18191E] p-6 space-y-4 shadow-xs">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Palette size={16} className="text-[#7C3AED] dark:text-[#A78BFA]" />
            <span>Tema da Interface do Aplicativo</span>
          </h4>
          <p className="text-xs text-slate-500 dark:text-[#9DA2B4] mt-0.5">
            Alterne instantaneamente a paleta visual entre o modo escuro profundo e o modo claro nítido.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Preview Card Dark */}
          <div
            onClick={() => setTheme('dark')}
            className={`group relative flex flex-col p-4 rounded-2xl border transition-all cursor-pointer select-none ${
              theme === 'dark'
                ? 'border-[#7C3AED] dark:border-[#A78BFA] bg-violet-50/15 dark:bg-[#7C3AED]/15 ring-2 ring-[#7C3AED]/30 shadow-md'
                : 'border-slate-200/80 dark:border-[#2D3039] bg-slate-50/50 dark:bg-[#1F2026] hover:border-slate-300 dark:hover:border-[#4B5063]'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#202126] text-white border border-white/10">
                  <Moon size={14} />
                </div>
                <span className="font-semibold text-xs text-slate-900 dark:text-white">
                  Modo Escuro (Padrão)
                </span>
              </div>
              {theme === 'dark' && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#7C3AED] text-white shadow-xs">
                  <Check size={10} strokeWidth={3} />
                </span>
              )}
            </div>

            {/* Realistic Window Preview */}
            <div className="w-full h-24 rounded-xl bg-[#202126] border border-white/10 p-2.5 flex flex-col justify-between overflow-hidden shadow-inner">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-red-500/80" />
                  <div className="h-2 w-2 rounded-full bg-amber-500/80" />
                  <div className="h-2 w-2 rounded-full bg-[#7C3AED]/80" />
                </div>
                <div className="h-2 w-16 rounded bg-white/[0.06]" />
              </div>
              <div className="flex items-center gap-2.5 pt-1">
                <div className="w-8 h-10 rounded-md bg-white/[0.04]" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2 w-3/4 rounded bg-white/10" />
                  <div className="h-2 w-1/2 rounded bg-[#7C3AED]/70" />
                </div>
              </div>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-[#9DA2B4] mt-2.5 block">
              Conforto visual calibrado para operações prolongadas de antidetecção.
            </span>
          </div>

          {/* Preview Card Light */}
          <div
            onClick={() => setTheme('light')}
            className={`group relative flex flex-col p-4 rounded-2xl border transition-all cursor-pointer select-none ${
              theme === 'light'
                ? 'border-[#7C3AED] dark:border-[#A78BFA] bg-violet-50/20 dark:bg-[#7C3AED]/15 ring-2 ring-[#7C3AED]/30 shadow-md'
                : 'border-slate-200/80 dark:border-[#2D3039] bg-slate-50/50 dark:bg-[#1F2026] hover:border-slate-300 dark:hover:border-[#4B5063]'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
                  <Sun size={14} />
                </div>
                <span className="font-semibold text-xs text-slate-900 dark:text-white">
                  Modo Claro
                </span>
              </div>
              {theme === 'light' && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#7C3AED] text-white shadow-xs">
                  <Check size={10} strokeWidth={3} />
                </span>
              )}
            </div>

            {/* Realistic Window Preview */}
            <div className="w-full h-24 rounded-xl bg-white border border-slate-200 p-2.5 flex flex-col justify-between overflow-hidden shadow-inner">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-red-400" />
                  <div className="h-2 w-2 rounded-full bg-amber-400" />
                  <div className="h-2 w-2 rounded-full bg-[#7C3AED]/80" />
                </div>
                <div className="h-2 w-16 rounded bg-slate-100" />
              </div>
              <div className="flex items-center gap-2.5 pt-1">
                <div className="w-8 h-10 rounded-md bg-slate-100" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2 w-3/4 rounded bg-slate-200" />
                  <div className="h-2 w-1/2 rounded bg-[#7C3AED]/70" />
                </div>
              </div>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-[#9DA2B4] mt-2.5 block">
              Ambiente com alta luminosidade e definição nítida de bordas e tipografia.
            </span>
          </div>
        </div>
      </div>

      {/* Preferências de Sistema e Notificações */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#18191E] p-6 space-y-4 shadow-xs">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Volume2 size={16} className="text-[#7C3AED] dark:text-[#A78BFA]" />
            <span>Sons & Versão do Software</span>
          </h4>
          <p className="text-xs text-slate-500 dark:text-[#9DA2B4] mt-0.5">
            Feedback sensorial e checagem de novas releases oficiais.
          </p>
        </div>

        <div className="divide-y divide-slate-200/80 dark:divide-white/[0.06] text-xs">
          {/* Som Switch */}
          <div className="py-3.5 flex items-center justify-between gap-4">
            <div>
              <span className="font-semibold text-slate-900 dark:text-white text-xs">
                Sons de Notificação
              </span>
              <p className="text-slate-500 dark:text-[#9DA2B4] mt-0.5">
                Dispara um feedback sonoro sutil ao concluir backups e sincronizações em nuvem.
              </p>
            </div>
            <Switch
              checked={soundEnabled}
              onCheckedChange={onSoundEnabledChange}
            />
          </div>

          {/* App Version Info */}
          <div className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="font-semibold text-slate-900 dark:text-white text-xs">
                Star Multilogin Core
              </span>
              <p className="text-slate-500 dark:text-[#9DA2B4] mt-0.5">
                Versão estável atual: <span className="font-mono font-bold text-slate-700 dark:text-[#C4C7D5]">v{CURRENT_APP_VERSION}</span>
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={isCheckingUpdate}
              onClick={handleCheckUpdate}
              className="h-9 px-4 rounded-lg border border-slate-200/80 dark:border-[#2D3039] bg-white dark:bg-[#1F2026] hover:bg-slate-50 dark:hover:bg-[#282A33] text-slate-700 dark:text-[#E2E4EC] text-xs font-medium gap-2 shrink-0"
            >
              <Download size={14} className={isCheckingUpdate ? 'animate-bounce' : ''} />
              <span>{isCheckingUpdate ? 'Consultando...' : 'Verificar Atualizações'}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, Zap, Server, Lock, Activity, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { serviceSync } from '@/services/sync/service.sync';
import { toast } from '@/components/ui/notification';
import { Button } from '@/components/ui/button';

export const ContaTab: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [cloudOnline, setCloudOnline] = useState<boolean | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    let isMounted = true;
    serviceSync
      .checkHealth()
      .then((res) => {
        if (isMounted) setCloudOnline(res.cloud_online);
      })
      .catch(() => {
        if (isMounted) setCloudOnline(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSyncNow = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await serviceSync.syncProfiles(undefined, true);
      toast.success('Sincronização bidirecional concluída com sucesso!');
    } catch {
      toast.error('Erro ao conectar com servidor de sincronização.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 focus-visible:outline-none">
      {/* Hero Card do Usuário */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-[#484A54] bg-white dark:bg-[#28292E] p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#7C3AED] to-[#A78BFA] text-white text-lg font-bold shadow-md shadow-[#7C3AED]/20">
              {!user?.is_offline && user?.email ? (
                user?.username ? (
                  user.username.charAt(0).toUpperCase()
                ) : (
                  'U'
                )
              ) : (
                <User size={24} />
              )}
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white dark:bg-[#28292E]">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    !user?.is_offline ? 'bg-emerald-500' : 'bg-slate-400'
                  }`}
                />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  {!user?.is_offline && user?.email
                    ? user.email
                    : 'Workspace Local Isolado'}
                </h3>
                <span className="rounded-full bg-[#7C3AED]/15 border border-[#7C3AED]/30 px-2.5 py-0.5 text-[10px] font-bold text-[#A78BFA] uppercase tracking-wider">
                  {!user?.is_offline
                    ? (user?.plan || 'PRO LIFETIME').toUpperCase()
                    : 'OFFLINE MODE'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#8E92A2] mt-1 leading-relaxed">
                {!user?.is_offline
                  ? 'Sessão autenticada e vinculada à nuvem Star Multilogin VPS.'
                  : 'Modo seguro local: dados de perfis e cookies residem exclusivamente no seu disco rígido.'}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            {!user?.is_offline ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={logout}
                className="h-[38px] px-4 rounded-lg gap-2 text-[13px] font-medium shadow-xs"
              >
                <LogOut size={14} />
                <span>Desconectar Sessão</span>
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate('/auth/login')}
                className="h-[38px] px-4 rounded-lg gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-[13px] font-medium shadow-xs"
              >
                <Zap size={14} />
                <span>Conectar à Nuvem</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Hub de Telemetria e Sincronização */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-[#484A54] bg-white dark:bg-[#28292E] p-6 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#7C3AED]/10 text-[#A78BFA]">
              <Server size={18} />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                Rede de Sincronização em Nuvem (Star VPS)
              </h4>
              <p className="text-xs text-slate-500 dark:text-[#8E92A2]">
                Infraestrutura global de replicação de perfis, tags e proxies com criptografia AES-256.
              </p>
            </div>
          </div>
        </div>

        {/* Status Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-[#484A54] bg-slate-50/70 dark:bg-[#323338]">
            <span className="text-[11px] font-medium text-slate-500 dark:text-[#8E92A2] block">
              Estado do Servidor
            </span>
            <div className="flex items-center gap-2 mt-1.5">
              <span
                className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                  cloudOnline === true
                    ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                    : 'bg-amber-500'
                }`}
              />
              <span className="text-xs font-semibold text-slate-900 dark:text-white">
                {cloudOnline === true ? 'Operacional (Online)' : 'Modo Standby'}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-[#484A54] bg-slate-50/70 dark:bg-[#323338]">
            <span className="text-[11px] font-medium text-slate-500 dark:text-[#8E92A2] block">
              Criptografia Local
            </span>
            <div className="flex items-center gap-2 mt-1.5 text-xs font-semibold text-slate-900 dark:text-white">
              <Lock size={13} className="text-[#A78BFA]" />
              <span>AES-256-GCM Nativo</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-[#484A54] bg-slate-50/70 dark:bg-[#323338]">
            <span className="text-[11px] font-medium text-slate-500 dark:text-[#8E92A2] block">
              Tipo de Replicação
            </span>
            <div className="flex items-center gap-2 mt-1.5 text-xs font-semibold text-slate-900 dark:text-white">
              <Activity size={13} className="text-indigo-400" />
              <span>Bidirecional Ativa</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/80 dark:border-[#484A54]">
          <span className="text-xs text-slate-500 dark:text-[#8E92A2]">
            Sincronize alterações pendentes de múltiplos computadores instantaneamente.
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={isSyncing}
            onClick={handleSyncNow}
            className="h-[38px] px-4 rounded-lg border border-slate-200/80 dark:border-[#484A54] bg-white dark:bg-[#323338] hover:bg-slate-50 dark:hover:bg-[#3A3B42] text-slate-700 dark:text-[#E4E6EE] text-[13px] font-medium gap-2"
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

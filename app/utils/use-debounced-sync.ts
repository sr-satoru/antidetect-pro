import { useRef, useCallback } from 'react';
import { servicePerfis } from '../services/perfis/service.perfis';
import { toast } from 'sonner';

/**
 * Hook de Auto-Sync inteligente com Debounce anti-sobrecarga (5 segundos).
 * Agrupa alterações de digitação, tags e configurações em uma única requisição.
 */
export function useDebouncedSync(delayMs = 5000) {
  const timers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // 1. Sincronização com Delay de 5 Segundos (Digitação, Tags, Observações, Proxy)
  const triggerDebouncedSync = useCallback(
    (profileId: string, profileName?: string) => {
      if (!profileId) return;

      // Reinicia o cronômetro se o usuário continuar interagindo
      if (timers.current.has(profileId)) {
        clearTimeout(timers.current.get(profileId)!);
      }

      const timer = setTimeout(async () => {
        try {
          const res = await servicePerfis.syncToCloud(profileId);
          if (res?.size_kb) {
            toast.success(
              `Perfil ${profileName || profileId} auto-sincronizado (${res.size_kb} KB)`,
              { id: `auto-sync-${profileId}`, duration: 2500 }
            );
          }
        } catch {
          // Silencioso se estiver em modo offline
        } finally {
          timers.current.delete(profileId);
        }
      }, delayMs);

      timers.current.set(profileId, timer);
    },
    [delayMs]
  );

  // 2. Sincronização Instantânea (0 Delay — Criar Perfil ou Botão Manual)
  const triggerInstantSync = useCallback(
    async (profileId: string, profileName?: string) => {
      if (!profileId) return;

      // Cancela qualquer timer pendente para evitar chamada duplicada
      if (timers.current.has(profileId)) {
        clearTimeout(timers.current.get(profileId)!);
        timers.current.delete(profileId);
      }

      try {
        const res = await servicePerfis.syncToCloud(profileId);
        if (res?.size_kb) {
          toast.success(
            `Perfil ${profileName || profileId} sincronizado na nuvem! (${res.size_kb} KB)`,
            { id: `sync-${profileId}` }
          );
        }
        return res;
      } catch (err: any) {
        // Propaga erro para quem chamou manualmente se necessário
        throw err;
      }
    },
    []
  );

  return { triggerDebouncedSync, triggerInstantSync };
}

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/index.api';

export interface RegisteredExtension {
  id: number;
  name: string;
  iconType?: string;
  iconUrl?: string;
  iconBg?: string;
  enabled: boolean;
  status: 'available' | 'disabled' | string;
  description?: string;
  provider?: string;
  providerUrl?: string;
  tab?: string;
  category?: string;
  version?: string;
}

export interface FetchExtensionsOptions {
  onlyEnabled?: boolean;
  category?: string;
}

/**
 * Busca a lista de extensões cadastradas no backend
 */
export async function fetchRegisteredExtensions(
  options: FetchExtensionsOptions = {},
): Promise<RegisteredExtension[]> {
  try {
    const list = await api.extensions.list();
    if (!Array.isArray(list)) {
      return [];
    }

    let filtered = list;

    if (options.onlyEnabled) {
      filtered = filtered.filter((ext) => ext.enabled !== false);
    }

    if (options.category && options.category !== 'all') {
      filtered = filtered.filter(
        (ext) =>
          ext.category?.toLowerCase() === options.category?.toLowerCase(),
      );
    }

    return filtered;
  } catch (error) {
    console.error('Erro ao buscar extensões registradas:', error);
    return [];
  }
}

/**
 * Hook do React para carregar e sincronizar as extensões registradas
 */
export function useRegisteredExtensions(options: FetchExtensionsOptions = {}) {
  const [extensions, setExtensions] = useState<RegisteredExtension[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadExtensions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRegisteredExtensions(options);
      setExtensions(data);
    } catch (err: any) {
      const msg = err?.message || 'Falha ao carregar extensões registradas';
      setError(msg);
      setExtensions([]);
    } finally {
      setLoading(false);
    }
  }, [options.onlyEnabled, options.category]);

  useEffect(() => {
    loadExtensions();
  }, [loadExtensions]);

  return {
    extensions,
    loading,
    error,
    refetch: loadExtensions,
  };
}

/**
 * Retorna as extensões ativas habilitadas
 */
export function getEnabledExtensions(
  extensions: RegisteredExtension[],
): RegisteredExtension[] {
  return extensions.filter((ext) => ext.enabled);
}

/**
 * Agrupa extensões por categoria
 */
export function groupExtensionsByCategory(
  extensions: RegisteredExtension[],
): Record<string, RegisteredExtension[]> {
  return extensions.reduce(
    (acc, ext) => {
      const cat = ext.category || 'Geral';
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(ext);
      return acc;
    },
    {} as Record<string, RegisteredExtension[]>,
  );
}

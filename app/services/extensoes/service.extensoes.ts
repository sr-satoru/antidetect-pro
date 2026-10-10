import { useState, useEffect, useCallback } from 'react';
import { http } from '../http';

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
  provider_url?: string;
  tab?: string;
  category?: string;
  version?: string;
}

export interface FetchExtensionsOptions {
  onlyEnabled?: boolean;
  category?: string;
}

/**
 * Service de Extensões — Comunicação direta com a API do backend Rust (/api/extensions)
 */
export const serviceExtensoes = {
  list: () => http.get<RegisteredExtension[]>('/api/extensions'),

  create: (data: any) => http.post<any>('/api/extensions', data),

  upload: (formData: FormData) =>
    http.post<any>('/api/extensions/upload', formData),

  update: (id: string | number, data: any) =>
    http.put<any>(`/api/extensions/${id}`, data),

  delete: (id: string | number) =>
    http.delete<any>(`/api/extensions/${id}`),

  getCatalog: (params?: any) =>
    http.get<any[]>('/api/extensions/catalog', { params }),

  /**
   * Busca e filtra extensões cadastradas no backend
   */
  async fetchFiltered(
    options: FetchExtensionsOptions = {},
  ): Promise<RegisteredExtension[]> {
    try {
      const list = await serviceExtensoes.list();
      if (!Array.isArray(list)) return [];

      let filtered = list;
      if (options.onlyEnabled) {
        filtered = filtered.filter((ext) => ext.enabled !== false);
      }
      if (options.category && options.category !== 'all') {
        filtered = filtered.filter(
          (ext) => ext.category?.toLowerCase() === options.category?.toLowerCase(),
        );
      }
      return filtered;
    } catch (error) {
      console.error('[serviceExtensoes] Erro ao buscar extensões:', error);
      return [];
    }
  },

  /**
   * Retorna apenas as extensões habilitadas
   */
  getEnabled(extensions: RegisteredExtension[]): RegisteredExtension[] {
    return extensions.filter((ext) => ext.enabled);
  },

  /**
   * Agrupa extensões por categoria
   */
  groupByCategory(
    extensions: RegisteredExtension[],
  ): Record<string, RegisteredExtension[]> {
    return extensions.reduce(
      (acc, ext) => {
        const cat = ext.category || 'Geral';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(ext);
        return acc;
      },
      {} as Record<string, RegisteredExtension[]>,
    );
  },
};

/**
 * Hook reativo para consumo nos componentes de interface
 */
export function useRegisteredExtensions(options: FetchExtensionsOptions = {}) {
  const [extensions, setExtensions] = useState<RegisteredExtension[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await serviceExtensoes.fetchFiltered(options);
      setExtensions(data);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar extensões');
      setExtensions([]);
    } finally {
      setLoading(false);
    }
  }, [options.onlyEnabled, options.category]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    extensions,
    loading,
    error,
    refetch: load,
  };
}

export default serviceExtensoes;

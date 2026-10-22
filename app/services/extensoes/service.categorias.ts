import { useState, useEffect, useCallback } from 'react';
import { http } from '../http';
import { serviceExtensoes } from './service.extensoes';

export interface ExtensionItemSummary {
  id: string | number;
  name: string;
  iconUrl?: string;
  iconType?: string;
  iconBg?: string;
  description?: string;
  provider?: string;
  providerUrl?: string;
}

export interface ExtensionCategory {
  id: string;
  name: string;
  description?: string;
  extensionIds: (string | number)[];
  extensions: ExtensionItemSummary[];
  isDefault?: boolean;
}

const DEFAULT_KIT_BASICO: ExtensionCategory = {
  id: 'kit_basico',
  name: 'kit basico',
  description: 'Extensões padrão essenciais para o perfil',
  extensionIds: [],
  extensions: [],
  isDefault: true,
};

/**
 * Service de Categorias de Extensões — Comunicação direta com SQLite/Vault no Rust (/api/extension-categories).
 * Zero localStorage, zero persistência paralela no navegador.
 */
export const serviceCategorias = {
  list: () => http.get<ExtensionCategory[]>('/api/extension-categories'),

  get: (id: string) => http.get<ExtensionCategory>(`/api/extension-categories/${id}`),

  create: (data: { name: string; description?: string; extensions?: any[] }) =>
    http.post<ExtensionCategory>('/api/extension-categories', data),

  update: (id: string, data: { name: string; description?: string; extensions?: any[] }) =>
    http.put<ExtensionCategory>(`/api/extension-categories/${id}`, data),

  delete: (id: string) =>
    http.delete<any>(`/api/extension-categories/${id}`),
};

/**
 * Hook reativo para gestão de categorias conectado exclusivamente à API do Rust
 */
export function useExtensionCategories() {
  const [categories, setCategories] = useState<ExtensionCategory[]>([DEFAULT_KIT_BASICO]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      const backendCategories = await serviceCategorias.list();
      if (Array.isArray(backendCategories) && backendCategories.length > 0) {
        const hasBasic = backendCategories.some((c) => c.id === 'kit_basico');
        setCategories(hasBasic ? backendCategories : [DEFAULT_KIT_BASICO, ...backendCategories]);
      } else {
        setCategories([DEFAULT_KIT_BASICO]);
      }
    } catch (err) {
      console.warn('[useExtensionCategories] Falha ao consultar backend, usando kit padrão:', err);
      setCategories([DEFAULT_KIT_BASICO]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const addCategory = async (data: {
    name: string;
    description?: string;
    extensions: ExtensionItemSummary[];
  }) => {
    const newCat = await serviceCategorias.create({
      name: data.name.trim(),
      description: data.description?.trim() || '',
      extensions: data.extensions,
    });
    setCategories((prev) => [...prev, newCat]);
    return newCat;
  };

  const updateCategory = async (
    id: string,
    data: {
      name: string;
      description?: string;
      extensions: ExtensionItemSummary[];
    },
  ) => {
    const updated = await serviceCategorias.update(id, {
      name: data.name.trim(),
      description: data.description?.trim() || '',
      extensions: data.extensions,
    });
    setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  };

  const removeCategory = async (id: string) => {
    if (id === 'kit_basico') return;
    await serviceCategorias.delete(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  return {
    categories,
    loading,
    refetch: loadCategories,
    addCategory,
    updateCategory,
    removeCategory,
  };
}

/**
 * Busca de extensões no catálogo com mesclagem com as extensões da equipe
 */
export async function searchExtensionsForCategory(
  query: string,
  teamExtensions: any[] = [],
): Promise<ExtensionItemSummary[]> {
  const q = query.trim().toLowerCase();
  const teamItems: ExtensionItemSummary[] = teamExtensions.map((ext) => ({
    id: ext.id,
    name: ext.name,
    iconUrl: ext.iconUrl,
    iconBg: ext.iconBg || '#7C3AED',
    description: ext.description,
    provider: ext.provider || 'Equipe',
    providerUrl: ext.providerUrl || ext.provider_url,
  }));

  if (!q) return teamItems;

  const filteredTeam = teamItems.filter((item) =>
    item.name.toLowerCase().includes(q),
  );

  try {
    const catalog = await serviceExtensoes.getCatalog({ q });
    if (Array.isArray(catalog)) {
      const external: ExtensionItemSummary[] = catalog.map((c) => ({
        id: c.id,
        name: c.name,
        iconUrl: c.iconUrl,
        iconBg: c.iconBg || '#7C3AED',
        description: c.description,
        provider: c.provider || 'Firefox Add-ons',
        providerUrl: c.providerUrl || c.provider_url || c.url,
      }));

      return [
        ...filteredTeam,
        ...external.filter(
          (ext) =>
            !filteredTeam.some(
              (t) => t.name.toLowerCase() === ext.name.toLowerCase(),
            ),
        ),
      ];
    }
  } catch {}

  return filteredTeam;
}

export default serviceCategorias;

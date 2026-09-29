import { useState, useEffect } from 'react';
import { api } from '@/services/index.api';

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

const STORAGE_KEY = 'star_extension_categories';
const CATEGORIES_EVENT = 'star_extension_categories_changed';

const DEFAULT_CATEGORIES: ExtensionCategory[] = [
  {
    id: 'kit_basico',
    name: 'kit basico',
    description: 'Extensões padrão essenciais para o perfil',
    extensionIds: [],
    extensions: [],
    isDefault: true,
  },
];

function loadCategories(): ExtensionCategory[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CATEGORIES;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_CATEGORIES;
    return parsed.some((c) => c.id === 'kit_basico')
      ? parsed
      : [...DEFAULT_CATEGORIES, ...parsed];
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

/**
 * Hook de estado sincronizado para categorias de extensões
 */
export function useExtensionCategories() {
  const [categories, setCategories] = useState<ExtensionCategory[]>(loadCategories);

  useEffect(() => {
    const handleUpdate = () => {
      setCategories(loadCategories());
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(CATEGORIES_EVENT, handleUpdate);
      window.addEventListener('storage', handleUpdate);
      return () => {
        window.removeEventListener(CATEGORIES_EVENT, handleUpdate);
        window.removeEventListener('storage', handleUpdate);
      };
    }
  }, []);

  const save = (updated: ExtensionCategory[]) => {
    setCategories(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(CATEGORIES_EVENT, { detail: updated }));
    }
  };

  const addCategory = (data: {
    name: string;
    description?: string;
    extensions: ExtensionItemSummary[];
  }) => {
    const current = loadCategories();
    const newCat: ExtensionCategory = {
      id: `cat_${Date.now()}`,
      name: data.name.trim(),
      description: data.description?.trim() || '',
      extensionIds: data.extensions.map((e) => e.id),
      extensions: data.extensions,
    };
    const updated = [...current, newCat];
    save(updated);
    return newCat;
  };

  const updateCategory = (
    id: string,
    data: {
      name: string;
      description?: string;
      extensions: ExtensionItemSummary[];
    },
  ) => {
    const current = loadCategories();
    const updated = current.map((c) =>
      c.id === id
        ? {
            ...c,
            name: data.name.trim(),
            description: data.description?.trim() || '',
            extensionIds: data.extensions.map((e) => e.id),
            extensions: data.extensions,
          }
        : c,
    );
    save(updated);
    return updated.find((c) => c.id === id) || null;
  };

  const removeCategory = (id: string) => {
    if (id === 'kit_basico') return;
    const current = loadCategories();
    save(current.filter((c) => c.id !== id));
  };

  /**
   * Enriquecimento retroativo automático para categorias salvas anteriormente sem providerUrl
   */
  const enrichCategoriesWithTeam = (teamExtensions: any[] = []) => {
    if (!teamExtensions || teamExtensions.length === 0) return;
    let modified = false;
    const updated = categories.map((cat) => {
      let catModified = false;
      const enrichedExts = (cat.extensions || []).map((ext) => {
        let url = ext.providerUrl;
        if (!url) {
          const match = teamExtensions.find(
            (t) => String(t.id) === String(ext.id) || t.name?.toLowerCase() === ext.name?.toLowerCase()
          );
          url = match?.providerUrl || match?.provider_url;
        }
        if (!url && ext.id && !String(ext.id).includes('/') && !String(ext.id).startsWith('local_') && isNaN(Number(ext.id))) {
          url = `https://addons.mozilla.org/firefox/addon/${ext.id}/`;
        }
        if (url && url !== ext.providerUrl) {
          catModified = true;
          return { ...ext, providerUrl: url };
        }
        return ext;
      });

      if (catModified) {
        modified = true;
        return { ...cat, extensions: enrichedExts };
      }
      return cat;
    });

    if (modified) {
      save(updated);
    }
  };

  return {
    categories,
    addCategory,
    updateCategory,
    removeCategory,
    enrichCategoriesWithTeam,
  };
}

/**
 * Busca de extensões simplificada para a seleção de categorias
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
    iconBg: ext.iconBg || '#2F80ED',
    description: ext.description,
    provider: ext.provider || 'Equipe',
    providerUrl: ext.providerUrl || ext.provider_url,
  }));

  if (!q) return teamItems;

  const filteredTeam = teamItems.filter((item) =>
    item.name.toLowerCase().includes(q),
  );

  try {
    const catalog = await api.extensions.getCatalog({ q });
    if (Array.isArray(catalog)) {
      const external: ExtensionItemSummary[] = catalog.map((c) => ({
        id: c.id,
        name: c.name,
        iconUrl: c.iconUrl,
        iconBg: c.iconBg || '#2F80ED',
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

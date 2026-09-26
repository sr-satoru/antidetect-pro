import { useState } from 'react';
import { api } from '@/services/index.api';

export interface ExtensionItemSummary {
  id: string | number;
  name: string;
  iconUrl?: string;
  iconType?: string;
  iconBg?: string;
  description?: string;
  provider?: string;
}

export interface ExtensionCategory {
  id: string;
  name: string;
  description?: string;
  extensionIds: (string | number)[];
  extensions: ExtensionItemSummary[];
  isDefault?: boolean;
}

const STORAGE_KEY = 'fury_extension_categories';

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
 * Hook simples de estado frontend para categorias de extensões
 */
export function useExtensionCategories() {
  const [categories, setCategories] = useState<ExtensionCategory[]>(loadCategories);

  const save = (updated: ExtensionCategory[]) => {
    setCategories(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const addCategory = (data: {
    name: string;
    description?: string;
    extensions: ExtensionItemSummary[];
  }) => {
    const newCat: ExtensionCategory = {
      id: `cat_${Date.now()}`,
      name: data.name.trim(),
      description: data.description?.trim() || '',
      extensionIds: data.extensions.map((e) => e.id),
      extensions: data.extensions,
    };
    save([...categories, newCat]);
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
    const updated = categories.map((c) =>
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
    save(categories.filter((c) => c.id !== id));
  };

  return {
    categories,
    addCategory,
    updateCategory,
    removeCategory,
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

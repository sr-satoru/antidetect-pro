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
 * Hook de estado sincronizado para categorias de extensões com persistência no SQLite do backend
 */
export function useExtensionCategories() {
  const [categories, setCategories] = useState<ExtensionCategory[]>(loadCategories);

  const save = (updated: ExtensionCategory[]) => {
    setCategories(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(CATEGORIES_EVENT, { detail: updated }));
    }
  };

  // Carrega e sincroniza com o banco de dados SQLite do backend
  useEffect(() => {
    let isCurrent = true;

    const fetchFromBackend = async () => {
      try {
        const backendCategories = await api.extensionCategories.list();
        if (isCurrent && Array.isArray(backendCategories) && backendCategories.length > 0) {
          // Garante que o kit basico está presente
          const hasBasic = backendCategories.some((c: any) => c.id === 'kit_basico');
          const merged: ExtensionCategory[] = hasBasic
            ? backendCategories
            : [...DEFAULT_CATEGORIES, ...backendCategories];

          save(merged);

          // Migra categorias locais que ainda não estejam no SQLite
          const localOnly = loadCategories().filter(
            (local) => !merged.some((b) => b.id === local.id)
          );
          for (const item of localOnly) {
            try {
              await api.extensionCategories.create({
                id: item.id,
                name: item.name,
                description: item.description,
                extensions: item.extensions || [],
              });
            } catch {}
          }
        }
      } catch (err) {
        // Fallback silencioso para localStorage se o backend estiver inicializando
      }
    };

    fetchFromBackend();

    const handleUpdate = () => {
      setCategories(loadCategories());
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(CATEGORIES_EVENT, handleUpdate);
      window.addEventListener('storage', handleUpdate);
      return () => {
        isCurrent = false;
        window.removeEventListener(CATEGORIES_EVENT, handleUpdate);
        window.removeEventListener('storage', handleUpdate);
      };
    }
  }, []);

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

    // Persiste no banco de dados SQLite
    api.extensionCategories
      .create({
        id: newCat.id,
        name: newCat.name,
        description: newCat.description,
        extensions: newCat.extensions,
      })
      .catch((err) => console.error('Erro ao persistir categoria no banco:', err));

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

    // Atualiza no banco de dados SQLite
    api.extensionCategories
      .update(id, {
        name: data.name.trim(),
        description: data.description?.trim() || '',
        extensions: data.extensions,
      })
      .catch((err) => console.error('Erro ao atualizar categoria no banco:', err));

    return updated.find((c) => c.id === id) || null;
  };

  const removeCategory = (id: string) => {
    if (id === 'kit_basico') return;
    const current = loadCategories();
    save(current.filter((c) => c.id !== id));

    // Remove do banco de dados SQLite
    api.extensionCategories
      .delete(id)
      .catch((err) => console.error('Erro ao remover categoria do banco:', err));
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
  } catch { }

  return filteredTeam;
}

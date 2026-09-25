import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/index.api';
import { RegisteredExtension } from './extensions';

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
  description?: string; // Observação
  extensionIds: (string | number)[];
  extensions: ExtensionItemSummary[];
  isDefault?: boolean;
  createdAt: string;
}

const STORAGE_KEY = 'fury_extension_categories';
const CATEGORY_CHANGE_EVENT = 'fury_extension_categories_changed';

/**
 * Categoria padrão inicial (Kit Básico)
 */
export const DEFAULT_KIT_BASICO: ExtensionCategory = {
  id: 'kit_basico',
  name: 'kit basico',
  description: 'Extensões padrão essenciais para o perfil',
  extensionIds: [],
  extensions: [],
  isDefault: true,
  createdAt: new Date().toISOString(),
};

/**
 * Retorna todas as categorias de extensões salvas
 */
export function getExtensionCategories(): ExtensionCategory[] {
  if (typeof window === 'undefined') {
    return [DEFAULT_KIT_BASICO];
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [DEFAULT_KIT_BASICO];
    }
    const parsed: ExtensionCategory[] = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [DEFAULT_KIT_BASICO];
    }

    // Garante que o kit_basico sempre exista
    const hasDefault = parsed.some((c) => c.id === 'kit_basico');
    if (!hasDefault) {
      return [DEFAULT_KIT_BASICO, ...parsed];
    }

    return parsed;
  } catch (error) {
    console.error('Erro ao ler categorias de extensões:', error);
    return [DEFAULT_KIT_BASICO];
  }
}

/**
 * Salva ou cria uma nova categoria de extensões
 */
export function saveExtensionCategory(data: {
  name: string;
  description?: string;
  extensions: ExtensionItemSummary[];
}): ExtensionCategory {
  const current = getExtensionCategories();
  const id = `cat_${Date.now()}`;

  const newCategory: ExtensionCategory = {
    id,
    name: data.name.trim(),
    description: data.description?.trim() || '',
    extensionIds: data.extensions.map((ext) => ext.id),
    extensions: data.extensions,
    isDefault: false,
    createdAt: new Date().toISOString(),
  };

  const updated = [...current, newCategory];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event(CATEGORY_CHANGE_EVENT));
  } catch (error) {
    console.error('Erro ao salvar categoria de extensão:', error);
  }

  return newCategory;
}

/**
 * Exclui uma categoria personalizada (não remove a padrão kit_basico)
 */
export function deleteExtensionCategory(id: string): void {
  if (id === 'kit_basico') return;

  const current = getExtensionCategories();
  const updated = current.filter((c) => c.id !== id);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event(CATEGORY_CHANGE_EVENT));
  } catch (error) {
    console.error('Erro ao deletar categoria:', error);
  }
}

/**
 * Hook React para manter as categorias sincronizadas e reativas
 */
export function useExtensionCategories() {
  const [categories, setCategories] = useState<ExtensionCategory[]>(() =>
    getExtensionCategories(),
  );

  const reload = useCallback(() => {
    setCategories(getExtensionCategories());
  }, []);

  useEffect(() => {
    reload();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) reload();
    };

    const handleCustomChange = () => reload();

    window.addEventListener('storage', handleStorage);
    window.addEventListener(CATEGORY_CHANGE_EVENT, handleCustomChange);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener(CATEGORY_CHANGE_EVENT, handleCustomChange);
    };
  }, [reload]);

  const addCategory = useCallback(
    (data: {
      name: string;
      description?: string;
      extensions: ExtensionItemSummary[];
    }) => {
      const created = saveExtensionCategory(data);
      reload();
      return created;
    },
    [reload],
  );

  const removeCategory = useCallback(
    (id: string) => {
      deleteExtensionCategory(id);
      reload();
    },
    [reload],
  );

  return {
    categories,
    addCategory,
    removeCategory,
    reload,
  };
}

/**
 * Busca extensões para seleção: combina extensões da equipe locais e
 * busca em tempo real via API do backend (Mozilla Add-ons)
 */
export async function searchExtensionsForCategory(
  query: string,
  teamExtensions: RegisteredExtension[] = [],
): Promise<ExtensionItemSummary[]> {
  const cleanQuery = query.trim().toLowerCase();

  // 1. Converte extensões da equipe para o formato resumido
  const teamItems: ExtensionItemSummary[] = teamExtensions.map((ext) => ({
    id: ext.id,
    name: ext.name,
    iconUrl: ext.iconUrl,
    iconType: ext.iconType,
    iconBg: ext.iconBg || '#2F80ED',
    description: ext.description,
    provider: ext.provider || 'Equipe',
  }));

  // Se busca vazia, retorna os itens da equipe
  if (!cleanQuery) {
    return teamItems;
  }

  // Filtra itens da equipe correspondentes
  const matchingTeamItems = teamItems.filter((item) =>
    item.name.toLowerCase().includes(cleanQuery),
  );

  // 2. Chama a API do catálogo (Mozilla Add-ons via backend Rust)
  let catalogItems: ExtensionItemSummary[] = [];
  try {
    const catalogResp = await api.extensions.getCatalog({ q: cleanQuery });
    if (Array.isArray(catalogResp)) {
      catalogItems = catalogResp.map((cat) => ({
        id: cat.id,
        name: cat.name,
        iconUrl: cat.iconUrl,
        iconType: cat.iconType,
        iconBg: cat.iconBg || '#2F80ED',
        description: cat.description,
        provider: cat.provider || 'Firefox Add-ons',
      }));
    }
  } catch (error) {
    console.warn('Busca de extensões via API encontrou erro ou backend offline:', error);
  }

  // 3. Combina e deduplica por id e nome
  const combined: ExtensionItemSummary[] = [...matchingTeamItems];
  const seenKeys = new Set(
    matchingTeamItems.map((i) => `${String(i.id)}_${i.name.toLowerCase()}`),
  );

  for (const item of catalogItems) {
    const key = `${String(item.id)}_${item.name.toLowerCase()}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      combined.push(item);
    }
  }

  return combined;
}

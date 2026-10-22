import { http } from '../http';
import type { TagItem } from '@/types';

export type { TagItem };

const STORAGE_KEY = 'star_tag_colors_catalog';

// Mapa de cores oficiais do catálogo (/api/tags)
let catalogColorMap: Record<string, string> = {};
// Cache geral em memória
let tagColorCache: Record<string, string> = {};

// Hidratação imediata a partir do localStorage para zero atraso na renderização
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        catalogColorMap = { ...parsed };
        tagColorCache = { ...parsed };
      }
    }
  }
} catch { }

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch { }
  });
}

export const serviceTags = {
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  list: async (search?: string): Promise<TagItem[]> => {
    try {
      const list = await http.get<TagItem[]>('/api/tags', {
        params: { search: search?.trim() || undefined },
      });
      if (Array.isArray(list)) {
        list.forEach((t) => {
          if (t.name && t.color) {
            const key = t.name.toLowerCase().trim();
            catalogColorMap[key] = t.color;
            tagColorCache[key] = t.color;
          }
        });
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(catalogColorMap));
          }
        } catch { }
        notifyListeners();
        return list;
      }
      return [];
    } catch (err) {
      console.warn('Erro ao carregar catálogo de tags:', err);
      return [];
    }
  },

  get: (id: string | number) => http.get<TagItem>(`/api/tags/${id}`),

  getColorByName: (name?: string): string | undefined => {
    if (!name) return undefined;
    const key = name.toLowerCase().trim();
    // Prioridade máxima para a cor cadastrada no catálogo oficial
    return catalogColorMap[key] || tagColorCache[key];
  },

  registerColors: (tags: Array<{ name?: string; color?: string } | string>) => {
    let hasChanges = false;
    tags.forEach((t) => {
      if (typeof t === 'object' && t !== null && t.name && t.color) {
        const key = t.name.toLowerCase().trim();
        // Não sobrescreve cores que já foram definidas no catálogo oficial
        if (!catalogColorMap[key]) {
          if (tagColorCache[key] !== t.color) {
            tagColorCache[key] = t.color;
            hasChanges = true;
          }
        }
      }
    });
    if (hasChanges) {
      notifyListeners();
    }
  },

  create: async (data: { name: string; color?: string }): Promise<TagItem> => {
    const res = await http.post<TagItem>('/api/tags', data);
    if (res?.name && res?.color) {
      const key = res.name.toLowerCase().trim();
      catalogColorMap[key] = res.color;
      tagColorCache[key] = res.color;
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(catalogColorMap));
        }
      } catch { }
      notifyListeners();
    }
    return res;
  },

  update: async (id: string | number, data: { name?: string; color?: string }): Promise<TagItem> => {
    const res = await http.put<TagItem>(`/api/tags/${id}`, data);
    if (res?.name && res?.color) {
      const key = res.name.toLowerCase().trim();
      catalogColorMap[key] = res.color;
      tagColorCache[key] = res.color;
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(catalogColorMap));
        }
      } catch { }
      notifyListeners();
    }
    return res;
  },

  delete: async (id: string | number) => {
    const res = await http.delete<any>(`/api/tags/${id}`);
    await serviceTags.list();
    return res;
  },

  deleteMany: async (ids: (string | number)[]) => {
    const numericIds = ids.map(Number).filter((n) => !isNaN(n));
    const res = await http.post<any>('/api/tags/batch-delete', { ids: numericIds });
    await serviceTags.list();
    return res;
  },
};

export default serviceTags;

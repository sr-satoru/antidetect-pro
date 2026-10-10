import { http } from '../http';
import type { TagItem } from '@/types';

export type { TagItem };

// Cache em memória para cores das tags (zero sessionStorage)
let tagColorCache: Record<string, string> = {};

export const serviceTags = {
  list: async (search?: string): Promise<TagItem[]> => {
    const list = await http.get<TagItem[]>('/api/tags', {
      params: { search: search?.trim() || undefined },
    });
    if (Array.isArray(list)) {
      list.forEach((t) => {
        if (t.name && t.color) {
          tagColorCache[t.name.toLowerCase()] = t.color;
        }
      });
      return list;
    }
    return [];
  },

  get: (id: string | number) => http.get<TagItem>(`/api/tags/${id}`),

  getColorByName: (name?: string): string | undefined => {
    if (!name) return undefined;
    return tagColorCache[name.toLowerCase().trim()];
  },

  registerColors: (tags: Array<{ name?: string; color?: string } | string>) => {
    tags.forEach((t) => {
      if (typeof t === 'object' && t !== null && t.name && t.color) {
        tagColorCache[t.name.toLowerCase().trim()] = t.color;
      }
    });
  },

  create: async (data: { name: string; color?: string }): Promise<TagItem> => {
    const res = await http.post<TagItem>('/api/tags', data);
    if (res?.name && res?.color) {
      tagColorCache[res.name.toLowerCase().trim()] = res.color;
    }
    return res;
  },

  update: async (id: string | number, data: { name?: string; color?: string }): Promise<TagItem> => {
    const res = await http.put<TagItem>(`/api/tags/${id}`, data);
    if (res?.name && res?.color) {
      tagColorCache[res.name.toLowerCase().trim()] = res.color;
    }
    return res;
  },

  delete: async (id: string | number) => {
    const res = await http.delete<any>(`/api/tags/${id}`);
    return res;
  },

  deleteMany: async (ids: (string | number)[]) => {
    const res = await http.post<any>('/api/tags/batch-delete', { ids });
    return res;
  },
};

export default serviceTags;


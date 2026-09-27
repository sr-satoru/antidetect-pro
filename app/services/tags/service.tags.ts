import { http } from '../http';
import type { TagItem } from '@/types';

export type { TagItem };

let tagColorCache: Record<string, string> = {};

export const serviceTags = {
  list: async (search?: string) => {
    const list = await http.get<TagItem[]>('/api/tags', {
      params: { search: search || undefined },
    });
    if (Array.isArray(list)) {
      list.forEach((t) => {
        if (t.name && t.color) {
          tagColorCache[t.name.toLowerCase()] = t.color;
        }
      });
    }
    return list;
  },

  get: (id: string) => http.get<TagItem>(`/api/tags/${id}`),

  getColorByName: (name?: string): string | undefined => {
    if (!name) return undefined;
    return tagColorCache[name.toLowerCase()];
  },

  create: async (data: { name: string; color: string }) => {
    const res = await http.post<TagItem>('/api/tags', data);
    if (res?.name && res?.color) {
      tagColorCache[res.name.toLowerCase()] = res.color;
    }
    return res;
  },

  update: async (id: string, data: { name?: string; color?: string }) => {
    const res = await http.put<TagItem>(`/api/tags/${id}`, data);
    if (res?.name && res?.color) {
      tagColorCache[res.name.toLowerCase()] = res.color;
    }
    return res;
  },

  delete: async (id: string) => {
    const res = await http.delete<any>(`/api/tags/${id}`);
    return res;
  },

  deleteMany: async (ids: string[]) => {
    const res = await http.post<any>('/api/tags/batch-delete', { ids });
    return res;
  },
};

export default serviceTags;

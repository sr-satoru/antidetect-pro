const API_BASE_URL = 'http://127.0.0.1:8000';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('fury_auth_token');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      let errorMsg = `Erro ${res.status}: ${res.statusText}`;
      try {
        const errJson = await res.json();
        if (errJson.detail) {
          errorMsg = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
        }
      } catch {}
      throw new ApiError(res.status, errorMsg);
    }

    if (res.status === 204) {
      return {} as T;
    }

    return await res.json();
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Falha de rede (ex: backend desligado)
    throw new ApiError(0, 'Não foi possível conectar ao backend local em http://127.0.0.1:8000. Certifique-se de que o backend Python está rodando.');
  }
}

export const api = {
  // Autenticação (Offline sem e-mail ou Online com e-mail)
  auth: {
    register: (data: { username?: string; email?: string; password: string }) =>
      request<{
        success: boolean;
        token: string;
        user: { id: number; username: string; email?: string; is_offline: boolean };
      }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    login: (login: string, password: string) =>
      request<{
        success: boolean;
        token: string;
        user: { id: number; username: string; email?: string; is_offline: boolean };
      }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ login, password }),
      }),
    me: (token?: string) =>
      request<{ id: number; username: string; email?: string; is_offline: boolean }>(
        `/api/auth/me${token ? `?token=${token}` : ''}`
      ),
  },

  // Perfis
  profiles: {
    list: async (search?: string, group?: string) => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (group && group !== 'Todos os grupos') params.append('group', group);
      const qs = params.toString();
      const rawList = await request<any[]>(`/api/profiles${qs ? `?${qs}` : ''}`);
      return rawList.map((p) => {
        let tagsArr: string[] = [];
        if (Array.isArray(p.tags)) {
          tagsArr = p.tags;
        } else if (typeof p.tags === 'string' && p.tags.trim()) {
          tagsArr = p.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
        }

        const formattedDate = p.created_at
          ? new Date(p.created_at).toLocaleDateString('pt-BR', {
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            }).replace(',', '')
          : 'Hoje';

        const lastOpenedFormatted = p.updated_at
          ? new Date(p.updated_at).toLocaleDateString('pt-BR', {
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            }).replace(',', '')
          : null;

        return {
          id: p.id,
          name: p.name,
          kernel: p.kernel || 'FlowerBrowser',
          os: (p.os || 'windows').toLowerCase(),
          browser_version: p.browser_version || '135.0',
          group: p.group || 'Desagrupado',
          tags: tagsArr,
          notes: p.notes || '',
          status: p.status || 'ready',
          isRunning: p.status === 'running',
          ip: p.proxy_host || '',
          country: p.proxy_type && p.proxy_type !== 'none' ? p.proxy_type.toUpperCase() : '',
          proxyConnected: Boolean(p.proxy_type && p.proxy_type !== 'none' && p.proxy_host),
          proxy_type: p.proxy_type,
          proxy_host: p.proxy_host,
          proxy_port: p.proxy_port,
          proxy_username: p.proxy_username,
          proxy_password: p.proxy_password,
          createdAt: formattedDate,
          lastOpened: lastOpenedFormatted,
          raw: p,
        };
      });
    },
    get: (id: string) => request<any>(`/api/profiles/${id}`),
    create: (data: any) => {
      const payload = {
        name: (data.name && data.name.trim()) || 'NOVO PERFIL',
        kernel: data.kernel || 'FlowerBrowser',
        os: (data.os || 'windows').toLowerCase(),
        browser_version: data.kernelVersion || data.browser_version || '135.0',
        group: data.group || 'Desagrupado',
        tags: Array.isArray(data.tags) ? data.tags.join(',') : (data.tags || ''),
        notes: data.notes || '',
        status: 'ready',
        proxy_type: data.proxyType || data.proxy_type || 'none',
        proxy_host: data.proxyHost || data.proxy_host || null,
        proxy_port: data.proxyPort ? Number(data.proxyPort) : (data.proxy_port ? Number(data.proxy_port) : null),
        proxy_username: data.proxyUser || data.proxy_username || null,
        proxy_password: data.proxyPass || data.proxy_password || null,
        fingerprint_json: typeof data.fingerprint_json === 'string' ? data.fingerprint_json : JSON.stringify(data),
      };
      return request<any>('/api/profiles', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    update: (id: string, data: any) =>
      request<any>(`/api/profiles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<void>(`/api/profiles/${id}`, {
        method: 'DELETE',
      }),
    listTrash: async (search?: string, group?: string) => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (group && group !== 'Todos os grupos') params.append('group', group);
      const qs = params.toString();
      const rawList = await request<any[]>(`/api/profiles/trash${qs ? `?${qs}` : ''}`);
      return rawList.map((p) => {
        const deletedDateObj = p.deleted_at ? new Date(p.deleted_at) : new Date();
        const diffMs = Date.now() - deletedDateObj.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const daysRemaining = Math.max(1, 7 - diffDays);

        const formattedDeletedDate = deletedDateObj.toLocaleDateString('pt-BR', {
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        }).replace(',', '');

        return {
          id: p.id,
          originalId: p.id,
          name: p.name,
          group: p.group || 'Desagrupado',
          os: (p.os || 'windows').toLowerCase(),
          ip: p.proxy_host || '',
          country: p.proxy_type && p.proxy_type !== 'none' ? p.proxy_type.toUpperCase() : '',
          deletedAt: formattedDeletedDate,
          daysRemaining,
          deletedBy: p.deleted_by || p.created_by || 'Local',
          raw: p,
        };
      });
    },
    restore: (id: string) =>
      request<any>(`/api/profiles/${id}/restore`, {
        method: 'POST',
      }),
    deletePermanent: (id: string) =>
      request<void>(`/api/profiles/${id}/permanent`, {
        method: 'DELETE',
      }),
    emptyTrash: () =>
      request<{ status: string; deleted_count: number }>('/api/profiles/trash/empty', {
        method: 'DELETE',
      }),
    launch: (id: string) =>
      request<{ status: string; profile_id: string; message: string }>(
        `/api/profiles/${id}/launch`,
        {
          method: 'POST',
        }
      ),
  },

  // Extensões
  extensions: {
    list: async (tab?: string, search?: string) => {
      const params = new URLSearchParams();
      if (tab) params.append('tab', tab);
      if (search) params.append('search', search);
      const qs = params.toString();
      const list = await request<any[]>(`/api/extensions${qs ? `?${qs}` : ''}`);
      return list.map((e) => ({
        id: e.id,
        name: e.name,
        description: e.description || '',
        iconType: e.icon_type || 'custom',
        iconBg: e.icon_bg || '#1677FF',
        iconUrl: e.icon_url || null,
        provider: e.provider || 'Firefox Add-ons',
        providerUrl: e.provider_url || null,
        enabled: Boolean(e.enabled),
        status: (e.status || 'available') as 'available' | 'disabled',
        tab: (e.tab || 'team') as 'team' | 'recommended',
      }));
    },
    create: (data: any) => {
      const payload = {
        name: data.name,
        description: data.description || '',
        icon_type: data.iconType || data.icon_type || 'custom',
        icon_bg: data.iconBg || data.icon_bg || '#1677FF',
        icon_url: data.iconUrl || data.icon_url || null,
        provider: data.provider || 'Firefox Add-ons',
        provider_url: data.providerUrl || data.provider_url || null,
        enabled: data.enabled !== undefined ? Boolean(data.enabled) : true,
        status: data.status || 'available',
        tab: data.tab || 'team',
      };
      return request<any>('/api/extensions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    update: (id: number, data: any) => {
      const payload: Record<string, any> = {};
      if (data.name !== undefined) payload.name = data.name;
      if (data.description !== undefined) payload.description = data.description;
      if (data.enabled !== undefined) payload.enabled = Boolean(data.enabled);
      if (data.status !== undefined) payload.status = data.status;
      if (data.tab !== undefined) payload.tab = data.tab;
      if (data.iconType !== undefined) payload.icon_type = data.iconType;
      if (data.iconBg !== undefined) payload.icon_bg = data.iconBg;
      if (data.iconUrl !== undefined) payload.icon_url = data.iconUrl;
      if (data.providerUrl !== undefined) payload.provider_url = data.providerUrl;
      return request<any>(`/api/extensions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    delete: (id: number) =>
      request<void>(`/api/extensions/${id}`, {
        method: 'DELETE',
      }),
    getCatalogCategories: () =>
      request<string[]>('/api/extensions/catalog/categories'),
    getCatalog: async (params?: { q?: string; category?: string; store?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.q) searchParams.append('q', params.q);
      if (params?.category && params.category !== 'All') searchParams.append('category', params.category);
      if (params?.store && params.store !== 'all') searchParams.append('store', params.store);
      const qs = searchParams.toString();
      const list = await request<any[]>(`/api/extensions/catalog${qs ? `?${qs}` : ''}`);
      return list.map((e) => ({
        id: e.id,
        name: e.name,
        category: e.category,
        description: e.description || '',
        provider: e.provider || 'Firefox Add-ons',
        providerUrl: e.provider_url || null,
        iconType: e.icon_type || 'custom',
        iconBg: e.icon_bg || '#1677FF',
        iconUrl: e.icon_url || null,
        bannerType: e.banner_type || null,
      }));
    },
    searchAmo: (q: string) =>
      request<any[]>(`/api/extensions/search-amo?q=${encodeURIComponent(q)}`),
  },

  // Proxies
  proxies: {
    list: async () => {
      const list = await request<any[]>('/api/proxies');
      return list.map((p) => ({
        id: p.id,
        name: p.name || `Proxy ${p.host}`,
        type: p.type || 'socks5',
        host: p.host,
        port: String(p.port),
        user: p.username || '',
        pass: p.password || '',
        ip: p.exit_ip || p.host,
        country: p.country || 'BR - Brasil',
        status: p.status || 'active',
        ping: p.latency_ms ?? 45,
        lastChecked: 'Hoje',
        usageCount: 0,
        createdAt: p.created_at
          ? new Date(p.created_at).toLocaleDateString('pt-BR', {
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            }).replace(',', '')
          : 'Hoje',
      }));
    },
    create: (data: any) => {
      const payload = {
        name: data.name || `Proxy ${data.host}`,
        type: data.type || 'socks5',
        host: data.host,
        port: Number(data.port),
        username: data.user || data.username || null,
        password: data.pass || data.password || null,
        status: data.status || 'active',
        latency_ms: data.ping ? Number(data.ping) : (data.latency_ms ? Number(data.latency_ms) : 45),
        country: data.country || 'BR - Brasil',
        exit_ip: data.ip || data.exit_ip || data.host,
      };
      return request<any>('/api/proxies', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    delete: (id: number) =>
      request<void>(`/api/proxies/${id}`, {
        method: 'DELETE',
      }),
    test: (data: any) =>
      request<{ status: string; latency_ms: number | null; exit_ip: string | null; message: string }>(
        '/api/proxies/test',
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      ),
  },
};

export default api;

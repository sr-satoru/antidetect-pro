import { http } from '../http';

const STORAGE_KEY = 'star_groups_catalog';

// Sugestões de inicialização rápida
const DEFAULT_INITIAL_GROUPS = [
  'Desagrupado',
  'Contas Matriz',
  'Marketing',
  'Testes',
];

// Cache em memória
let groupsCache: string[] = ['Desagrupado'];

// Hidratação imediata a partir do localStorage para zero delay de renderização
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        groupsCache = Array.from(new Set(['Desagrupado', ...parsed]));
      }
    }
  }
} catch {
  groupsCache = ['Desagrupado'];
}

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {}
  });
}

function persistCache(groups: string[]) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
    }
  } catch {}
}

/**
 * Service de Grupos — Gerencia de forma dinâmica e reativa os grupos de perfis.
 * Faz leitura segura do backend via SELECT DISTINCT (zero migração de banco)
 * e mantém cache local com reatividade imediata.
 */
export const serviceGrupos = {
  /**
   * Obtém os grupos em memória instantaneamente.
   */
  getCached: (): string[] => {
    return [...groupsCache];
  },

  /**
   * Inscreve um componente para receber atualizações quando novos grupos forem registrados.
   */
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  /**
   * Busca os grupos cadastrados no backend (/api/profiles/groups).
   */
  list: async (): Promise<string[]> => {
    try {
      const response = await http.get<string[]>('/api/profiles/groups');
      const backendGroups = Array.isArray(response) ? response : [];

      // Une 'Desagrupado', grupos do backend e grupos do cache
      const combined = Array.from(
        new Set([
          'Desagrupado',
          ...groupsCache,
          ...backendGroups.filter((g) => Boolean(g && g.trim())),
        ])
      );

      // Garante que 'Desagrupado' fique sempre no topo ou como primeiro
      const withoutUngrouped = combined
        .filter((g) => g !== 'Desagrupado')
        .sort((a, b) => a.localeCompare(b));

      groupsCache = ['Desagrupado', ...withoutUngrouped];
      persistCache(groupsCache);
      notifyListeners();

      return [...groupsCache];
    } catch (err) {
      console.warn('Falha ao obter grupos do backend, usando cache local:', err);
      if (groupsCache.length <= 1) {
        groupsCache = Array.from(new Set(['Desagrupado', ...DEFAULT_INITIAL_GROUPS]));
      }
      return [...groupsCache];
    }
  },

  /**
   * Registra um novo grupo localmente na hora (chamado quando o usuário digita um novo nome).
   * Ele fica instantaneamente disponível para seleção antes mesmo de salvar o perfil.
   */
  registerLocalGroup: (name: string): string => {
    const clean = name.trim();
    if (!clean) return 'Desagrupado';

    if (!groupsCache.some((g) => g.toLowerCase() === clean.toLowerCase())) {
      const withoutUngrouped = groupsCache
        .filter((g) => g !== 'Desagrupado')
        .concat(clean)
        .sort((a, b) => a.localeCompare(b));

      groupsCache = ['Desagrupado', ...withoutUngrouped];
      persistCache(groupsCache);
      notifyListeners();
    }

    // Retorna a grafia exata existente ou a nova
    const found = groupsCache.find((g) => g.toLowerCase() === clean.toLowerCase());
    return found || clean;
  },
};

export default serviceGrupos;

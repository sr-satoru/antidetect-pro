import { http } from '../http';

export interface TabItem {
  id: string;
  url: string;
  title: string;
  is_active: boolean;
}

export interface TabsResponse {
  is_running: boolean;
  port: number | null;
  tabs: TabItem[];
}

export const serviceTabs = {
  /**
   * Consulta as abas e URLs abertas em tempo real no perfil
   */
  async getTabs(profileId: string | number): Promise<TabsResponse> {
    return http.get<TabsResponse>(`/api/profiles/${profileId}/tabs`);
  },

  /**
   * Dispara a abertura de uma nova aba com URL específica
   */
  async openTab(profileId: string | number, url: string): Promise<{ status: string; context_id: string; url: string }> {
    return http.post<{ status: string; context_id: string; url: string }>(
      `/api/profiles/${profileId}/tabs`,
      { url }
    );
  },

  /**
   * Fecha uma aba específica do perfil em execução
   */
  async closeTab(profileId: string | number, tabId: string): Promise<{ status: string; tab_id: string }> {
    return http.delete<{ status: string; tab_id: string }>(
      `/api/profiles/${profileId}/tabs/${tabId}`
    );
  },
};

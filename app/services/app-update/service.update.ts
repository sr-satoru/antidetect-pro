export interface AppReleaseInfo {
  version: string;
  tagName: string;
  name: string;
  body: string;
  publishedAt: string;
  htmlUrl: string;
  hasUpdate: boolean;
  downloadUrl?: string;
}

export const CURRENT_APP_VERSION = '0.1.0';

export const appUpdateService = {
  /**
   * Verifica no GitHub Releases se há uma versão mais recente do Fury Desktop
   */
  async checkForAppUpdate(): Promise<AppReleaseInfo | null> {
    try {
      const res = await fetch(
        'https://api.github.com/repos/sr-satoru/antidetect-pro/releases/latest',
        {
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      if (!res.ok) {
        if (res.status === 404) {
          // Nenhuma release publicada ainda
          return {
            version: CURRENT_APP_VERSION,
            tagName: `v${CURRENT_APP_VERSION}`,
            name: `Fury Antidetect v${CURRENT_APP_VERSION}`,
            body: 'Versão local instalada.',
            publishedAt: new Date().toISOString(),
            htmlUrl: 'https://github.com/sr-satoru/antidetect-pro/releases',
            hasUpdate: false,
          };
        }
        throw new Error(`GitHub retornou HTTP ${res.status}`);
      }

      const data = await res.json();
      const remoteTag: string = data.tag_name || '';
      const remoteVersion = remoteTag.replace(/^v/, '');

      const hasUpdate = this.compareVersions(remoteVersion, CURRENT_APP_VERSION) > 0;

      // Localiza o asset correspondente ao OS (AppImage/deb para linux, exe/msi para windows, dmg para mac)
      let downloadUrl = data.html_url;
      if (Array.isArray(data.assets)) {
        const isLinux = navigator.userAgent.toLowerCase().includes('linux');
        const isWindows = navigator.userAgent.toLowerCase().includes('win');
        const isMac = navigator.userAgent.toLowerCase().includes('mac');

        const matchedAsset = data.assets.find((asset: any) => {
          const name = (asset.name || '').toLowerCase();
          if (isLinux) return name.endsWith('.deb') || name.endsWith('.appimage');
          if (isWindows) return name.endsWith('.exe') || name.endsWith('.msi');
          if (isMac) return name.endsWith('.dmg') || name.endsWith('.app.tar.gz');
          return false;
        });

        if (matchedAsset && matchedAsset.browser_download_url) {
          downloadUrl = matchedAsset.browser_download_url;
        }
      }

      return {
        version: remoteVersion,
        tagName: remoteTag,
        name: data.name || remoteTag,
        body: data.body || '',
        publishedAt: data.published_at,
        htmlUrl: data.html_url,
        hasUpdate,
        downloadUrl,
      };
    } catch (err) {
      console.warn('Não foi possível checar atualização do app no GitHub:', err);
      return null;
    }
  },

  /**
   * Compara duas versões semânticas (ex: "0.1.1" vs "0.1.0")
   * Retorna > 0 se v1 > v2, < 0 se v1 < v2, 0 se iguais
   */
  compareVersions(v1: string, v2: string): number {
    const p1 = v1.split('.').map(Number);
    const p2 = v2.split('.').map(Number);
    const len = Math.max(p1.length, p2.length);

    for (let i = 0; i < len; i++) {
      const n1 = p1[i] || 0;
      const n2 = p2[i] || 0;
      if (n1 > n2) return 1;
      if (n1 < n2) return -1;
    }

    return 0;
  },
};

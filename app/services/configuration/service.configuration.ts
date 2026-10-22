import { serviceBasePresets, BaseBrowserPreset } from '../presets/service.base-presets';
import { toast } from '@/components/ui/notification';

export interface NetworkSettings {
  enforceProxyCheck: boolean;
  dnsProvider: string;
  proxyTimeout: number;
}

export const DEFAULT_NETWORK_SETTINGS: NetworkSettings = {
  enforceProxyCheck: true,
  dnsProvider: 'cloudflare',
  proxyTimeout: 10,
};

const NETWORK_STORAGE_KEY = 'star_network_settings';
const SOUND_STORAGE_KEY = 'star_notif_sound';

/**
 * Service centralizado para configurações globais da aplicação e presets base.
 * Gerencia persistência, validações e intercâmbio de arquivos.
 */
export const serviceConfiguration = {
  /**
   * Obtém as configurações de rede ativas
   */
  getNetworkSettings(): NetworkSettings {
    try {
      const saved = localStorage.getItem(NETWORK_STORAGE_KEY);
      return saved ? { ...DEFAULT_NETWORK_SETTINGS, ...JSON.parse(saved) } : DEFAULT_NETWORK_SETTINGS;
    } catch {
      return DEFAULT_NETWORK_SETTINGS;
    }
  },

  /**
   * Salva configurações de rede
   */
  saveNetworkSettings(settings: NetworkSettings): void {
    try {
      localStorage.setItem(NETWORK_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('[serviceConfiguration] Erro ao salvar configurações de rede:', e);
    }
  },

  /**
   * Obtém a preferência sonora
   */
  getSoundEnabled(): boolean {
    try {
      return localStorage.getItem(SOUND_STORAGE_KEY) !== 'false';
    } catch {
      return true;
    }
  },

  /**
   * Salva a preferência sonora
   */
  saveSoundEnabled(enabled: boolean): void {
    try {
      localStorage.setItem(SOUND_STORAGE_KEY, String(enabled));
    } catch (e) {
      console.error('[serviceConfiguration] Erro ao salvar preferência de som:', e);
    }
  },

  /**
   * Obtém o preset base ativo
   */
  getBasePreset(): BaseBrowserPreset {
    return serviceBasePresets.getActivePreset();
  },

  /**
   * Inicializa o objeto de formulário completo derivado do preset ativo
   */
  getInitialPresetFormData(): any {
    const active = serviceBasePresets.getActivePreset();
    const defaults = serviceBasePresets.createProfileFormData();
    return {
      ...defaults,
      ...active,
      os: active.defaultOS || 'windows',
      kernel: active.defaultKernel || 'AstroBrowser',
      name: active.name || 'Preset Base Oficial Star',
    };
  },

  /**
   * Salva todas as configurações (presets, rede e som) de uma vez
   */
  saveAll(presetFormData: any, network: NetworkSettings, soundEnabled: boolean): void {
    const currentBase = serviceBasePresets.getActivePreset();
    const presetToSave: BaseBrowserPreset = {
      ...currentBase,
      ...presetFormData,
      defaultOS: presetFormData.os || presetFormData.defaultOS || 'windows',
      defaultKernel: presetFormData.kernel || presetFormData.defaultKernel || 'AstroBrowser',
    };

    serviceBasePresets.saveActivePreset(presetToSave);
    this.saveNetworkSettings(network);
    this.saveSoundEnabled(soundEnabled);
  },

  /**
   * Restaura todas as configurações de fábrica
   */
  resetAll(): { preset: BaseBrowserPreset; formData: any; network: NetworkSettings; soundEnabled: boolean } {
    const restoredPreset = serviceBasePresets.resetToDefaults();
    this.saveNetworkSettings(DEFAULT_NETWORK_SETTINGS);
    this.saveSoundEnabled(true);

    return {
      preset: restoredPreset,
      formData: {
        ...serviceBasePresets.createProfileFormData(),
        ...restoredPreset,
        os: restoredPreset.defaultOS || 'windows',
        kernel: restoredPreset.defaultKernel || 'AstroBrowser',
        name: restoredPreset.name || 'Preset Base Oficial Star',
      },
      network: DEFAULT_NETWORK_SETTINGS,
      soundEnabled: true,
    };
  },

  /**
   * Exporta preset como string JSON
   */
  exportPresetJson(preset?: any): string {
    return serviceBasePresets.exportPresetJson(preset);
  },

  /**
   * Importa preset a partir de string JSON
   */
  importPresetJson(jsonStr: string): BaseBrowserPreset {
    return serviceBasePresets.importPresetJson(jsonStr);
  },

  /**
   * Faz o download do arquivo de preset em formato .json
   */
  downloadPresetJson(preset?: any): void {
    try {
      const active = preset || serviceBasePresets.getActivePreset();
      const jsonStr = serviceBasePresets.exportPresetJson(active);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `preset-${(active.name || 'star-base').toLowerCase().replace(/[^a-z0-9]/g, '-')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Arquivo JSON do preset baixado com sucesso!');
    } catch {
      toast.error('Erro ao gerar download do arquivo.');
    }
  },

  /**
   * Lê um arquivo .json selecionado pelo usuário e importa o preset
   */
  uploadPresetJson(file: File): Promise<BaseBrowserPreset> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const merged = serviceBasePresets.importPresetJson(content);
          toast.success('Preset importado e aplicado com sucesso!');
          resolve(merged);
        } catch (err: any) {
          toast.error(err?.message || 'Arquivo JSON inválido.');
          reject(err);
        }
      };
      reader.onerror = () => {
        toast.error('Erro ao ler arquivo.');
        reject(new Error('Erro ao ler arquivo'));
      };
      reader.readAsText(file);
    });
  },
};

export default serviceConfiguration;

/**
 * Service Avançado (Criar Perfil) — Configurações avançadas de automação.
 *
 * Corresponde ao componente avancado.tsx (aba "Avançado"):
 *   - Scripts em segundo plano
 *   - Porta de depuração remota
 *   - Extensões do navegador
 *
 * Nota: O componente avancado.tsx ainda é um placeholder.
 * Este service será expandido conforme as configurações forem implementadas.
 */

export const serviceAvancado = {
  /**
   * Extrai as configurações avançadas do formulário de criação de perfil.
   */
  extrairConfigAvancada: (formData: any) => ({
    do_not_track_mode: formData.doNotTrackMode || 'default',
    port_scan_protection: formData.portScanProtection || 'open',
    port_scan_allowed_ports: formData.portScanAllowedPorts || undefined,
    hardware_acceleration: formData.hardwareAcceleration || 'default',
    disable_tls_features: formData.disableTlsFeatures || 'close',
    launch_hook: formData.launchHook || undefined,
  }),
};

export default serviceAvancado;

/**
 * Service Avançado (Criar Perfil) — Configurações avançadas do perfil.
 * Focado exclusivamente nas opções da aba "Avançado" na criação de perfil.
 */

export const serviceAvancado = {
  /**
   * Monta o fragmento de configurações avançadas para inclusão no payload.
   * Campos como: Do Not Track, Port Scan, Hardware Acceleration, TLS, Launch Hook.
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

from datetime import datetime, timezone
from typing import Optional
from sqlmodel import SQLModel, Field

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class ImpressaoDigitalBase(SQLModel):
    # Relacionamento com Proxy Global (se selecionado dos salvos)
    proxy_id: Optional[int] = Field(default=None, foreign_key="proxy.id", index=True)

    # Configurações de Conexão e Proxy
    proxy_mode: str = Field(default="custom")           # "custom" | "saved" | "none"
    proxy_type: str = Field(default="none")             # "none" | "http" | "https" | "socks5"
    proxy_host: Optional[str] = Field(default=None)
    proxy_port: Optional[int] = Field(default=None)
    proxy_username: Optional[str] = Field(default=None)
    proxy_password: Optional[str] = Field(default=None)
    proxy_rotation_url: Optional[str] = Field(default=None)
    ip_checker: Optional[str] = Field(default="IP2Location")
    socks_remote_dns: bool = Field(default=True)

    # Extensões ativas no perfil (IDs ou nomes em JSON)
    extensoes_ids: Optional[str] = Field(default="[]")

    # Contas de Plataformas e URLs de inicialização
    platform_url: Optional[str] = Field(default=None)
    platform_accounts: Optional[str] = Field(default="[]")
    open_tabs_urls: Optional[str] = Field(default=None)
    cookies: Optional[str] = Field(default=None)

    # Sistema, Kernel e Navegador
    kernel: str = Field(default="FlowerBrowser")        # "FlowerBrowser" (Camoufox) | "SunBrowser" (Chromium)
    kernel_version: str = Field(default="150")
    os: str = Field(default="linux")                    # "windows" | "macos" | "linux" | "android" | "ios"
    os_version: Optional[str] = Field(default="Linux x86_64")
    user_agent: Optional[str] = Field(default=None)
    user_agent_category: Optional[str] = Field(default="Todo")

    # WebRTC e Fuso Horário
    webrtc_mode: str = Field(default="disabled")        # "disabled" | "proxy" | "real" | "custom"
    timezone_mode: str = Field(default="ip")            # "ip" | "custom"
    custom_timezone: Optional[str] = Field(default="America/Sao_Paulo")

    # Geolocalização
    location_mode: str = Field(default="ip")            # "ip" | "custom" | "block"
    location_permission: str = Field(default="ask")     # "ask" | "allow" | "block"
    custom_latitude: Optional[str] = Field(default=None)
    custom_longitude: Optional[str] = Field(default=None)
    custom_accuracy: Optional[int] = Field(default=1000)

    # Língua e Idioma
    language_mode: str = Field(default="ip")            # "ip" | "custom"
    custom_language: Optional[str] = Field(default="pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7")

    # Resolução de Ecrã / Tela
    screen_resolution_mode: str = Field(default="default") # "default" | "custom"
    screen_resolution: Optional[str] = Field(default="Com base no User-Agent")
    custom_screen_width: Optional[int] = Field(default=1920)
    custom_screen_height: Optional[int] = Field(default=1080)
    color_depth: Optional[int] = Field(default=24)
    device_pixel_ratio: Optional[float] = Field(default=1.0)
    max_touch_points: Optional[int] = Field(default=0)

    # Tipos de Letra (Fonts)
    fonts_mode: str = Field(default="default")

    # Ruído de Hardware (Hardware Noise)
    canvas_noise: bool = Field(default=False)
    webgl_image_noise: bool = Field(default=False)
    audio_context_noise: bool = Field(default=False)
    media_devices_noise: bool = Field(default=False)
    client_rects_noise: bool = Field(default=False)
    speech_voices_noise: bool = Field(default=False)
    font_pack_noise: bool = Field(default=False)
    font_metrics_noise: bool = Field(default=False)

    # Seeds para consistência da impressão digital
    canvas_seed: Optional[str] = Field(default=None)
    webgl_seed: Optional[str] = Field(default=None)
    audio_seed: Optional[str] = Field(default=None)
    client_rects_seed: Optional[str] = Field(default=None)
    audio_sample_rate: Optional[int] = Field(default=48000)

    # Metadados WebGL e WebGPU
    webgl_metadata_mode: str = Field(default="custom")  # "custom" | "default"
    webgl_vendor: Optional[str] = Field(default=None)
    webgl_renderer: Optional[str] = Field(default=None)
    webgpu_mode: str = Field(default="webgl")

    # Hardware (Processador e Memória)
    cpu_mode: str = Field(default="custom")
    cpu_cores: Optional[int] = Field(default=10)
    ram_mode: str = Field(default="custom")
    ram_gb: Optional[int] = Field(default=8)

    # Identificação do Dispositivo
    battery_mode: str = Field(default="desktop")
    device_name_mode: str = Field(default="custom")
    device_name: Optional[str] = Field(default=None)
    mac_address_mode: str = Field(default="custom")
    mac_address: Optional[str] = Field(default=None)

    # Dispositivos de Mídia
    micros_count: Optional[int] = Field(default=1)
    webcams_count: Optional[int] = Field(default=1)
    speakers_count: Optional[int] = Field(default=2)

    # Segurança e Rede
    do_not_track_mode: str = Field(default="default")
    port_scan_protection: str = Field(default="open")
    port_scan_allowed_ports: Optional[str] = Field(default=None)
    hardware_acceleration: str = Field(default="default")
    disable_tls_features: str = Field(default="close")
    launch_hook: Optional[str] = Field(default=None)

    # JSON completo bruto de salvamento (garantia de compatibilidade futura)
    raw_fingerprint_json: Optional[str] = Field(default="{}")

class ImpressaoDigital(ImpressaoDigitalBase, table=True):
    __tablename__ = "impressao_digital"
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)

class ImpressaoDigitalCreate(ImpressaoDigitalBase):
    pass

class ImpressaoDigitalRead(ImpressaoDigitalBase):
    id: int
    created_at: datetime
    updated_at: datetime

class ImpressaoDigitalUpdate(SQLModel):
    proxy_id: Optional[int] = None
    proxy_mode: Optional[str] = None
    proxy_type: Optional[str] = None
    proxy_host: Optional[str] = None
    proxy_port: Optional[int] = None
    proxy_username: Optional[str] = None
    proxy_password: Optional[str] = None
    proxy_rotation_url: Optional[str] = None
    ip_checker: Optional[str] = None
    socks_remote_dns: Optional[bool] = None
    extensoes_ids: Optional[str] = None
    platform_url: Optional[str] = None
    platform_accounts: Optional[str] = None
    open_tabs_urls: Optional[str] = None
    cookies: Optional[str] = None
    kernel: Optional[str] = None
    kernel_version: Optional[str] = None
    os: Optional[str] = None
    os_version: Optional[str] = None
    user_agent: Optional[str] = None
    user_agent_category: Optional[str] = None
    webrtc_mode: Optional[str] = None
    timezone_mode: Optional[str] = None
    custom_timezone: Optional[str] = None
    location_mode: Optional[str] = None
    location_permission: Optional[str] = None
    custom_latitude: Optional[str] = None
    custom_longitude: Optional[str] = None
    custom_accuracy: Optional[int] = None
    language_mode: Optional[str] = None
    custom_language: Optional[str] = None
    screen_resolution_mode: Optional[str] = None
    screen_resolution: Optional[str] = None
    custom_screen_width: Optional[int] = None
    custom_screen_height: Optional[int] = None
    color_depth: Optional[int] = None
    device_pixel_ratio: Optional[float] = None
    max_touch_points: Optional[int] = None
    fonts_mode: Optional[str] = None
    canvas_noise: Optional[bool] = None
    webgl_image_noise: Optional[bool] = None
    audio_context_noise: Optional[bool] = None
    media_devices_noise: Optional[bool] = None
    client_rects_noise: Optional[bool] = None
    speech_voices_noise: Optional[bool] = None
    font_pack_noise: Optional[bool] = None
    font_metrics_noise: Optional[bool] = None
    canvas_seed: Optional[str] = None
    webgl_seed: Optional[str] = None
    audio_seed: Optional[str] = None
    client_rects_seed: Optional[str] = None
    audio_sample_rate: Optional[int] = None
    webgl_metadata_mode: Optional[str] = None
    webgl_vendor: Optional[str] = None
    webgl_renderer: Optional[str] = None
    webgpu_mode: Optional[str] = None
    cpu_mode: Optional[str] = None
    cpu_cores: Optional[int] = None
    ram_mode: Optional[str] = None
    ram_gb: Optional[int] = None
    battery_mode: Optional[str] = None
    device_name_mode: Optional[str] = None
    device_name: Optional[str] = None
    mac_address_mode: Optional[str] = None
    mac_address: Optional[str] = None
    micros_count: Optional[int] = None
    webcams_count: Optional[int] = None
    speakers_count: Optional[int] = None
    do_not_track_mode: Optional[str] = None
    port_scan_protection: Optional[str] = None
    port_scan_allowed_ports: Optional[str] = None
    hardware_acceleration: Optional[str] = None
    disable_tls_features: Optional[str] = None
    launch_hook: Optional[str] = None
    raw_fingerprint_json: Optional[str] = None

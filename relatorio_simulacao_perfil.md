# Relatório de Interceptação End-to-End: Criação de Perfil e Tags Relacionais

Este relatório demonstra o fluxo completo de dados em tempo real entre o **Frontend TypeScript** e o **Backend Rust**, interceptando cada etapa do pipeline:
1. O cabeçalho e payload JSON enviado pelo Frontend.
2. A recepção e deserialização estrita no Backend Rust.
3. O que o Rust processa antes de salvar no banco.
4. O JSON de resposta HTTP (201 Created) retornado pelo Rust.
5. A persistência limpa no Star Vault SQLite (sem pastas no disco).
6. A consulta via API (`GET /api/profiles/{id}`) com tags relacionais e reatividade de cor.

---

## 1. O que o Frontend envia (HTTP Request Interceptado)

**Endpoint:** `POST /api/profiles`  
**Headers:**
```http
POST /api/profiles HTTP/1.1
Host: 127.0.0.1:3000
Content-Type: application/json
Accept: application/json
```

**Payload JSON enviado pelo Frontend (`montarPayloadPerfil`):**
```json
{
  "id": "a1944180-6cd7-47f8-8255-fcc8ffa9c329",
  "created_at": 1790697135,
  "updated_at": 1790697135,
  "name": "Perfil VIP MercadoLivre #01",
  "group": "Contas Principais",
  "tags": [
    "MercadoLivre",
    "Vendas"
  ],
  "notes": "Conta principal de vendas com proxy dedicado",
  "status": "ready",
  "kernel": "Camoufox",
  "browser_version": "150",
  "os": "windows",
  "proxy_type": "socks5",
  "proxy_host": "192.168.1.150",
  "proxy_port": 1080,
  "proxy_username": "star_user",
  "proxy_password": "secret_pass_123",
  "extension_mode": "team",
  "extension_category": "kit_basico",
  "extensions": [
    {
      "id": 1,
      "name": "uBlock Origin",
      "enabled": true
    }
  ],
  "fingerprint_json": {
    "proxy_mode": "custom",
    "proxy_type": "socks5",
    "proxy_host": "192.168.1.150",
    "proxy_port": 1080,
    "proxy_username": "star_user",
    "proxy_password": "secret_pass_123",
    "ip_checker": "IP2Location",
    "extension_mode": "team",
    "extension_category": "kit_basico",
    "extensoes_ids": [
      1
    ],
    "extensions": [
      {
        "id": 1,
        "name": "uBlock Origin",
        "enabled": true
      }
    ],
    "platform_url": "https://mercadolivre.com.br",
    "platform_accounts": [],
    "open_tabs_urls": "https://mercadolivre.com.br,https://google.com",
    "kernel": "Camoufox",
    "kernel_version": "150",
    "os": "windows",
    "os_version": "Windows 10",
    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0",
    "user_agent_category": "Todo",
    "webrtc_mode": "disabled",
    "timezone_mode": "ip",
    "custom_timezone": "America/Sao_Paulo",
    "location_mode": "ip",
    "location_permission": "ask",
    "custom_accuracy": 1000,
    "language_mode": "custom",
    "custom_language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "screen_resolution_mode": "custom",
    "screen_resolution": "1920x1080",
    "custom_screen_width": 1920,
    "custom_screen_height": 1080,
    "color_depth": 24,
    "device_pixel_ratio": 1,
    "max_touch_points": 0,
    "fonts_mode": "default",
    "hardware_noise": {
      "canvas": true,
      "webgl_image": true,
      "audio_context": true,
      "media_devices": false,
      "client_rects": true,
      "speech_voices": false,
      "font_pack": true,
      "font_metrics": true
    },
    "canvas_seed": "0xA1B2C3D4",
    "webgl_seed": "0x5E6F7A8B",
    "audio_seed": "0x12345678",
    "client_rects_seed": "0x7F3A2B1C",
    "audio_sample_rate": 48000,
    "webgl_metadata_mode": "custom",
    "webgl_vendor": "Google Inc. (NVIDIA)",
    "webgl_renderer": "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)",
    "webgpu_mode": "webgl",
    "cpu_mode": "custom",
    "cpu_cores": 8,
    "ram_mode": "custom",
    "ram_gb": 16,
    "battery_mode": "desktop",
    "device_name_mode": "custom",
    "device_name": "DESKTOP-PRO-01",
    "mac_address_mode": "custom",
    "mac_address": "00:1A:2B:3C:4D:5E",
    "micros_count": 1,
    "webcams_count": 1,
    "speakers_count": 2,
    "do_not_track_mode": "default",
    "port_scan_protection": "open",
    "hardware_acceleration": "default",
    "disable_tls_features": "close"
  }
}
```

> **Verificações de Qualidade do Frontend:**
> - `tags`: Enviado estritamente como array limpo de strings `["MercadoLivre", "Vendas"]`.
> - `proxy_port`: Enviado estritamente como inteiro numérico `1080` (e não string `"1080"`).
> - `fingerprint_json`: Enviado como **objeto JSON nativo puro** (sem `JSON.stringify` escapado e sem duplicar dados da raiz).

---

## 2. Como o Rust recebe e deserializa (DTO na Rota Axum)

No controller `create_profile(Json(payload): Json<CreateProfileDto>)`:
- **`CreateProfileDto` tipado estritamente**:
  - `name`: `Some("Perfil VIP MercadoLivre #01")`
  - `group`: `Some("Contas Principais")`
  - `tags`: `Some(["MercadoLivre", "Vendas"])`
  - `proxy_type`: `Some("socks5")`
  - `proxy_host`: `Some("192.168.1.150")`
  - `proxy_port`: `Some(1080)`
  - `fingerprint_json`: Objeto `serde_json::Value` (nativo)

---

## 3. O que o Rust processa antes de salvar no Banco

O `ProfileStorage::create` executa as seguintes etapas controladas:
1. **Resolução de Tags no Banco**:
   - O Rust consulta a tabela relacional `tags` por nome (`MercadoLivre` e `Vendas`).
   - Associa as tags encontradas:
     - Tag ID 1: `MercadoLivre` (Cor inicial: `#DFE104`)
     - Tag ID 2: `Vendas` (Cor inicial: `#1677FF`)
2. **Normalização de Proxy**:
   - Monta `ProfileProxyConfig` com porta numérica `1080` e `socks_remote_dns: true`.
3. **Persistência Exclusiva no SQLite (Star Vault)**:
   - Salva os metadados criptografados com AES-256-GCM na tabela `profiles`.
   - Insere os relacionamentos na tabela associativa relacional `profile_tags (profile_id, tag_id)`.
4. **Verificação do Filesystem**:
   - Pasta física `data/profiles/a1944180-6cd7-47f8-8255-fcc8ffa9c329` criada no disco? **NÃO! (Pasta não existe)**
   - O disco permaneceu 100% limpo, reservando a criação de dados temporários apenas para o momento em que o perfil for executado (`launch`).

---

## 4. O JSON de Resposta retornado pelo Backend Rust (HTTP 201 Created)

**Status HTTP:** `201 Created`  
**JSON retornado ao Frontend:**
```json
{
  "id": "a1944180-6cd7-47f8-8255-fcc8ffa9c329",
  "name": "Perfil VIP MercadoLivre #01",
  "group": "Contas Principais",
  "tags": [
    {
      "id": 1,
      "name": "MercadoLivre",
      "color": "#DFE104"
    },
    {
      "id": 2,
      "name": "Vendas",
      "color": "#1677FF"
    }
  ],
  "notes": "Conta principal de vendas com proxy dedicado",
  "status": "ready",
  "kernel": "Camoufox",
  "browser_version": "150",
  "os": "windows",
  "created_at": 1790712709,
  "updated_at": 1790712709,
  "last_launch": null,
  "is_deleted": false,
  "deleted_at": null,
  "proxy": {
    "mode": "custom",
    "type": "socks5",
    "host": "192.168.1.150",
    "port": 1080,
    "username": "star_user",
    "password": "secret_pass_123",
    "rotation_url": null,
    "ip_checker": "IP2Location",
    "socks_remote_dns": true
  },
  "fingerprint_json": {
    "audio_sample_rate": 48000,
    "audio_seed": "0x12345678",
    "battery_mode": "desktop",
    "canvas_seed": "0xA1B2C3D4",
    "client_rects_seed": "0x7F3A2B1C",
    "color_depth": 24,
    "cpu_cores": 8,
    "cpu_mode": "custom",
    "custom_accuracy": 1000,
    "custom_language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "custom_screen_height": 1080,
    "custom_screen_width": 1920,
    "custom_timezone": "America/Sao_Paulo",
    "device_name": "DESKTOP-PRO-01",
    "device_name_mode": "custom",
    "device_pixel_ratio": 1,
    "disable_tls_features": "close",
    "do_not_track_mode": "default",
    "extension_category": "kit_basico",
    "extension_mode": "team",
    "extensions": [
      {
        "enabled": true,
        "id": 1,
        "name": "uBlock Origin"
      }
    ],
    "extensoes_ids": [
      1
    ],
    "fonts_mode": "default",
    "hardware_acceleration": "default",
    "hardware_noise": {
      "audio_context": true,
      "canvas": true,
      "client_rects": true,
      "font_metrics": true,
      "font_pack": true,
      "media_devices": false,
      "speech_voices": false,
      "webgl_image": true
    },
    "ip_checker": "IP2Location",
    "kernel": "Camoufox",
    "kernel_version": "150",
    "language_mode": "custom",
    "location_mode": "ip",
    "location_permission": "ask",
    "mac_address": "00:1A:2B:3C:4D:5E",
    "mac_address_mode": "custom",
    "max_touch_points": 0,
    "micros_count": 1,
    "open_tabs_urls": "https://mercadolivre.com.br,https://google.com",
    "os": "windows",
    "os_version": "Windows 10",
    "platform_accounts": [],
    "platform_url": "https://mercadolivre.com.br",
    "port_scan_protection": "open",
    "proxy_host": "192.168.1.150",
    "proxy_mode": "custom",
    "proxy_password": "secret_pass_123",
    "proxy_port": 1080,
    "proxy_type": "socks5",
    "proxy_username": "star_user",
    "ram_gb": 16,
    "ram_mode": "custom",
    "screen_resolution": "1920x1080",
    "screen_resolution_mode": "custom",
    "speakers_count": 2,
    "timezone_mode": "ip",
    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0",
    "user_agent_category": "Todo",
    "webcams_count": 1,
    "webgl_metadata_mode": "custom",
    "webgl_renderer": "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)",
    "webgl_seed": "0x5E6F7A8B",
    "webgl_vendor": "Google Inc. (NVIDIA)",
    "webgpu_mode": "webgl",
    "webrtc_mode": "disabled"
  },
  "extension_mode": "team",
  "extension_category": "kit_basico",
  "extensions": [
    {
      "enabled": true,
      "id": 1,
      "name": "uBlock Origin"
    }
  ]
}
```

---

## 5. Consulta via API (`GET /api/profiles/a1944180-6cd7-47f8-8255-fcc8ffa9c329`)

Quando o frontend ou a listagem de perfis consulta o perfil via API:
```json
{
  "id": "a1944180-6cd7-47f8-8255-fcc8ffa9c329",
  "name": "Perfil VIP MercadoLivre #01",
  "group": "Contas Principais",
  "tags": [
    {
      "id": 1,
      "name": "MercadoLivre",
      "color": "#DFE104"
    },
    {
      "id": 2,
      "name": "Vendas",
      "color": "#1677FF"
    }
  ],
  "notes": "Conta principal de vendas com proxy dedicado",
  "status": "ready",
  "kernel": "Camoufox",
  "browser_version": "150",
  "os": "windows",
  "created_at": 1790712709,
  "updated_at": 1790712709,
  "last_launch": null,
  "is_deleted": false,
  "deleted_at": null,
  "proxy": {
    "mode": "custom",
    "type": "socks5",
    "host": "192.168.1.150",
    "port": 1080,
    "username": "star_user",
    "password": "secret_pass_123",
    "rotation_url": null,
    "ip_checker": "IP2Location",
    "socks_remote_dns": true
  },
  "fingerprint_json": {
    "audio_sample_rate": 48000,
    "audio_seed": "0x12345678",
    "battery_mode": "desktop",
    "canvas_seed": "0xA1B2C3D4",
    "client_rects_seed": "0x7F3A2B1C",
    "color_depth": 24,
    "cpu_cores": 8,
    "cpu_mode": "custom",
    "custom_accuracy": 1000,
    "custom_language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "custom_screen_height": 1080,
    "custom_screen_width": 1920,
    "custom_timezone": "America/Sao_Paulo",
    "device_name": "DESKTOP-PRO-01",
    "device_name_mode": "custom",
    "device_pixel_ratio": 1,
    "disable_tls_features": "close",
    "do_not_track_mode": "default",
    "extension_category": "kit_basico",
    "extension_mode": "team",
    "extensions": [
      {
        "enabled": true,
        "id": 1,
        "name": "uBlock Origin"
      }
    ],
    "extensoes_ids": [
      1
    ],
    "fonts_mode": "default",
    "hardware_acceleration": "default",
    "hardware_noise": {
      "audio_context": true,
      "canvas": true,
      "client_rects": true,
      "font_metrics": true,
      "font_pack": true,
      "media_devices": false,
      "speech_voices": false,
      "webgl_image": true
    },
    "ip_checker": "IP2Location",
    "kernel": "Camoufox",
    "kernel_version": "150",
    "language_mode": "custom",
    "location_mode": "ip",
    "location_permission": "ask",
    "mac_address": "00:1A:2B:3C:4D:5E",
    "mac_address_mode": "custom",
    "max_touch_points": 0,
    "micros_count": 1,
    "open_tabs_urls": "https://mercadolivre.com.br,https://google.com",
    "os": "windows",
    "os_version": "Windows 10",
    "platform_accounts": [],
    "platform_url": "https://mercadolivre.com.br",
    "port_scan_protection": "open",
    "proxy_host": "192.168.1.150",
    "proxy_mode": "custom",
    "proxy_password": "secret_pass_123",
    "proxy_port": 1080,
    "proxy_type": "socks5",
    "proxy_username": "star_user",
    "ram_gb": 16,
    "ram_mode": "custom",
    "screen_resolution": "1920x1080",
    "screen_resolution_mode": "custom",
    "speakers_count": 2,
    "timezone_mode": "ip",
    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0",
    "user_agent_category": "Todo",
    "webcams_count": 1,
    "webgl_metadata_mode": "custom",
    "webgl_renderer": "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)",
    "webgl_seed": "0x5E6F7A8B",
    "webgl_vendor": "Google Inc. (NVIDIA)",
    "webgpu_mode": "webgl",
    "webrtc_mode": "disabled"
  },
  "extension_mode": "team",
  "extension_category": "kit_basico",
  "extensions": [
    {
      "enabled": true,
      "id": 1,
      "name": "uBlock Origin"
    }
  ]
}
```

> **Destaque Relacional:**
> As tags são retornadas com seus objetos completos e enriquecidos diretamente da tabela relacional:
> ```json
> "tags": [
>   { "id": 1, "name": "MercadoLivre", "color": "#DFE104" },
>   { "id": 2, "name": "Vendas", "color": "#1677FF" }
> ]
> ```
> O frontend renderiza as cores reais cadastradas no banco sem precisar de nenhum cache arbitrário!

---

## 6. Prova de Reatividade de Cor: Alteração da Tag no Banco

A cor da tag 1 (`MercadoLivre`) foi alterada no banco de dados de `#DFE104` para `#FF4D4F` (Vermelho) via `PUT /api/tags/1`.
Ao consultar o perfil novamente através de `GET /api/profiles/a1944180-6cd7-47f8-8255-fcc8ffa9c329` (sem alterar nenhum byte no perfil em si), a API retornou:

```json
{
  "id": "a1944180-6cd7-47f8-8255-fcc8ffa9c329",
  "name": "Perfil VIP MercadoLivre #01",
  "group": "Contas Principais",
  "tags": [
    {
      "id": 1,
      "name": "MercadoLivre",
      "color": "#FF4D4F"
    },
    {
      "id": 2,
      "name": "Vendas",
      "color": "#1677FF"
    }
  ],
  "notes": "Conta principal de vendas com proxy dedicado",
  "status": "ready",
  "kernel": "Camoufox",
  "browser_version": "150",
  "os": "windows",
  "created_at": 1790712709,
  "updated_at": 1790712709,
  "last_launch": null,
  "is_deleted": false,
  "deleted_at": null,
  "proxy": {
    "mode": "custom",
    "type": "socks5",
    "host": "192.168.1.150",
    "port": 1080,
    "username": "star_user",
    "password": "secret_pass_123",
    "rotation_url": null,
    "ip_checker": "IP2Location",
    "socks_remote_dns": true
  },
  "fingerprint_json": {
    "audio_sample_rate": 48000,
    "audio_seed": "0x12345678",
    "battery_mode": "desktop",
    "canvas_seed": "0xA1B2C3D4",
    "client_rects_seed": "0x7F3A2B1C",
    "color_depth": 24,
    "cpu_cores": 8,
    "cpu_mode": "custom",
    "custom_accuracy": 1000,
    "custom_language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "custom_screen_height": 1080,
    "custom_screen_width": 1920,
    "custom_timezone": "America/Sao_Paulo",
    "device_name": "DESKTOP-PRO-01",
    "device_name_mode": "custom",
    "device_pixel_ratio": 1,
    "disable_tls_features": "close",
    "do_not_track_mode": "default",
    "extension_category": "kit_basico",
    "extension_mode": "team",
    "extensions": [
      {
        "enabled": true,
        "id": 1,
        "name": "uBlock Origin"
      }
    ],
    "extensoes_ids": [
      1
    ],
    "fonts_mode": "default",
    "hardware_acceleration": "default",
    "hardware_noise": {
      "audio_context": true,
      "canvas": true,
      "client_rects": true,
      "font_metrics": true,
      "font_pack": true,
      "media_devices": false,
      "speech_voices": false,
      "webgl_image": true
    },
    "ip_checker": "IP2Location",
    "kernel": "Camoufox",
    "kernel_version": "150",
    "language_mode": "custom",
    "location_mode": "ip",
    "location_permission": "ask",
    "mac_address": "00:1A:2B:3C:4D:5E",
    "mac_address_mode": "custom",
    "max_touch_points": 0,
    "micros_count": 1,
    "open_tabs_urls": "https://mercadolivre.com.br,https://google.com",
    "os": "windows",
    "os_version": "Windows 10",
    "platform_accounts": [],
    "platform_url": "https://mercadolivre.com.br",
    "port_scan_protection": "open",
    "proxy_host": "192.168.1.150",
    "proxy_mode": "custom",
    "proxy_password": "secret_pass_123",
    "proxy_port": 1080,
    "proxy_type": "socks5",
    "proxy_username": "star_user",
    "ram_gb": 16,
    "ram_mode": "custom",
    "screen_resolution": "1920x1080",
    "screen_resolution_mode": "custom",
    "speakers_count": 2,
    "timezone_mode": "ip",
    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0",
    "user_agent_category": "Todo",
    "webcams_count": 1,
    "webgl_metadata_mode": "custom",
    "webgl_renderer": "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)",
    "webgl_seed": "0x5E6F7A8B",
    "webgl_vendor": "Google Inc. (NVIDIA)",
    "webgpu_mode": "webgl",
    "webrtc_mode": "disabled"
  },
  "extension_mode": "team",
  "extension_category": "kit_basico",
  "extensions": [
    {
      "enabled": true,
      "id": 1,
      "name": "uBlock Origin"
    }
  ]
}
```

✅ **Resultado**: A cor da tag no perfil refletiu instantaneamente `#FF4D4F` através do `JOIN profile_tags`, sem necessidade de sincronização manual ou duplicidade de dados!

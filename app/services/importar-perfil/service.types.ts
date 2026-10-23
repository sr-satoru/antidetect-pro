export interface ImportPreviewItem {
  id?: string;
  name: string;
  group?: string;
  notes?: string;
  username?: string;
  password?: string;
  twofa?: string;
  kernel?: string;
  os?: string;
  platform?: string;
  browser_version?: string;
  initial_urls?: string[];
  proxy_type?: string;
  proxy_host?: string;
  proxy_port?: number;
  proxy_username?: string;
  proxy_password?: string;
  screen_width?: number;
  screen_height?: number;
  user_agent?: string;
  cookies?: any[];
  cookieCount: number;
  rawRecord?: Record<string, string>;
  status: 'valid' | 'warning' | 'invalid';
  validationMessage?: string;
}

export interface BatchImportPayload {
  profiles: Array<{
    id?: string;
    name?: string;
    group?: string;
    notes?: string;
    username?: string;
    password?: string;
    twofa?: string;
    kernel?: string;
    os?: string;
    platform?: string;
    browser_version?: string;
    initial_urls?: string[];
    proxy_type?: string;
    proxy_host?: string;
    proxy_port?: number;
    proxy_username?: string;
    proxy_password?: string;
    screen_width?: number;
    screen_height?: number;
    user_agent?: string;
    cookies?: any[];
  }>;
  raw_text?: string;
  default_group?: string;
  default_kernel?: string;
  default_platform?: string;
  proxy_strategy?: string;
  default_proxy_type?: string;
  default_proxy_host?: string;
  default_proxy_port?: number;
  default_proxy_username?: string;
  default_proxy_password?: string;
}

export interface BatchImportResponse {
  total: number;
  imported: number;
  failed: number;
  imported_ids: string[];
  errors: string[];
}

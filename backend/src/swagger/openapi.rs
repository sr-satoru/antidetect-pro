use serde::{Deserialize, Serialize};
use utoipa::{OpenApi, ToSchema};

// ============================================================================
// SCHEMAS / DTOs PARA DOCUMENTAÇÃO SWAGGER (OPENAPI)
// ============================================================================

#[derive(Serialize, Deserialize, ToSchema)]
pub struct ProfileProxyConfigDoc {
    #[schema(example = "custom")]
    pub mode: String,
    #[schema(example = "socks5")]
    pub proxy_type: String,
    #[schema(example = "192.168.1.100")]
    pub host: Option<String>,
    #[schema(example = 1080)]
    pub port: Option<u16>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub rotation_url: Option<String>,
    #[schema(example = "IP2Location")]
    pub ip_checker: Option<String>,
    #[schema(example = true)]
    pub socks_remote_dns: bool,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct ProfileTagRefDoc {
    #[schema(example = 1)]
    pub id: i64,
    #[schema(example = "Google Ads")]
    pub name: String,
    #[schema(example = "#1677FF")]
    pub color: String,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct PublicTagDoc {
    #[schema(example = "shopee")]
    pub name: String,
    #[schema(example = "#ff5722")]
    pub color: String,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct PublicProfileDoc {
    #[schema(example = "516495ca-d7fc-4103-aa5f-d6e12e5731f7")]
    pub id: String,
    #[schema(example = "Shopee Ads")]
    pub name: String,
    #[schema(example = "AstroFox")]
    pub kernel: String,
    #[schema(example = "135")]
    pub browser_version: String,
    #[schema(example = "windows")]
    pub os: String,
    #[schema(example = "E-commerce")]
    pub group: String,
    pub tags: Vec<PublicTagDoc>,
    #[schema(example = "ready")]
    pub status: String,
    #[schema(example = false)]
    pub running: bool,
    #[schema(example = 1729000000)]
    pub created_at: i64,
    #[schema(example = 1729000000)]
    pub updated_at: i64,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct ProfileDoc {
    #[schema(example = "e87f1390-1c32-4e4f-b644-8cb312d471ac")]
    pub id: String,
    #[schema(example = "Perfil Campanha #1")]
    pub name: String,
    #[schema(example = "Facebook Ads")]
    pub group: String,
    pub tags: Vec<ProfileTagRefDoc>,
    #[schema(example = "Conta matriz")]
    pub notes: String,
    #[schema(example = "ready")]
    pub status: String,
    #[schema(example = "AstroFox")]
    pub kernel: String,
    #[schema(example = "135.0")]
    pub browser_version: String,
    #[schema(example = "windows")]
    pub os: String,
    #[schema(example = 1711756800)]
    pub created_at: i64,
    #[schema(example = 1711756800)]
    pub updated_at: i64,
    pub last_launch: Option<i64>,
    pub is_deleted: bool,
    pub proxy: ProfileProxyConfigDoc,
    #[schema(value_type = Object)]
    pub fingerprint_json: serde_json::Value,
    pub extension_mode: Option<String>,
    pub extension_category: Option<String>,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct CreateProfileDtoDoc {
    #[schema(example = "Meu Perfil")]
    pub name: Option<String>,
    #[schema(example = "Vendas")]
    pub group: Option<String>,
    #[schema(example = json!(["ads", "google"]))]
    pub tags: Option<Vec<String>>,
    #[schema(example = json!([1, 2]))]
    pub tag_ids: Option<Vec<i64>>,
    pub notes: Option<String>,
    #[schema(example = "AstroFox")]
    pub kernel: Option<String>,
    #[schema(example = "windows")]
    pub os: Option<String>,
    pub proxy_type: Option<String>,
    pub proxy_host: Option<String>,
    pub proxy_port: Option<u16>,
    pub proxy_username: Option<String>,
    pub proxy_password: Option<String>,
    #[schema(value_type = Option<Object>)]
    pub fingerprint_json: Option<serde_json::Value>,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct UpdateProfileDtoDoc {
    #[schema(example = "Meu Perfil Atualizado")]
    pub name: Option<String>,
    pub group: Option<String>,
    #[schema(example = json!(["ads", "google"]))]
    pub tags: Option<Vec<String>>,
    #[schema(example = json!([1, 2]))]
    pub tag_ids: Option<Vec<i64>>,
    pub notes: Option<String>,
    pub proxy_type: Option<String>,
    pub proxy_host: Option<String>,
    pub proxy_port: Option<u16>,
    pub proxy_username: Option<String>,
    pub proxy_password: Option<String>,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct LaunchResponseDoc {
    #[schema(example = "launched")]
    pub status: String,
    #[schema(example = "e87f1390-1c32-4e4f-b644-8cb312d471ac")]
    pub profile_id: String,
    #[schema(example = 43210)]
    pub pid: u32,
    #[schema(example = 9222)]
    pub debug_port: u16,
    #[schema(example = "ws://127.0.0.1:9222/devtools/browser/abc")]
    pub ws_endpoint: Option<String>,
    #[schema(example = "AstroFox")]
    pub kernel: String,
    #[schema(example = "Navegador AstroFox iniciado com sucesso (PID: 43210).")]
    pub message: String,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct GenericMessageDoc {
    #[schema(example = true)]
    pub success: bool,
    #[schema(example = "Operação realizada com sucesso.")]
    pub message: String,
}


#[derive(Serialize, Deserialize, ToSchema)]
pub struct CookieStatsDoc {
    #[schema(example = 42)]
    pub total_count: usize,
    pub domains: Vec<DomainSummaryDoc>,
    pub cookies: Vec<UnifiedCookieDoc>,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct DomainSummaryDoc {
    #[schema(example = ".google.com")]
    pub domain: String,
    #[schema(example = 15)]
    pub count: usize,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct UnifiedCookieDoc {
    #[schema(example = "session_id")]
    pub name: String,
    #[schema(example = "abc123xyz")]
    pub value: String,
    #[schema(example = ".example.com")]
    pub domain: String,
    #[schema(example = "/")]
    pub path: String,
    pub expiry: Option<i64>,
    pub is_secure: bool,
    pub is_http_only: bool,
    #[schema(example = "Lax")]
    pub same_site: String,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct ImportCookiesDtoDoc {
    #[schema(example = "[{\"name\": \"test\", \"value\": \"123\", \"domain\": \".example.com\", \"path\": \"/\"}]")]
    pub cookies_raw: String,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct ProxyItemDoc {
    #[schema(example = "px-1")]
    pub id: String,
    #[schema(example = "Proxy Residencial SP")]
    pub name: String,
    #[schema(example = "socks5")]
    pub proxy_type: String,
    #[schema(example = "192.168.1.100")]
    pub host: String,
    #[schema(example = "1080")]
    pub port: String,
    pub user: String,
    pub ip: String,
    #[schema(example = "BR - Brasil")]
    pub country: String,
    #[schema(example = "active")]
    pub status: String,
    pub created_at: i64,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct CreateProxyDtoDoc {
    #[schema(example = "Proxy BR")]
    pub name: Option<String>,
    #[schema(example = "socks5")]
    pub proxy_type: Option<String>,
    #[schema(example = "177.18.29.30")]
    pub host: String,
    #[schema(example = 1080)]
    pub port: u16,
    pub username: Option<String>,
    pub password: Option<String>,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct UpdateProxyDtoDoc {
    #[schema(example = "Proxy BR Atualizado")]
    pub name: Option<String>,
    #[schema(example = "socks5")]
    pub proxy_type: Option<String>,
    #[schema(example = "177.18.29.30")]
    pub host: Option<String>,
    #[schema(example = 1080)]
    pub port: Option<u16>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub status: Option<String>,
    pub country: Option<String>,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct TestProxyDtoDoc {
    #[schema(example = "socks5")]
    pub proxy_type: Option<String>,
    #[schema(example = "177.18.29.30")]
    pub host: String,
    #[schema(example = 1080)]
    pub port: u16,
    pub username: Option<String>,
    pub password: Option<String>,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct ProxyValidationResultDoc {
    #[schema(example = "active")]
    pub status: String,
    #[schema(example = 85)]
    pub latency_ms: Option<u64>,
    #[schema(example = "187.54.12.9")]
    pub exit_ip: Option<String>,
    #[schema(example = "Conexão bem sucedida via SOCKS5")]
    pub message: String,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct TagDoc {
    #[schema(example = 1)]
    pub id: i64,
    #[schema(example = "Campanha Black Friday")]
    pub name: String,
    #[schema(example = "#1677FF")]
    pub color: String,
    pub created_at: i64,
    pub updated_at: i64,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct CreateTagDtoDoc {
    #[schema(example = "Nova Tag")]
    pub name: String,
    #[schema(example = "#52C41A")]
    pub color: Option<String>,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct BatchDeleteTagsDtoDoc {
    #[schema(example = json!([1, 2]))]
    pub ids: Vec<i64>,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct ExtensionItemDoc {
    #[schema(example = 1)]
    pub id: u64,
    #[schema(example = "uBlock Origin")]
    pub name: String,
    pub enabled: bool,
    #[schema(example = "available")]
    pub status: String,
    pub description: String,
    #[schema(example = "Firefox Add-ons")]
    pub provider: String,
    pub tab: String,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct ExtensionCategoryItemDoc {
    #[schema(example = "cat-1")]
    pub id: String,
    #[schema(example = "Farming Social")]
    pub name: String,
    pub description: String,
    pub is_default: bool,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct BrowserStatusDoc {
    #[schema(example = "installed")]
    pub health_status: String,
    #[schema(example = "idle")]
    pub download_status: String,
    #[schema(example = "linux-x86_64")]
    pub platform: String,
    #[schema(example = "Linux")]
    pub os_name: String,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct AuthSessionStatusDoc {
    #[schema(example = "completed")]
    pub status: String,
    #[schema(example = "sess_12345")]
    pub session_id: String,
    #[schema(value_type = Option<Object>)]
    pub user: Option<serde_json::Value>,
    pub token: Option<String>,
}

#[derive(Serialize, Deserialize, ToSchema)]
pub struct UserMeDoc {
    #[schema(example = "usr-123")]
    pub id: String,
    #[schema(example = "usuario@starmultlogin.com")]
    pub email: Option<String>,
    #[schema(example = "Usuário Star")]
    pub name: String,
    #[schema(example = "pro")]
    pub plan: String,
    #[schema(example = 50)]
    pub max_profiles: usize,
    #[schema(example = 12)]
    pub profile_count: usize,
    pub is_offline: bool,
}

// ============================================================================
// DEFINIÇÕES DE ROTAS (PATHS) AUTO-DOCUMENTADAS PARA O SWAGGER UI
// ============================================================================

// --- PERFIS ---
#[utoipa::path(
    get,
    path = "/api/profiles",
    tag = "Perfis",
    summary = "Listar perfis",
    description = "Retorna todos os perfis ativos (não deletados), com suporte a filtros por termo e grupo.",
    params(
        ("search" = Option<String>, Query, description = "Filtrar por nome ou notas"),
        ("group" = Option<String>, Query, description = "Filtrar por pasta/grupo")
    ),
    responses((status = 200, description = "Lista de perfis", body = Vec<ProfileDoc>))
)]
pub async fn doc_list_profiles() {}

#[utoipa::path(
    get,
    path = "/api/profiles/public",
    tag = "Perfis",
    summary = "Puxar ID, Nome e Tags de perfil público",
    description = "Retorna id, nome e tags do perfil para controle e roteamento de agentes de IA. Aceita os parâmetros 'id', 'name' e 'tag'.",
    params(
        ("id" = Option<String>, Query, description = "ID do perfil para puxar"),
        ("name" = Option<String>, Query, description = "Nome do perfil para puxar"),
        ("tag" = Option<String>, Query, description = "Filtrar perfis pela etiqueta/tag (ex: shopee, farm)")
    ),
    responses(
        (status = 200, description = "Perfil retornado com sucesso (id, name e tags)", body = Vec<PublicProfileDoc>),
        (status = 404, description = "Perfil não encontrado")
    )
)]
pub async fn doc_public_profiles() {}

#[utoipa::path(
    post,
    path = "/api/profiles",
    tag = "Perfis",
    summary = "Criar perfil",
    description = "Cria um novo perfil antidetect com canvas, webgl, audio e fingerprint customizados.",
    request_body = CreateProfileDtoDoc,
    responses((status = 201, description = "Perfil criado com sucesso", body = ProfileDoc))
)]
pub async fn doc_create_profile() {}

#[utoipa::path(
    get,
    path = "/api/profiles/trash",
    tag = "Perfis",
    summary = "Listar lixeira",
    description = "Retorna os perfis que foram movidos para a lixeira (soft delete).",
    responses((status = 200, description = "Lista de perfis na lixeira", body = Vec<ProfileDoc>))
)]
pub async fn doc_list_trash() {}

#[utoipa::path(
    delete,
    path = "/api/profiles/trash/empty",
    tag = "Perfis",
    summary = "Esvaziar lixeira",
    description = "Remove permanentemente do disco e do banco todos os perfis da lixeira.",
    responses((status = 200, description = "Lixeira esvaziada", body = GenericMessageDoc))
)]
pub async fn doc_empty_trash() {}

#[utoipa::path(
    get,
    path = "/api/profiles/{id}",
    tag = "Perfis",
    summary = "Obter perfil",
    description = "Obtém todos os metadados e configuração de um perfil pelo seu UUID.",
    params(("id" = String, Path, description = "UUID do perfil")),
    responses(
        (status = 200, description = "Perfil encontrado", body = ProfileDoc),
        (status = 404, description = "Perfil não encontrado")
    )
)]
pub async fn doc_get_profile() {}

#[utoipa::path(
    put,
    path = "/api/profiles/{id}",
    tag = "Perfis",
    summary = "Atualizar perfil",
    description = "Atualiza propriedades, proxy ou notas de um perfil existente.",
    params(("id" = String, Path, description = "UUID do perfil")),
    request_body = UpdateProfileDtoDoc,
    responses((status = 200, description = "Perfil atualizado", body = ProfileDoc))
)]
pub async fn doc_update_profile() {}

#[utoipa::path(
    delete,
    path = "/api/profiles/{id}",
    tag = "Perfis",
    summary = "Mover para lixeira",
    description = "Move o perfil para a lixeira (soft-delete recuperável).",
    params(("id" = String, Path, description = "UUID do perfil")),
    responses((status = 204, description = "Perfil movido para lixeira com sucesso"))
)]
pub async fn doc_delete_profile() {}

#[utoipa::path(
    post,
    path = "/api/profiles/{id}/launch",
    tag = "Perfis",
    summary = "Iniciar navegador",
    description = "Lança o motor antidetect AstroFox / AstroBrowser com a fingerprint isolada e porta de depuração remota.",
    params(("id" = String, Path, description = "UUID do perfil")),
    responses((status = 200, description = "Navegador iniciado", body = LaunchResponseDoc))
)]
pub async fn doc_launch_profile() {}

#[utoipa::path(
    post,
    path = "/api/profiles/{id}/stop",
    tag = "Perfis",
    summary = "Parar navegador",
    description = "Fecha o processo do navegador em execução de forma graciosa.",
    params(("id" = String, Path, description = "UUID do perfil")),
    responses((status = 200, description = "Navegador encerrado"))
)]
pub async fn doc_stop_profile() {}

#[utoipa::path(
    post,
    path = "/api/profiles/{id}/clone",
    tag = "Perfis",
    summary = "Clonar perfil",
    description = "Clona as configurações gerando um novo UUID e nova fingerprint exclusiva.",
    params(("id" = String, Path, description = "UUID do perfil de origem")),
    responses((status = 201, description = "Perfil clonado com sucesso", body = ProfileDoc))
)]
pub async fn doc_clone_profile() {}

#[utoipa::path(
    post,
    path = "/api/profiles/{id}/restore",
    tag = "Perfis",
    summary = "Restaurar perfil da lixeira",
    description = "Restaura um perfil da lixeira de volta para a lista ativa.",
    params(("id" = String, Path, description = "UUID do perfil")),
    responses((status = 200, description = "Perfil restaurado", body = ProfileDoc))
)]
pub async fn doc_restore_profile() {}

#[utoipa::path(
    delete,
    path = "/api/profiles/{id}/permanent",
    tag = "Perfis",
    summary = "Exclusão permanente",
    description = "Remove o diretório do perfil e seus dados definitivamente.",
    params(("id" = String, Path, description = "UUID do perfil")),
    responses((status = 204, description = "Perfil excluído permanentemente"))
)]
pub async fn doc_delete_permanent() {}


// --- COOKIES ---
#[utoipa::path(
    get,
    path = "/api/profiles/{id}/cookies",
    tag = "Cookies",
    summary = "Obter cookies",
    description = "Lê todos os cookies e estatísticas por domínio armazenados no sqlite do perfil.",
    params(("id" = String, Path, description = "UUID do perfil")),
    responses((status = 200, description = "Cookies do perfil", body = CookieStatsDoc))
)]
pub async fn doc_get_cookies() {}

#[utoipa::path(
    post,
    path = "/api/profiles/{id}/cookies",
    tag = "Cookies",
    summary = "Importar cookies",
    description = "Importa cookies nos formatos JSON padrão ou Netscape cookies.txt.",
    params(("id" = String, Path, description = "UUID do perfil")),
    request_body = ImportCookiesDtoDoc,
    responses((status = 200, description = "Resultado da importação"))
)]
pub async fn doc_import_cookies() {}

#[utoipa::path(
    delete,
    path = "/api/profiles/{id}/cookies",
    tag = "Cookies",
    summary = "Limpar cookies",
    description = "Limpa completamente a base de cookies do perfil.",
    params(("id" = String, Path, description = "UUID do perfil")),
    responses((status = 200, description = "Cookies limpos com sucesso"))
)]
pub async fn doc_clear_cookies() {}

// --- PROXIES ---
#[utoipa::path(
    get,
    path = "/api/proxies",
    tag = "Proxies",
    summary = "Listar proxies",
    description = "Retorna todos os proxies salvos na lista gerenciada.",
    responses((status = 200, description = "Lista de proxies", body = Vec<ProxyItemDoc>))
)]
pub async fn doc_list_proxies() {}

#[utoipa::path(
    post,
    path = "/api/proxies",
    tag = "Proxies",
    summary = "Cadastrar proxy",
    description = "Salva um novo proxy HTTP/HTTPS/SOCKS5 no cofre seguro.",
    request_body = CreateProxyDtoDoc,
    responses((status = 201, description = "Proxy cadastrado com sucesso", body = ProxyItemDoc))
)]
pub async fn doc_create_proxy() {}

#[utoipa::path(
    post,
    path = "/api/proxies/test",
    tag = "Proxies",
    summary = "Testar proxy em tempo real",
    description = "Valida autenticação, tempo de resposta (latência) e IP público de saída do túnel proxy.",
    request_body = TestProxyDtoDoc,
    responses((status = 200, description = "Resultado do teste de proxy", body = ProxyValidationResultDoc))
)]
pub async fn doc_test_proxy() {}

#[utoipa::path(
    put,
    path = "/api/proxies/{id}",
    tag = "Proxies",
    summary = "Atualizar proxy",
    description = "Atualiza os dados de um proxy existente no cofre seguro.",
    params(("id" = String, Path, description = "ID do proxy")),
    request_body = UpdateProxyDtoDoc,
    responses((status = 200, description = "Proxy atualizado com sucesso", body = ProxyItemDoc))
)]
pub async fn doc_update_proxy() {}

#[utoipa::path(
    delete,
    path = "/api/proxies/{id}",
    tag = "Proxies",
    summary = "Remover proxy",
    description = "Remove o proxy salvo do cofre.",
    params(("id" = String, Path, description = "ID do proxy")),
    responses((status = 204, description = "Proxy removido"))
)]
pub async fn doc_delete_proxy() {}

// --- TAGS ---
#[utoipa::path(
    get,
    path = "/api/tags",
    tag = "Etiquetas (Tags)",
    summary = "Listar etiquetas",
    description = "Retorna as etiquetas de perfil cadastradas.",
    params(("search" = Option<String>, Query, description = "Filtrar por nome")),
    responses((status = 200, description = "Lista de etiquetas", body = Vec<TagDoc>))
)]
pub async fn doc_list_tags() {}

#[utoipa::path(
    post,
    path = "/api/tags",
    tag = "Etiquetas (Tags)",
    summary = "Criar etiqueta",
    description = "Cria uma nova etiqueta com cor personalizada.",
    request_body = CreateTagDtoDoc,
    responses((status = 201, description = "Etiqueta criada", body = TagDoc))
)]
pub async fn doc_create_tag() {}

#[utoipa::path(
    delete,
    path = "/api/tags/{id}",
    tag = "Etiquetas (Tags)",
    summary = "Excluir etiqueta",
    description = "Remove a etiqueta pelo seu ID.",
    params(("id" = String, Path, description = "ID da etiqueta")),
    responses((status = 204, description = "Etiqueta excluída"))
)]
pub async fn doc_delete_tag() {}

#[utoipa::path(
    post,
    path = "/api/tags/batch-delete",
    tag = "Etiquetas (Tags)",
    summary = "Excluir etiquetas em lote",
    description = "Remove múltiplas etiquetas fornecendo a lista de IDs.",
    request_body = BatchDeleteTagsDtoDoc,
    responses((status = 200, description = "Etiquetas excluídas com sucesso"))
)]
pub async fn doc_batch_delete_tags() {}

// --- EXTENSÕES ---
#[utoipa::path(
    get,
    path = "/api/extensions",
    tag = "Extensões",
    summary = "Listar extensões",
    description = "Retorna as extensões instaladas no ecossistema local.",
    responses((status = 200, description = "Lista de extensões", body = Vec<ExtensionItemDoc>))
)]
pub async fn doc_list_extensions() {}

#[utoipa::path(
    get,
    path = "/api/extensions/catalog",
    tag = "Extensões",
    summary = "Catálogo de extensões",
    description = "Pesquisa extensões recomendadas no catálogo curated.",
    params(
        ("q" = Option<String>, Query, description = "Termo de busca"),
        ("category" = Option<String>, Query, description = "Categoria"),
        ("store" = Option<String>, Query, description = "Loja de origem")
    ),
    responses((status = 200, description = "Extensões encontradas"))
)]
pub async fn doc_get_extension_catalog() {}

#[utoipa::path(
    get,
    path = "/api/extension-categories",
    tag = "Extensões",
    summary = "Listar categorias de extensões",
    description = "Retorna os grupos/categorias de extensões cadastradas.",
    responses((status = 200, description = "Lista de categorias", body = Vec<ExtensionCategoryItemDoc>))
)]
pub async fn doc_list_extension_categories() {}

// --- MOTOR NAVEGADOR ---
#[utoipa::path(
    get,
    path = "/api/browser/status",
    tag = "Motor do Navegador",
    summary = "Status do motor AstroFox",
    description = "Retorna a integridade dos binários locais do navegador antidetect e status de download.",
    responses((status = 200, description = "Status do motor", body = BrowserStatusDoc))
)]
pub async fn doc_browser_status() {}

#[utoipa::path(
    post,
    path = "/api/browser/download",
    tag = "Motor do Navegador",
    summary = "Disparar download do motor",
    description = "Inicia em segundo plano o download e extração dos binários do AstroFox.",
    responses((status = 200, description = "Download iniciado", body = GenericMessageDoc))
)]
pub async fn doc_browser_download() {}

// --- NUVEM & SYNC ---
#[utoipa::path(
    post,
    path = "/api/cloud-sync/pull",
    tag = "Sincronização em Nuvem",
    summary = "Baixar perfis da nuvem",
    description = "Baixa todos os perfis armazenados na nuvem para o armazenamento local.",
    params(("force" = Option<bool>, Query, description = "Forçar sobrescrita local")),
    responses((status = 200, description = "Perfis sincronizados"))
)]
pub async fn doc_cloud_pull() {}

#[utoipa::path(
    post,
    path = "/api/cloud-sync/two-way",
    tag = "Sincronização em Nuvem",
    summary = "Sincronização bidirecional",
    description = "Executa reconciliação bidirecional completa com algoritmo Last-Write-Wins.",
    responses((status = 200, description = "Sincronização finalizada"))
)]
pub async fn doc_cloud_two_way() {}

#[utoipa::path(
    post,
    path = "/api/cloud-sync/{id}/sync",
    tag = "Sincronização em Nuvem",
    summary = "Fazer upload do perfil",
    description = "Envia snapshot criptografado do perfil para o storage da nuvem.",
    params(("id" = String, Path, description = "UUID do perfil")),
    responses((status = 200, description = "Upload concluído"))
)]
pub async fn doc_cloud_sync_profile() {}

#[utoipa::path(
    get,
    path = "/api/cloud-sync/health",
    tag = "Sincronização em Nuvem",
    summary = "Testar conexão com a nuvem",
    description = "Verifica se os servidores de nuvem Star estão operacionais.",
    responses((status = 200, description = "Servidor em nuvem online"))
)]
pub async fn doc_cloud_health() {}

// --- AUTENTICAÇÃO ---
#[utoipa::path(
    post,
    path = "/api/auth/start-login",
    tag = "Autenticação",
    summary = "Iniciar login",
    description = "Gera uma sessão temporária e URL de autorização OAuth2 loopback.",
    responses((status = 200, description = "Sessão criada"))
)]
pub async fn doc_auth_start_login() {}

#[utoipa::path(
    get,
    path = "/api/auth/session/{session_id}",
    tag = "Autenticação",
    summary = "Consultar sessão de login",
    description = "Verifica se o usuário completou a autorização no navegador externo.",
    params(("session_id" = String, Path, description = "ID da sessão gerada")),
    responses((status = 200, description = "Status da sessão", body = AuthSessionStatusDoc))
)]
pub async fn doc_auth_session_status() {}

#[utoipa::path(
    get,
    path = "/api/auth/me",
    tag = "Autenticação",
    summary = "Usuário atual",
    description = "Retorna os dados do plano e perfil do usuário conectado ou modo offline.",
    responses((status = 200, description = "Dados do usuário", body = UserMeDoc))
)]
pub async fn doc_auth_me() {}

#[utoipa::path(
    post,
    path = "/api/auth/logout",
    tag = "Autenticação",
    summary = "Desconectar",
    description = "Limpa a sessão atual e tokens de autenticação locais.",
    responses((status = 200, description = "Desconectado com sucesso"))
)]
pub async fn doc_auth_logout() {}

// ============================================================================
// OPENAPI SPECIFICATION GENERATOR
// ============================================================================

#[derive(OpenApi)]
#[openapi(
    paths(
        // Perfis
        doc_list_profiles,
        doc_public_profiles,
        doc_create_profile,
        doc_list_trash,
        doc_empty_trash,
        doc_get_profile,
        doc_update_profile,
        doc_delete_profile,
        doc_launch_profile,
        doc_stop_profile,
        doc_clone_profile,
        doc_restore_profile,
        doc_delete_permanent,
        // Cookies
        doc_get_cookies,
        doc_import_cookies,
        doc_clear_cookies,
        // Proxies
        doc_list_proxies,
        doc_create_proxy,
        doc_update_proxy,
        doc_test_proxy,
        doc_delete_proxy,
        // Tags
        doc_list_tags,
        doc_create_tag,
        doc_delete_tag,
        doc_batch_delete_tags,
        // Extensões
        doc_list_extensions,
        doc_get_extension_catalog,
        doc_list_extension_categories,
        // Motor Navegador
        doc_browser_status,
        doc_browser_download,
        // Nuvem
        doc_cloud_pull,
        doc_cloud_two_way,
        doc_cloud_sync_profile,
        doc_cloud_health,
        // Auth
        doc_auth_start_login,
        doc_auth_session_status,
        doc_auth_me,
        doc_auth_logout,
    ),
    components(
        schemas(
            PublicProfileDoc,
            PublicTagDoc,
            ProfileTagRefDoc,
            ProfileDoc,
            ProfileProxyConfigDoc,
            CreateProfileDtoDoc,
            UpdateProfileDtoDoc,
            LaunchResponseDoc,
            GenericMessageDoc,
            CookieStatsDoc,
            DomainSummaryDoc,
            UnifiedCookieDoc,
            ImportCookiesDtoDoc,
            ProxyItemDoc,
            CreateProxyDtoDoc,
            UpdateProxyDtoDoc,
            TestProxyDtoDoc,
            ProxyValidationResultDoc,
            TagDoc,
            CreateTagDtoDoc,
            BatchDeleteTagsDtoDoc,
            ExtensionItemDoc,
            ExtensionCategoryItemDoc,
            BrowserStatusDoc,
            AuthSessionStatusDoc,
            UserMeDoc,
        )
    ),
    tags(
        (name = "Perfis", description = "Gerenciamento, lançamento e isolamento de perfis antidetect"),
        (name = "Cookies", description = "Extração, importação e limpeza de cookies dos navegadores"),
        (name = "Proxies", description = "Validação, latência e cadastro seguro de proxies residenciais e móveis"),
        (name = "Etiquetas (Tags)", description = "Organização e categorização visual de perfis"),
        (name = "Extensões", description = "Gestão de extensões e add-ons Firefox e Chrome"),
        (name = "Motor do Navegador", description = "Monitoramento e download automatizado do AstroFox / AstroBrowser"),
        (name = "Sincronização em Nuvem", description = "Backup bidirecional e reconciliação LWW com servidores Star"),
        (name = "Autenticação", description = "Gerenciamento de credenciais, OAuth2 e sessões de usuário")
    ),
    info(
        title = "Star Multlogin API",
        version = "1.0.0",
        description = "Documentação interativa e auto-gerada da API Star Multlogin Backend. Teste requisições, visualize schemas e explore os endpoints diretamente pelo Swagger UI.",
        contact(
            name = "Suporte Star Multlogin",
            url = "https://starmultlogin.com"
        )
    )
)]
pub struct ApiDoc;

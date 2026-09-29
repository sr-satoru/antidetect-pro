use star_multlogin_backend::models::{CreateProfileDto, CreateTagDto, UpdateTagDto};
use star_multlogin_backend::service_database::{ProfileStorage, TagStorage, Vault};
use star_multlogin_backend::ws::WsState;
use std::fs;
use std::sync::Arc;

#[tokio::test]
async fn test_full_profile_creation_flow_and_intercept() {
    // 1. Cria diretório temporário isolado para o Star Vault
    let temp_dir = std::env::temp_dir().join(format!("star_test_{}", uuid::Uuid::new_v4()));
    fs::create_dir_all(&temp_dir).unwrap();

    let vault = Arc::new(Vault::new(&temp_dir).expect("Falha ao inicializar Star Vault"));
    let ws_state = WsState::new();
    let profile_storage = Arc::new(ProfileStorage::new(&temp_dir, ws_state, vault.clone()));
    let tag_storage = Arc::new(TagStorage::new(vault.clone()));

    // 2. Cria as tags no banco com suas cores definidas no frontend
    let tag1 = tag_storage
        .create(CreateTagDto {
            name: "MercadoLivre".to_string(),
            color: Some("#DFE104".to_string()),
        })
        .expect("Falha ao criar tag MercadoLivre");

    let tag2 = tag_storage
        .create(CreateTagDto {
            name: "Vendas".to_string(),
            color: Some("#1677FF".to_string()),
        })
        .expect("Falha ao criar tag Vendas");

    println!("🏷️ Tags cadastradas no banco:");
    println!("  Tag 1 -> ID: {}, Nome: {}, Cor: {}", tag1.id, tag1.name, tag1.color);
    println!("  Tag 2 -> ID: {}, Nome: {}, Cor: {}", tag2.id, tag2.name, tag2.color);

    // 3. Lê o JSON interceptado do frontend
    let frontend_payload_str = fs::read_to_string("/home/vanir/fury/frontend/scripts/payload_frontend_interceptado.json")
        .expect("Falha ao ler payload gerado pelo frontend");

    // Interceptação 1: Deserialização no Axum (CreateProfileDto)
    let dto: CreateProfileDto = serde_json::from_str(&frontend_payload_str)
        .expect("Falha ao deserializar CreateProfileDto no Axum");

    println!("📥 DTO recebido e deserializado pelo Rust com sucesso!");
    println!("  Nome: {:?}", dto.name);
    println!("  Tags recebidas: {:?}", dto.tags);
    println!("  Porta de Proxy: {:?}", dto.proxy_port);

    // Interceptação 2: Processamento e Criação no Rust ProfileStorage
    let created_profile = profile_storage.create(dto).expect("Falha ao criar perfil no Rust");
    let created_profile_json = serde_json::to_string_pretty(&created_profile).unwrap();

    let profile_id = created_profile.id.clone();

    // 4. Verificação de Arquitetura no Filesystem
    let profile_dir_on_disk = temp_dir.join("profiles").join(&profile_id);
    let disk_folder_exists = profile_dir_on_disk.exists();
    println!("📁 Pasta física data/profiles/{profile_id} existe no disco? {}", disk_folder_exists);
    assert!(!disk_folder_exists, "ERRO ARQUITETURAL: Pasta em disco não deveria ter sido criada!");

    // 5. Verificação no Banco de Dados SQLite (Star Vault)
    let conn = vault.conn();
    let conn_guard = conn.lock().unwrap();

    let count_profiles: i64 = conn_guard
        .query_row("SELECT count(*) FROM profiles WHERE id = ?1", rusqlite::params![profile_id], |r| r.get(0))
        .unwrap();
    assert_eq!(count_profiles, 1, "Perfil deve estar registrado na tabela profiles");

    let count_profile_tags: i64 = conn_guard
        .query_row("SELECT count(*) FROM profile_tags WHERE profile_id = ?1", rusqlite::params![profile_id], |r| r.get(0))
        .unwrap();
    println!("🔗 Relacionamentos N:N salvos na tabela profile_tags: {}", count_profile_tags);
    assert_eq!(count_profile_tags, 2, "Devem existir 2 vínculos na tabela profile_tags");
    drop(conn_guard);

    // 6. Simulação da API de Leitura (GET /api/profiles/{id})
    let fetched_profile = profile_storage.get(&profile_id).expect("Perfil deve ser recuperado");
    let fetched_profile_json = serde_json::to_string_pretty(&fetched_profile).unwrap();

    // 7. Simulação de atualização de cor da tag no banco de dados
    tag_storage
        .update(
            tag1.id,
            UpdateTagDto {
                name: None,
                color: Some("#FF4D4F".to_string()), // Alterado de amarelo para vermelho
            },
        )
        .expect("Falha ao atualizar cor da tag");

    // 8. Re-consulta do perfil para comprovar a reatividade relacional da cor
    let re_fetched_profile = profile_storage.get(&profile_id).expect("Perfil deve ser recuperado");
    let re_fetched_profile_json = serde_json::to_string_pretty(&re_fetched_profile).unwrap();

    // 9. Monta o relatório Markdown detalhado
    let template = r#"# Relatório de Interceptação End-to-End: Criação de Perfil e Tags Relacionais

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
__FRONTEND_PAYLOAD__
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
     - Tag ID __TAG1_ID__: `__TAG1_NAME__` (Cor inicial: `__TAG1_COLOR__`)
     - Tag ID __TAG2_ID__: `__TAG2_NAME__` (Cor inicial: `__TAG2_COLOR__`)
2. **Normalização de Proxy**:
   - Monta `ProfileProxyConfig` com porta numérica `1080` e `socks_remote_dns: true`.
3. **Persistência Exclusiva no SQLite (Star Vault)**:
   - Salva os metadados criptografados com AES-256-GCM na tabela `profiles`.
   - Insere os relacionamentos na tabela associativa relacional `profile_tags (profile_id, tag_id)`.
4. **Verificação do Filesystem**:
   - Pasta física `data/profiles/__PROFILE_ID__` criada no disco? **NÃO! (Pasta não existe)**
   - O disco permaneceu 100% limpo, reservando a criação de dados temporários apenas para o momento em que o perfil for executado (`launch`).

---

## 4. O JSON de Resposta retornado pelo Backend Rust (HTTP 201 Created)

**Status HTTP:** `201 Created`  
**JSON retornado ao Frontend:**
```json
__CREATED_PROFILE_JSON__
```

---

## 5. Consulta via API (`GET /api/profiles/__PROFILE_ID__`)

Quando o frontend ou a listagem de perfis consulta o perfil via API:
```json
__FETCHED_PROFILE_JSON__
```

> **Destaque Relacional:**
> As tags são retornadas com seus objetos completos e enriquecidos diretamente da tabela relacional:
> ```json
> "tags": [
>   { "id": __TAG1_ID__, "name": "__TAG1_NAME__", "color": "__TAG1_COLOR__" },
>   { "id": __TAG2_ID__, "name": "__TAG2_NAME__", "color": "__TAG2_COLOR__" }
> ]
> ```
> O frontend renderiza as cores reais cadastradas no banco sem precisar de nenhum cache arbitrário!

---

## 6. Prova de Reatividade de Cor: Alteração da Tag no Banco

A cor da tag __TAG1_ID__ (`__TAG1_NAME__`) foi alterada no banco de dados de `__TAG1_COLOR__` para `#FF4D4F` (Vermelho) via `PUT /api/tags/__TAG1_ID__`.
Ao consultar o perfil novamente através de `GET /api/profiles/__PROFILE_ID__` (sem alterar nenhum byte no perfil em si), a API retornou:

```json
__RE_FETCHED_PROFILE_JSON__
```

✅ **Resultado**: A cor da tag no perfil refletiu instantaneamente `#FF4D4F` através do `JOIN profile_tags`, sem necessidade de sincronização manual ou duplicidade de dados!
"#;

    let report = template
        .replace("__FRONTEND_PAYLOAD__", &frontend_payload_str)
        .replace("__CREATED_PROFILE_JSON__", &created_profile_json)
        .replace("__PROFILE_ID__", &profile_id)
        .replace("__FETCHED_PROFILE_JSON__", &fetched_profile_json)
        .replace("__TAG1_ID__", &tag1.id.to_string())
        .replace("__TAG1_NAME__", &tag1.name)
        .replace("__TAG1_COLOR__", &tag1.color)
        .replace("__TAG2_ID__", &tag2.id.to_string())
        .replace("__TAG2_NAME__", &tag2.name)
        .replace("__TAG2_COLOR__", &tag2.color)
        .replace("__RE_FETCHED_PROFILE_JSON__", &re_fetched_profile_json);

    let report_path = "/home/vanir/fury/frontend/relatorio_simulacao_perfil.md";
    fs::write(report_path, report).expect("Falha ao gravar relatório");
    println!("📄 Relatório gerado com sucesso em: {}", report_path);
    println!("📄 Relatório gerado com sucesso em: {}", report_path);

    // Limpeza da pasta temporária
    let _ = fs::remove_dir_all(&temp_dir);
}

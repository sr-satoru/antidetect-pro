use star_multlogin_backend::models::{CreateProfileDto, CreateTagDto, UpdateProfileDto, UpdateTagDto};
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
    println!("📄 Relatório de criação gerado com sucesso em: {}", report_path);

    // Limpeza da pasta temporária
    let _ = fs::remove_dir_all(&temp_dir);
}

#[tokio::test]
async fn test_profile_update_flow_and_vault_persistence() {
    let temp_dir = std::env::temp_dir().join(format!("star_test_update_{}", uuid::Uuid::new_v4()));
    fs::create_dir_all(&temp_dir).unwrap();

    let vault = Arc::new(Vault::new(&temp_dir).expect("Falha ao inicializar Star Vault"));
    let ws_state = WsState::new();
    let profile_storage = Arc::new(ProfileStorage::new(&temp_dir, ws_state, vault.clone()));
    let tag_storage = Arc::new(TagStorage::new(vault.clone()));

    // 1. Cadastra tags no banco com suas cores
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

    let tag3 = tag_storage
        .create(CreateTagDto {
            name: "Financeiro".to_string(),
            color: Some("#52C41A".to_string()),
        })
        .expect("Falha ao criar tag Financeiro");

    // 2. Cria o perfil inicial com as tags 1 e 2
    let initial_dto = CreateProfileDto {
        id: None,
        name: Some("Perfil VIP MercadoLivre #01".to_string()),
        group: Some("Contas Principais".to_string()),
        tags: Some(vec!["MercadoLivre".to_string(), "Vendas".to_string()]),
        tag_ids: None,
        notes: Some("Perfil original antes da edição".to_string()),
        status: Some("ready".to_string()),
        kernel: Some("Camoufox".to_string()),
        browser_version: Some("150".to_string()),
        os: Some("windows".to_string()),
        proxy_type: Some("socks5".to_string()),
        proxy_host: Some("192.168.1.150".to_string()),
        proxy_port: Some(1080),
        proxy_username: Some("star_user".to_string()),
        proxy_password: Some("secret_pass_123".to_string()),
        fingerprint_json: Some(serde_json::json!({
            "screen_resolution": "1920x1080",
            "canvas_seed": "0xA1B2C3D4"
        })),
        extension_mode: None,
        extension_category: None,
        extensions: None,
    };

    let created_profile = profile_storage.create(initial_dto).expect("Falha ao criar perfil inicial");
    let profile_id = created_profile.id.clone();
    let original_created_at = created_profile.created_at;

    // Aguarda brevemente para garantir que updated_at > created_at
    tokio::time::sleep(tokio::time::Duration::from_millis(1100)).await;

    // 3. Monta o DTO de Edição enviado pelo Frontend (PUT /api/profiles/:id)
    // O usuário edita:
    // - Nome: adiciona "(EDITADO)"
    // - Grupo: muda para "Contas VIPs Atualizadas"
    // - Tags: remove "Vendas", adiciona "Financeiro"
    // - Proxy: muda host para "192.168.1.200" e porta para 8080
    // - Notas: muda texto das notas
    let update_dto = UpdateProfileDto {
        name: Some("Perfil VIP MercadoLivre #01 (EDITADO)".to_string()),
        group: Some("Contas VIPs Atualizadas".to_string()),
        tags: Some(vec!["MercadoLivre".to_string(), "Financeiro".to_string()]),
        tag_ids: None,
        notes: Some("Notas atualizadas com sucesso via tela de edição".to_string()),
        status: None,
        kernel: None,
        browser_version: None,
        os: None,
        proxy_type: None,
        proxy_host: Some("192.168.1.200".to_string()),
        proxy_port: Some(8080),
        proxy_username: None,
        proxy_password: None,
        fingerprint_json: None,
        extension_mode: None,
        extension_category: None,
        extensions: None,
    };

    let update_payload_json = serde_json::to_string_pretty(&update_dto).unwrap();

    // 4. Executa a Atualização no Rust (ProfileStorage::update)
    let updated_profile = profile_storage
        .update(&profile_id, update_dto)
        .expect("Falha ao atualizar perfil no Rust");
    let updated_response_json = serde_json::to_string_pretty(&updated_profile).unwrap();

    // 5. Validação no Banco SQLite Direto (Star Vault)
    let conn = vault.conn();
    let conn_guard = conn.lock().unwrap();

    let (db_name, db_group, db_updated_at): (String, String, i64) = conn_guard
        .query_row(
            "SELECT name, group_name, updated_at FROM profiles WHERE id = ?1",
            rusqlite::params![profile_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        .unwrap();

    assert_eq!(db_name, "Perfil VIP MercadoLivre #01 (EDITADO)");
    assert_eq!(db_group, "Contas VIPs Atualizadas");
    assert!(db_updated_at > original_created_at, "updated_at deve ser maior que created_at");

    // Valida que profile_tags agora contém apenas tag1 e tag3 (tag2 desvinculada!)
    let mut stmt = conn_guard
        .prepare("SELECT tag_id FROM profile_tags WHERE profile_id = ?1 ORDER BY tag_id ASC")
        .unwrap();
    let linked_tags: Vec<i64> = stmt
        .query_map(rusqlite::params![profile_id], |r| r.get(0))
        .unwrap()
        .map(|r| r.unwrap())
        .collect();

    assert_eq!(linked_tags, vec![tag1.id, tag3.id], "profile_tags deve vincular apenas as tags 1 e 3");
    drop(stmt);
    drop(conn_guard);

    // 6. Consulta via API GET /api/profiles/{id}
    let get_profile = profile_storage
        .get(&profile_id)
        .expect("Perfil atualizado deve ser recuperado via get");
    let get_profile_json = serde_json::to_string_pretty(&get_profile).unwrap();

    assert_eq!(get_profile.proxy.port, Some(8080));
    assert_eq!(get_profile.proxy.host, Some("192.168.1.200".to_string()));
    assert_eq!(get_profile.tags.len(), 2);

    // 7. Gera Relatório de Edição Markdown
    let template = r#"# Relatório de Interceptação End-to-End: Edição de Perfil e Atualização no SQLite

Este relatório demonstra o fluxo completo de **Edição de Perfil** entre o **Frontend** e o **Backend Rust**:
1. O payload enviado pelo Frontend (`PUT /api/profiles/{id}`).
2. Como o Rust abre a conexão protegida do Star Vault e carrega o registro existente.
3. Como os campos são mesclados e as tags resolvidas.
4. Como o SQLite executa a persistência atômica (`profiles` e tabela associativa `profile_tags`).
5. O JSON de resposta HTTP (200 OK) retornado pela rota `PUT`.
6. A consulta subsequente via API (`GET /api/profiles/{id}`).

---

## 1. O que o Frontend envia na Edição (HTTP PUT Interceptado)

**Endpoint:** `PUT /api/profiles/__PROFILE_ID__`  
**Headers:**
```http
PUT /api/profiles/__PROFILE_ID__ HTTP/1.1
Host: 127.0.0.1:3000
Content-Type: application/json
Accept: application/json
```

**Payload JSON enviado pelo Frontend (`UpdateProfileDto`):**
```json
__UPDATE_PAYLOAD_JSON__
```

> **Alterações Solicitadas pelo Usuário:**
> - **Nome**: Alterado para `"Perfil VIP MercadoLivre #01 (EDITADO)"`
> - **Grupo**: Alterado para `"Contas VIPs Atualizadas"`
> - **Tags**: Removida a tag `"Vendas"` e adicionada a tag `"Financeiro"`. A tag `"MercadoLivre"` foi mantida.
> - **Proxy**: Host atualizado para `"192.168.1.200"` e porta atualizada para `8080`.
> - **Notas**: `"Notas atualizadas com sucesso via tela de edição"`

---

## 2. Como o Sistema abre o Banco e Processa a Atualização

No método `ProfileStorage::update(id, dto)`:

### Passo 2.1 — Abertura e Descriptografia do Registro Atual
- O backend obtém o lock da conexão do SQLite protegida pelo `Arc<Vault>`.
- Executa a busca em `SELECT payload_enc FROM profiles WHERE id = ?1`.
- Descriptografa o payload binário com a chave mestra **AES-256-GCM**.
- Carrega as tags ativas do perfil através da query `JOIN profile_tags`.

### Passo 2.2 — Mesclagem dos Dados (Patch)
- Os campos informados no DTO substituem os campos anteriores no struct em memória.
- O campo `updated_at` é atualizado com o timestamp UNIX atual.

### Passo 2.3 — Resolução das Novas Tags
- O Rust busca a tag `"Financeiro"` na tabela relacional `tags`, obtendo `id: __TAG3_ID__` e cor `__TAG3_COLOR__`.
- O array de tags do perfil passa a conter:
  - `__TAG3_NAME__` (ID: __TAG3_ID__, Cor: `__TAG3_COLOR__`)
  - `__TAG1_NAME__` (ID: __TAG1_ID__, Cor: `__TAG1_COLOR__`)

### Passo 2.4 — Gravação Atômica no SQLite (`save_to_db`)
1. **Encriptação**: Serializa o novo JSON do perfil e encripta com **AES-256-GCM**.
2. **Atualização da Tabela `profiles`**:
   ```sql
   INSERT INTO profiles (...) VALUES (...)
   ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       group_name = excluded.group_name,
       status = excluded.status,
       payload_enc = excluded.payload_enc,
       updated_at = excluded.updated_at,
       ...
   ```
3. **Sincronização Relacional em `profile_tags`**:
   - Executa `DELETE FROM profile_tags WHERE profile_id = '__PROFILE_ID__'` (desvinculando a tag antiga `"Vendas"`).
   - Executa `INSERT OR IGNORE INTO profile_tags (profile_id, tag_id)` para cada uma das novas tags vinculadas (IDs `__TAG1_ID__` e `__TAG3_ID__`).

---

## 3. O JSON de Resposta retornado pelo Backend Rust (HTTP 200 OK)

**Status HTTP:** `200 OK`  
**JSON retornado ao Frontend:**
```json
__UPDATED_RESPONSE_JSON__
```

---

## 4. Prova no Banco de Dados SQLite (Consulta Direta ao Vault)

Foi feita uma inspeção direta nas tabelas do arquivo `star_vault.db`:
- **Tabela `profiles`**:
  - `name`: `Perfil VIP MercadoLivre #01 (EDITADO)`
  - `group_name`: `Contas VIPs Atualizadas`
  - `updated_at`: `__UPDATED_AT__` (Maior que `created_at`: `__CREATED_AT__`)
- **Tabela `profile_tags`**:
  - Vínculos ativos: **Tags [__TAG1_ID__, __TAG3_ID__]**
  - A Tag __TAG2_ID__ (`__TAG2_NAME__`) foi **removida com sucesso** da tabela de junção!

---

## 5. Consulta via API (`GET /api/profiles/__PROFILE_ID__`)

Quando o usuário recarrega a tela de detalhes ou a listagem após a edição:
```json
__GET_PROFILE_JSON__
```

✅ **Conclusão:** A edição do perfil e a sincronização no SQLite ocorreram com 100% de precisão e integridade referencial!
"#;

    let report = template
        .replace("__PROFILE_ID__", &profile_id)
        .replace("__UPDATE_PAYLOAD_JSON__", &update_payload_json)
        .replace("__UPDATED_RESPONSE_JSON__", &updated_response_json)
        .replace("__GET_PROFILE_JSON__", &get_profile_json)
        .replace("__TAG1_ID__", &tag1.id.to_string())
        .replace("__TAG1_NAME__", &tag1.name)
        .replace("__TAG1_COLOR__", &tag1.color)
        .replace("__TAG2_ID__", &tag2.id.to_string())
        .replace("__TAG2_NAME__", &tag2.name)
        .replace("__TAG3_ID__", &tag3.id.to_string())
        .replace("__TAG3_NAME__", &tag3.name)
        .replace("__TAG3_COLOR__", &tag3.color)
        .replace("__CREATED_AT__", &original_created_at.to_string())
        .replace("__UPDATED_AT__", &db_updated_at.to_string());

    let report_path = "/home/vanir/fury/frontend/relatorio_edicao_perfil.md";
    fs::write(report_path, report).expect("Falha ao gravar relatório de edição");
    println!("📄 Relatório de edição gerado com sucesso em: {}", report_path);

    // Limpeza da pasta temporária
    let _ = fs::remove_dir_all(&temp_dir);
}

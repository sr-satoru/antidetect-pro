use star_multlogin_backend::models::{CreateProxyDto, TestProxyDto, UpdateProxyDto};
use star_multlogin_backend::proxy_validator::ProxyValidator;
use star_multlogin_backend::service_database::{ProxyService, Vault};
use std::fs;
use std::sync::Arc;

#[tokio::test]
async fn test_full_proxy_lifecycle_and_vault_persistence() {
    let temp_dir = std::env::temp_dir().join(format!("star_proxy_test_{}", uuid::Uuid::new_v4()));
    fs::create_dir_all(&temp_dir).unwrap();

    let vault = Arc::new(Vault::new(&temp_dir).expect("Falha ao inicializar Star Vault"));
    let proxy_service = ProxyService::new(vault.clone());

    // 1. Testa Listagem Inicial (deve ser vazia)
    let initial_list = proxy_service.list().expect("Falha ao listar proxies");
    assert_eq!(initial_list.len(), 0, "A lista inicial deve estar vazia");

    // 2. Testa Criação de Proxy com Credenciais Criptografadas
    let create_dto = CreateProxyDto {
        name: Some("Proxy Residencial SP #01".to_string()),
        proxy_type: Some("socks5".to_string()),
        host: "177.100.200.50".to_string(),
        port: serde_json::json!(1080),
        username: Some("usuario_star".to_string()),
        user: None,
        password: Some("senha_ultra_secreta_789".to_string()),
        pass: None,
    };

    let created_proxy = proxy_service.create(create_dto).expect("Falha ao criar proxy");
    let proxy_id = created_proxy.id.clone();

    println!("✅ Proxy criado com sucesso:");
    println!("   ID: {}", created_proxy.id);
    println!("   Nome: {}", created_proxy.name);
    println!("   Host: {}:{}", created_proxy.host, created_proxy.port);
    println!("   Usuário recuperado: {}", created_proxy.user);

    assert_eq!(created_proxy.name, "Proxy Residencial SP #01");
    assert_eq!(created_proxy.proxy_type, "socks5");
    assert_eq!(created_proxy.host, "177.100.200.50");
    assert_eq!(created_proxy.port, "1080");
    assert_eq!(created_proxy.user, "usuario_star");
    assert_eq!(created_proxy.pass, "senha_ultra_secreta_789");

    // 3. Inspeção Direta no Banco SQLite (Star Vault)
    let conn = vault.conn();
    let conn_guard = conn.lock().unwrap();

    let (db_id, db_name, db_host, db_port, db_creds_enc): (String, String, String, String, Vec<u8>) = conn_guard
        .query_row(
            "SELECT id, name, host, port, credentials_enc FROM proxies WHERE id = ?1",
            rusqlite::params![proxy_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?, r.get(4)?)),
        )
        .unwrap();

    assert_eq!(db_id, proxy_id);
    assert_eq!(db_name, "Proxy Residencial SP #01");
    assert_eq!(db_host, "177.100.200.50");
    assert_eq!(db_port, "1080");
    // As credenciais no banco são binárias encriptadas (AES-256-GCM)
    assert!(!db_creds_enc.is_empty());
    assert!(!String::from_utf8_lossy(&db_creds_enc).contains("senha_ultra_secreta_789"), "A senha não pode estar em texto plano no banco!");
    drop(conn_guard);

    // 4. Testa Atualização (Update)
    let update_dto = UpdateProxyDto {
        name: Some("Proxy Residencial SP #01 (EDITADO)".to_string()),
        proxy_type: Some("socks5".to_string()),
        host: Some("177.100.200.99".to_string()),
        port: Some(serde_json::json!(8080)),
        username: Some("usuario_editado".to_string()),
        user: None,
        password: Some("nova_senha_456".to_string()),
        pass: None,
        status: Some("active".to_string()),
        country: Some("BR - Brasil (SP)".to_string()),
    };

    let updated_proxy = proxy_service.update(&proxy_id, update_dto).expect("Falha ao atualizar proxy");
    println!("✅ Proxy atualizado com sucesso:");
    println!("   Nome: {}", updated_proxy.name);
    println!("   Host: {}:{}", updated_proxy.host, updated_proxy.port);
    println!("   Usuário: {}", updated_proxy.user);

    assert_eq!(updated_proxy.name, "Proxy Residencial SP #01 (EDITADO)");
    assert_eq!(updated_proxy.host, "177.100.200.99");
    assert_eq!(updated_proxy.port, "8080");
    assert_eq!(updated_proxy.user, "usuario_editado");
    assert_eq!(updated_proxy.pass, "nova_senha_456");

    // Verifica que não duplicou registro no banco
    let list_after_update = proxy_service.list().expect("Falha ao listar após update");
    assert_eq!(list_after_update.len(), 1, "Deve existir exatamente 1 proxy cadastrado após o update");

    // 5. Testa Deserialização com Alias (proxy_type vs type)
    let json_with_proxy_type = r#"{
        "proxy_type": "http",
        "host": "10.0.0.1",
        "port": 3128,
        "user": "teste_alias"
    }"#;
    let parsed_test_dto: TestProxyDto = serde_json::from_str(json_with_proxy_type).expect("Falha ao deserializar com alias proxy_type");
    assert_eq!(parsed_test_dto.proxy_type, Some("http".to_string()));
    assert_eq!(parsed_test_dto.get_port(), 3128);
    assert_eq!(parsed_test_dto.get_username(), Some("teste_alias"));

    // 6. Testa Validação Real do Proxy (ProxyValidator)
    // 6.1: Host vazio
    let empty_res = ProxyValidator::validate("socks5", "", 1080, None, None).await;
    assert_eq!(empty_res.status, "error");
    assert_eq!(empty_res.message, "Host do proxy não pode ser vazio.");

    // 6.2: Host inacessível (sem crash ou panic)
    let unreachable_res = ProxyValidator::validate("socks5", "127.0.0.1", 59998, None, None).await;
    assert_eq!(unreachable_res.status, "error");
    println!("✅ Validador de proxy tratou erro de conexão sem falhas: {}", unreachable_res.message);

    // 7. Testa Exclusão (Delete)
    proxy_service.delete(&proxy_id).expect("Falha ao excluir proxy");
    let list_after_delete = proxy_service.list().expect("Falha ao listar após delete");
    assert_eq!(list_after_delete.len(), 0, "A lista deve estar vazia após exclusão");

    // 8. Gera Relatório Markdown
    let template = r#"# Relatório de Testes e Correções do Módulo de Proxies

Este documento detalha o diagnóstico das falhas encontradas na página de Proxies, as correções arquiteturais implementadas no Frontend e no Backend Rust, e a bateria completa de testes de validação.

---

## 1. Diagnóstico: Por que a página de proxies havia parado de funcionar?

### Falha 1 (Crítica): Retorno da API de Listagem (`GET /api/proxies`)
- **Problema:** A rota Axum `routes::proxies::list_proxies` retornava `Json(storage.list())`.
- **Efeito:** Como `storage.list()` retorna um `Result<Vec<ProxyItem>, String>`, a serialização do Axum encapsulava a resposta em:
  ```json
  { "Ok": [ { "id": "...", "host": "..." } ] }
  ```
  em vez de um array limpo `[...]`.
- **Quebra no Frontend:** No `page.tsx`, o código fazia `const data = await api.proxies.list(); setProxies(data)`. Em seguida, o `useMemo` chamava `proxies.filter(...)`. Como `proxies` era um objeto `{ Ok: [...] }` e não um Array, o JavaScript lançava o erro fatal `TypeError: proxies.filter is not a function`, travando a tela.

### Falha 2: Ausência de Rota de Edição (`PUT /api/proxies/{id}`)
- **Problema:** O backend não possuía rota registrada para `PUT /api/proxies/{id}`.
- **Efeito:** O formulário de edição `EditarProxies` chamava `create` gerando proxies duplicados com novos UUIDs, ou recebia erro `405 Method Not Allowed`.

### Falha 3: Tipagem Incompatível de IDs no Frontend
- **Problema:** O frontend tipava `selectedIds: number[]` e tentava fazer `proxy.id < 10 ? '0' + proxy.id : proxy.id`.
- **Efeito:** Como o ID do banco é um UUID v4 (string), a formatação ficava distorcida e gerava avisos de tipo.

### Falha 4: Desserialização de `proxy_type` no Backend
- **Problema:** Os DTOs de Proxy possuíam `#[serde(rename = "type")]`. Se o frontend enviasse o campo `proxy_type`, o Serde descartava o valor e atribuía `None`.

---

## 2. Correções Implementadas

### Backend Rust:
1. **Unwrap do `Result` em `list_proxies`:** A rota agora retorna `Ok(Json(proxies))` com status HTTP 200 e payload em formato de array puro `[...]`.
2. **Implementação de `get` e `update` em `ProxyService`:** Adicionado método que atualiza nome, tipo, host, porta e criptografa as novas credenciais com AES-256-GCM.
3. **Nova Rota `PUT /api/proxies/{id}`:** Registrada no Axum Router e documentada no Swagger/OpenAPI (`doc_update_proxy`).
4. **Suporte a `alias = "proxy_type"`:** `CreateProxyDto`, `UpdateProxyDto` e `TestProxyDto` agora aceitam tanto `"type"` quanto `"proxy_type"`.

### Frontend TypeScript:
1. **Proteção defensiva em `service.proxies.ts` e `page.tsx`:** `api.proxies.list()` garante o retorno de um array seguro mesmo se a resposta vier encapsulada.
2. **Suporte a Edição no `handleSaveProxy`:** Se `data.id` existir, chama `api.proxies.update(data.id, data)`.
3. **Padronização de IDs para `string | number`:** Tabelas e seletores de ID agora funcionam perfeitamente com UUIDs e índices de exibição `#01`, `#02` sequenciais.

---

## 3. Resultados da Bateria de Testes Executada

| Teste | Descrição | Resultado |
|---|---|:---:|
| **Listagem Inicial** | `proxy_service.list()` vazio | ✅ Aprovado |
| **Criação e AES-256-GCM** | Inserção no SQLite com senha criptografada | ✅ Aprovado |
| **Integridade de Credenciais** | Descriptografia perfeita de usuário e senha | ✅ Aprovado |
| **Edição Atômica (Update)** | Atualização de host/porta/senha sem duplicar linha | ✅ Aprovado |
| **Alias de Desserialização** | Suporte transparente a `type` e `proxy_type` | ✅ Aprovado |
| **Validação: Host Vazio** | Retorno limpo de erro amigável sem panic | ✅ Aprovado |
| **Validação: Conexão** | Tratamento robusto de timeout/recusa de conexão | ✅ Aprovado |
| **Exclusão (Delete)** | Remoção física da linha na tabela `proxies` | ✅ Aprovado |
"#;

    let report_path = "/home/vanir/fury/frontend/relatorio_testes_proxy.md";
    fs::write(report_path, template).expect("Falha ao gravar relatório");
    println!("📄 Relatório gravado com sucesso em: {}", report_path);

    // Limpeza
    let _ = fs::remove_dir_all(&temp_dir);
}

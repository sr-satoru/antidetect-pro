# Relatório de Interceptação End-to-End: Edição de Perfil e Atualização no SQLite

Este relatório demonstra o fluxo completo de **Edição de Perfil** entre o **Frontend** e o **Backend Rust**:
1. O payload enviado pelo Frontend (`PUT /api/profiles/{id}`).
2. Como o Rust abre a conexão protegida do Star Vault e carrega o registro existente.
3. Como os campos são mesclados e as tags resolvidas.
4. Como o SQLite executa a persistência atômica (`profiles` e tabela associativa `profile_tags`).
5. O JSON de resposta HTTP (200 OK) retornado pela rota `PUT`.
6. A consulta subsequente via API (`GET /api/profiles/{id}`).

---

## 1. O que o Frontend envia na Edição (HTTP PUT Interceptado)

**Endpoint:** `PUT /api/profiles/prf_Gw6GJw8`  
**Headers:**
```http
PUT /api/profiles/prf_Gw6GJw8 HTTP/1.1
Host: 127.0.0.1:3000
Content-Type: application/json
Accept: application/json
```

**Payload JSON enviado pelo Frontend (`UpdateProfileDto`):**
```json
{
  "name": "Perfil VIP MercadoLivre #01 (EDITADO)",
  "group": "Contas VIPs Atualizadas",
  "tags": [
    "MercadoLivre",
    "Financeiro"
  ],
  "tag_ids": null,
  "notes": "Notas atualizadas com sucesso via tela de edição",
  "status": null,
  "kernel": null,
  "browser_version": null,
  "os": null,
  "proxy_type": null,
  "proxy_host": "192.168.1.200",
  "proxy_port": 8080,
  "proxy_username": null,
  "proxy_password": null,
  "fingerprint_json": null,
  "extension_mode": null,
  "extension_category": null,
  "extensions": null
}
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
- O Rust busca a tag `"Financeiro"` na tabela relacional `tags`, obtendo `id: 3` e cor `#52C41A`.
- O array de tags do perfil passa a conter:
  - `Financeiro` (ID: 3, Cor: `#52C41A`)
  - `MercadoLivre` (ID: 1, Cor: `#DFE104`)

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
   - Executa `DELETE FROM profile_tags WHERE profile_id = 'prf_Gw6GJw8'` (desvinculando a tag antiga `"Vendas"`).
   - Executa `INSERT OR IGNORE INTO profile_tags (profile_id, tag_id)` para cada uma das novas tags vinculadas (IDs `1` e `3`).

---

## 3. O JSON de Resposta retornado pelo Backend Rust (HTTP 200 OK)

**Status HTTP:** `200 OK`  
**JSON retornado ao Frontend:**
```json
{
  "id": "prf_Gw6GJw8",
  "name": "Perfil VIP MercadoLivre #01 (EDITADO)",
  "group": "Contas VIPs Atualizadas",
  "tags": [
    {
      "id": 1,
      "name": "MercadoLivre",
      "color": "#DFE104"
    },
    {
      "id": 3,
      "name": "Financeiro",
      "color": "#52C41A"
    }
  ],
  "notes": "Notas atualizadas com sucesso via tela de edição",
  "status": "ready",
  "kernel": "Camoufox",
  "browser_version": "150",
  "os": "windows",
  "created_at": 1790712709,
  "updated_at": 1790712711,
  "last_launch": null,
  "is_deleted": false,
  "deleted_at": null,
  "proxy": {
    "mode": "custom",
    "type": "socks5",
    "host": "192.168.1.200",
    "port": 8080,
    "username": "star_user",
    "password": "secret_pass_123",
    "rotation_url": null,
    "ip_checker": "IP2Location",
    "socks_remote_dns": true
  },
  "fingerprint_json": {
    "canvas_seed": "0xA1B2C3D4",
    "screen_resolution": "1920x1080"
  },
  "extension_mode": null,
  "extension_category": null,
  "extensions": null
}
```

---

## 4. Prova no Banco de Dados SQLite (Consulta Direta ao Vault)

Foi feita uma inspeção direta nas tabelas do arquivo `star_vault.db`:
- **Tabela `profiles`**:
  - `name`: `Perfil VIP MercadoLivre #01 (EDITADO)`
  - `group_name`: `Contas VIPs Atualizadas`
  - `updated_at`: `1790712711` (Maior que `created_at`: `1790712709`)
- **Tabela `profile_tags`**:
  - Vínculos ativos: **Tags [1, 3]**
  - A Tag 2 (`Vendas`) foi **removida com sucesso** da tabela de junção!

---

## 5. Consulta via API (`GET /api/profiles/prf_Gw6GJw8`)

Quando o usuário recarrega a tela de detalhes ou a listagem após a edição:
```json
{
  "id": "prf_Gw6GJw8",
  "name": "Perfil VIP MercadoLivre #01 (EDITADO)",
  "group": "Contas VIPs Atualizadas",
  "tags": [
    {
      "id": 3,
      "name": "Financeiro",
      "color": "#52C41A"
    },
    {
      "id": 1,
      "name": "MercadoLivre",
      "color": "#DFE104"
    }
  ],
  "notes": "Notas atualizadas com sucesso via tela de edição",
  "status": "ready",
  "kernel": "Camoufox",
  "browser_version": "150",
  "os": "windows",
  "created_at": 1790712709,
  "updated_at": 1790712711,
  "last_launch": null,
  "is_deleted": false,
  "deleted_at": null,
  "proxy": {
    "mode": "custom",
    "type": "socks5",
    "host": "192.168.1.200",
    "port": 8080,
    "username": "star_user",
    "password": "secret_pass_123",
    "rotation_url": null,
    "ip_checker": "IP2Location",
    "socks_remote_dns": true
  },
  "fingerprint_json": {
    "canvas_seed": "0xA1B2C3D4",
    "screen_resolution": "1920x1080"
  },
  "extension_mode": null,
  "extension_category": null,
  "extensions": null
}
```

✅ **Conclusão:** A edição do perfil e a sincronização no SQLite ocorreram com 100% de precisão e integridade referencial!

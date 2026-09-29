# 📋 Relatório de Auditoria Arquitetural — Frontend vs. Backend Rust

**Data da Avaliação:** 29 de Setembro de 2026  
**Arquivos Analisados:** 76 arquivos em `app/`  
**Total de Apontamentos:** 20  

## 📊 Resumo Executivo

| Nível de Severidade | Quantidade | Impacto |
| :--- | :---: | :--- |
| 🔴 **CRÍTICO** | 7 | Lógica de backend/banco (fingerprints, localStorage) duplicada no frontend |
| 🟠 **ALTO** | 7 | Serviços sem conexão à API ou UI quebrando o encapsulamento de services |
| 🟡 **MÉDIO** | 6 | Geração de IDs sintéticos no cliente ou React Hooks em local incorreto |

---

## 🎯 Diretriz Arquitetural do Projeto

> [!IMPORTANT]

> **Regra de Ouro:**

> 1. **`app/components/` e `app/(app)/`**: Devem conter **apenas HTML, estilos e renderização de UI**.

> 2. **`app/services/`**: Deve conter **apenas funções de chamada ao backend Rust via HTTP/WebSocket** (sem regras de negócio, sem banco em memória).

> 3. **`app/utils/`**: Deve conter **apenas funções utilitárias puras de formatação de UI** (sem geração de fingerprints, sem validação de rede duplicada).

> 4. **`backend/ (Rust)`**: Responsável exclusivo pela persistência (SQLite/Vault), validação de proxies, geração atômica de IDs e cálculo/proteção de fingerprints.


---

## 🔍 Apontamentos Detalhados por Arquivo

### 📁 `app/(app)/auth/login/page.tsx`

| Linha | Severidade | Regra Violada | O que foi encontrado | Ação Recomendada |
| :---: | :---: | :--- | :--- | :--- |
| 17 | 🟠 ALTO | Bypass da camada de serviços (Import direto de http) | O componente importa diretamente o cliente HTTP em vez de consumir um serviço especializado. | Importe os serviços específicos (ex: `servicePerfis`, `api`) que já abstraem os contratos. |
| 45 | 🔴 CRÍTICO | fetch() direto no componente de UI | Componente executando fetch() diretamente: `const res = await fetch(` | A UI não deve fazer chamadas de rede diretas. Use o serviço correspondente em `app/services/`. |
| 85 | 🔴 CRÍTICO | fetch() direto no componente de UI | Componente executando fetch() diretamente: `const res = await fetch(`${API_BASE_URL}/api/auth/start-login`, {` | A UI não deve fazer chamadas de rede diretas. Use o serviço correspondente em `app/services/`. |


### 📁 `app/(app)/perfis/page.tsx`

| Linha | Severidade | Regra Violada | O que foi encontrado | Ação Recomendada |
| :---: | :---: | :--- | :--- | :--- |
| 14 | 🟠 ALTO | Bypass da camada de serviços (Import direto de http) | O componente importa diretamente o cliente HTTP em vez de consumir um serviço especializado. | Importe os serviços específicos (ex: `servicePerfis`, `api`) que já abstraem os contratos. |


### 📁 `app/components/mcp-api/compact-credentials.tsx`

| Linha | Severidade | Regra Violada | O que foi encontrado | Ação Recomendada |
| :---: | :---: | :--- | :--- | :--- |
| 4 | 🟠 ALTO | Bypass da camada de serviços (Import direto de http) | O componente importa diretamente o cliente HTTP em vez de consumir um serviço especializado. | Importe os serviços específicos (ex: `servicePerfis`, `api`) que já abstraem os contratos. |


### 📁 `app/components/mcp-api/mcp-tab.tsx`

| Linha | Severidade | Regra Violada | O que foi encontrado | Ação Recomendada |
| :---: | :---: | :--- | :--- | :--- |
| 15 | 🟠 ALTO | Bypass da camada de serviços (Import direto de http) | O componente importa diretamente o cliente HTTP em vez de consumir um serviço especializado. | Importe os serviços específicos (ex: `servicePerfis`, `api`) que já abstraem os contratos. |


### 📁 `app/components/mcp-api/theneo-api-tab.tsx`

| Linha | Severidade | Regra Violada | O que foi encontrado | Ação Recomendada |
| :---: | :---: | :--- | :--- | :--- |
| 363 | 🔴 CRÍTICO | fetch() direto no componente de UI | Componente executando fetch() diretamente: `const startRes = await fetch('${baseUrl}/api/v1/profiles/start', {` | A UI não deve fazer chamadas de rede diretas. Use o serviço correspondente em `app/services/`. |
| 403 | 🔴 CRÍTICO | fetch() direto no componente de UI | Componente executando fetch() diretamente: `const res = await fetch(targetUrl, {` | A UI não deve fazer chamadas de rede diretas. Use o serviço correspondente em `app/services/`. |


### 📁 `app/components/ui/header.tsx`

| Linha | Severidade | Regra Violada | O que foi encontrado | Ação Recomendada |
| :---: | :---: | :--- | :--- | :--- |
| 16 | 🟠 ALTO | Bypass da camada de serviços (Import direto de http) | O componente importa diretamente o cliente HTTP em vez de consumir um serviço especializado. | Importe os serviços específicos (ex: `servicePerfis`, `api`) que já abstraem os contratos. |


### 📁 `app/services/criar-perfil/service.impressoes.ts`

| Linha | Severidade | Regra Violada | O que foi encontrado | Ação Recomendada |
| :---: | :---: | :--- | :--- | :--- |
| 234 | 🟡 MÉDIO | Geração de ID no Frontend | Geração de identificador sintético via crypto.randomUUID() ou Date.now() no frontend. | O ID do perfil ou recurso deve ser gerado pelo backend Rust (usando o id_generator.rs atômico em Base62). |


### 📁 `app/services/extensoes/service.categorias.ts`

| Linha | Severidade | Regra Violada | O que foi encontrado | Ação Recomendada |
| :---: | :---: | :--- | :--- | :--- |
| 36 | 🔴 CRÍTICO | Persistência local indevida em Service | Uso direto de localStorage dentro da camada de serviços. | Os serviços devem se comunicar com o backend Rust (SQLite/Vault). O frontend não deve manter banco paralelo em localStorage. |


### 📁 `app/services/index.api.ts`

| Linha | Severidade | Regra Violada | O que foi encontrado | Ação Recomendada |
| :---: | :---: | :--- | :--- | :--- |
| 46 | 🟡 MÉDIO | Rota chamada no Frontend sem correspondente exato no lib.rs | Frontend chama `GET /api/auth/session/${sessionId}`, mas essa rota não foi identificada nos roteadores do Axum. | Verifique se a rota foi declarada em outro módulo ou se é um endpoint legado. |


### 📁 `app/services/notifications/service.notifications.ts`

| Linha | Severidade | Regra Violada | O que foi encontrado | Ação Recomendada |
| :---: | :---: | :--- | :--- | :--- |
| 1 | 🟠 ALTO | Serviço sem chamada à API | O arquivo service.notifications.ts está em services/ mas não realiza chamadas HTTP ou WebSocket para o backend Rust. | Se gerencia estado local da UI, mova para contexts/ ou hooks/. Se precisa de persistência, delegue para uma rota no Rust. |
| 27 | 🔴 CRÍTICO | Persistência local indevida em Service | Uso direto de localStorage dentro da camada de serviços. | Os serviços devem se comunicar com o backend Rust (SQLite/Vault). O frontend não deve manter banco paralelo em localStorage. |
| 38 | 🔴 CRÍTICO | Persistência local indevida em Service | Uso direto de localStorage dentro da camada de serviços. | Os serviços devem se comunicar com o backend Rust (SQLite/Vault). O frontend não deve manter banco paralelo em localStorage. |
| 67 | 🟡 MÉDIO | Geração de ID no Frontend | Geração de identificador sintético via crypto.randomUUID() ou Date.now() no frontend. | O ID do perfil ou recurso deve ser gerado pelo backend Rust (usando o id_generator.rs atômico em Base62). |


### 📁 `app/services/perfis/service.mapper.ts`

| Linha | Severidade | Regra Violada | O que foi encontrado | Ação Recomendada |
| :---: | :---: | :--- | :--- | :--- |
| 1 | 🟠 ALTO | Serviço sem chamada à API | O arquivo service.mapper.ts está em services/ mas não realiza chamadas HTTP ou WebSocket para o backend Rust. | Se gerencia estado local da UI, mova para contexts/ ou hooks/. Se precisa de persistência, delegue para uma rota no Rust. |


### 📁 `app/services/perfis/service.perfis.ts`

| Linha | Severidade | Regra Violada | O que foi encontrado | Ação Recomendada |
| :---: | :---: | :--- | :--- | :--- |
| 84 | 🟡 MÉDIO | Rota chamada no Frontend sem correspondente exato no lib.rs | Frontend chama `POST /api/cloud-sync/pull${force `, mas essa rota não foi identificada nos roteadores do Axum. | Verifique se a rota foi declarada em outro módulo ou se é um endpoint legado. |
| 86 | 🟡 MÉDIO | Rota chamada no Frontend sem correspondente exato no lib.rs | Frontend chama `POST /api/cloud-sync/two-way${force `, mas essa rota não foi identificada nos roteadores do Axum. | Verifique se a rota foi declarada em outro módulo ou se é um endpoint legado. |


### 📁 `app/services/proxies/service.proxies.ts`

| Linha | Severidade | Regra Violada | O que foi encontrado | Ação Recomendada |
| :---: | :---: | :--- | :--- | :--- |
| 121 | 🟡 MÉDIO | Geração de ID no Frontend | Geração de identificador sintético via crypto.randomUUID() ou Date.now() no frontend. | O ID do perfil ou recurso deve ser gerado pelo backend Rust (usando o id_generator.rs atômico em Base62). |


---

## 🗺️ Mapeamento de Rotas no Backend Rust (`lib.rs`)

Foram identificadas **42 rotas oficiais** registradas no servidor Axum local:

| Prefixo | Rota Completa | Handlers Axum |
| :--- | :--- | :--- |
| `/api/profiles` | `/api/profiles` | `get(routes::profiles::list_profiles` |
| `/api/profiles` | `/api/profiles/trash` | `get(routes::profiles::list_trash` |
| `/api/profiles` | `/api/profiles/trash/empty` | `delete(routes::profiles::empty_trash` |
| `/api/profiles` | `/api/profiles/{id}` | `get(routes::profiles::get_profile` |
| `/api/profiles` | `/api/profiles/{id}/launch` | `post(routes::profiles::launch_profile` |
| `/api/profiles` | `/api/profiles/{id}/stop` | `post(routes::profiles::stop_profile` |
| `/api/profiles` | `/api/profiles/{id}/clone` | `post(routes::profiles::clone_profile` |
| `/api/profiles` | `/api/profiles/{id}/restore` | `post(routes::profiles::restore_profile` |
| `/api/profiles` | `/api/profiles/{id}/permanent` | `delete(routes::profiles::delete_permanent` |
| `/api/profiles` | `/api/profiles/{id}/tabs` | `get(routes::tabs::get_profile_tabs` |
| `/api/profiles` | `/api/profiles/{id}/tabs/{tab_id}` | `delete(routes::tabs::close_profile_tab` |
| `/api/profiles` | `/api/profiles/{id}/cookies` | `get(routes::cookies::get_profile_cookies` |
| `/api/proxies` | `/api/proxies` | `get(routes::proxies::list_proxies` |
| `/api/proxies` | `/api/proxies/test` | `post(routes::proxies::test_proxy` |
| `/api/proxies` | `/api/proxies/{id}` | `delete(routes::proxies::delete_proxy` |
| `/api/extensions` | `/api/extensions` | `get(routes::extensions::list_extensions` |
| `/api/extensions` | `/api/extensions/{id}` | `put(routes::extensions::update_extension` |
| `/api/extensions` | `/api/extensions/catalog` | `get(routes::extensions::get_catalog` |
| `/api/extension-categories` | `/api/extension-categories` | `get(routes::extension_categories::list_categories` |
| `/api/extension-categories` | `/api/extension-categories/{id}` | `get(routes::extension_categories::get_category` |
| `/api/auth` | `/api/auth/start-login` | `post(routes::auth::start_login` |
| `/api/auth` | `/api/auth/start-register` | `post(routes::auth::start_register` |
| `/api/auth` | `/api/auth/callback` | `get(routes::auth::callback` |
| `/api/auth` | `/api/auth/session/{session_id}` | `get(routes::auth::get_session_status` |
| `/api/auth` | `/api/auth/me` | `get(routes::auth::me` |
| `/api/auth` | `/api/auth/logout` | `post(routes::auth::logout` |
| `/api/cloud-sync` | `/api/cloud-sync/pull` | `post(routes::cloud_sync::pull_all_cloud_profiles` |
| `/api/cloud-sync` | `/api/cloud-sync/two-way` | `post(routes::cloud_sync::two_way_sync` |
| `/api/cloud-sync` | `/api/cloud-sync/sync-all` | `post(routes::cloud_sync::two_way_sync` |
| `/api/cloud-sync` | `/api/cloud-sync/{id}/sync` | `post(routes::cloud_sync::sync_to_cloud` |
| `/api/cloud-sync` | `/api/cloud-sync/{id}/restore` | `post(routes::cloud_sync::restore_from_cloud` |
| `/api/cloud-sync` | `/api/cloud-sync/{id}/stat` | `get(routes::cloud_sync::get_cloud_stat` |
| `/api/cloud-sync` | `/api/cloud-sync/{id}/cloud-sync` | `post(routes::cloud_sync::sync_to_cloud` |
| `/api/cloud-sync` | `/api/cloud-sync/{id}/cloud-restore` | `post(routes::cloud_sync::restore_from_cloud` |
| `/api/cloud-sync` | `/api/cloud-sync/{id}/cloud-status` | `get(routes::cloud_sync::get_cloud_stat` |
| `/api/cloud-sync` | `/api/cloud-sync/health` | `get(routes::cloud_sync::check_cloud_health` |
| `/api/tags` | `/api/tags` | `get(routes::tags::list_tags` |
| `/api/tags` | `/api/tags/{id}` | `get(routes::tags::get_tag` |
| `/api/tags` | `/api/tags/batch-delete` | `post(routes::tags::batch_delete_tags` |
| `/api/browser` | `/api/browser/status` | `get(routes::browser::get_browser_status` |
| `/api/browser` | `/api/browser/download` | `post(routes::browser::trigger_browser_download` |
| `/api/browser` | `/api/browser/manifest` | `get(routes::browser::get_browser_manifest` |

---

## 🛠️ Plano de Ação Recomendado (Refatoração Limpa)

1. **Remover Geração Sintética de Fingerprints do Frontend** (`app/utils/generators.ts`):

   - Criar endpoint `GET /api/fingerprint/generate?os={os}` no backend Rust.

   - Fazer as abas de Criar Perfil consumirem a semente e os parâmetros reais calculados pelo Rust.


2. **Migrar Validador de Proxy para o Rust** (`app/utils/proxy-utils.ts`):

   - Eliminar os regex de IPv4/IPv6 e parsers do frontend. Chamar a rota `POST /api/proxies/test` ou rota de parsing do Rust.


3. **Desacoplar `service.notifications.ts` e `extension-categories.ts` do `localStorage`**:

   - As categorias de extensão devem ser 100% lidas do SQLite via `/api/extension-categories`.

   - O serviço de notificações do frontend deve ser movido para `app/contexts/notification-context.tsx` ou receber eventos reais do WebSocket (`/api/ws`).


4. **Eliminar `fetch` direto no componente de UI** (`theneo-api-tab.tsx`):

   - Criar uma chamada no service específico em vez de usar `fetch` avulso dentro do JSX.

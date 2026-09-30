# 📊 Relatório de Auditoria: Componentes & UI Órfãos

> **Data da Auditoria:** 29/09/2026 21:22:14  
> **Diretório Analisado:** `app/components/` e `app/types/`  
> **Status:** Verificação Concluída com Sucesso

---

## 🚨 1. Arquivos de Componentes/Modais 100% Órfãos
*Estes arquivos existem no disco, mas NENHUM outro arquivo do projeto os importa ou utiliza.*

| Arquivo Órfão | Linhas de Código | Categoria / Diagnóstico |
|---|:---:|---|
| `components/mcp-api/automation-tab.tsx` | 474 linhas | Aba/View antiga |
| `components/mcp-api/theneo-api-tab.tsx` | 757 linhas | Aba/View antiga |
| `components/mcp-api/token-bar.tsx` | 139 linhas | Aba/View antiga |
| `components/mcp-api/security-tab.tsx` | 138 linhas | Aba/View antiga |
| `components/browser/browser-download-modal.tsx` | 336 linhas | Modal obsoleto |
| `components/ui/confirm-modal.tsx` | 153 linhas | Modal obsoleto |
| `components/proxy/formulario-campos-proxy.tsx` | 573 linhas | Componente não conectado |

**Total de código morto encontrado:** `2570` linhas em `7` arquivos.

---

## 🧩 2. Componentes & Modais Declarados sem Renderização JSX (`<Component />`)
*Estes componentes foram definidos no código, mas nunca são renderizados na interface do usuário.*

| Componente | Arquivo de Origem | Status |
|---|---|---|
| `<AutomationTab />` | `components/mcp-api/automation-tab.tsx` | ❌ Nunca renderizado |
| `<TheneoApiTab />` | `components/mcp-api/theneo-api-tab.tsx` | ❌ Nunca renderizado |
| `<TokenBar />` | `components/mcp-api/token-bar.tsx` | ❌ Nunca renderizado |
| `<SecurityTab />` | `components/mcp-api/security-tab.tsx` | ❌ Nunca renderizado |
| `<BrowserDownloadModal />` | `components/browser/browser-download-modal.tsx` | ❌ Nunca renderizado |
| `<ModalNovaCategoriaExtensao />` | `components/ui/modal-criar-categoria.tsx` | ❌ Nunca renderizado |
| `<ModalCategoriasExtensao />` | `components/ui/modal-gerenciar-categorias.tsx` | ❌ Nunca renderizado |
| `<ConfirmProvider />` | `components/ui/confirm-modal.tsx` | ❌ Nunca renderizado |
| `<FormularioCamposProxy />` | `components/proxy/formulario-campos-proxy.tsx` | ❌ Nunca renderizado |
| `<PLATFORM_PRESETS />` | `components/criar-perfil/plataforma.tsx` | ❌ Nunca renderizado |

---

## 🏷️ 3. Interfaces & Types Exportados sem Uso
*Definições em `app/types/` que não estão sendo consumidas em nenhuma tela ou serviço.*

| Tipo / Interface | Arquivo | Status |
|---|---|---|
| `OsType` | `types/profile.ts` | ⚠️ Sem referências |
| `KernelType` | `types/profile.ts` | ⚠️ Sem referências |
| `ProfileStatus` | `types/profile.ts` | ⚠️ Sem referências |
| `ProxyType` | `types/profile.ts` | ⚠️ Sem referências |
| `ProfileProxyConfig` | `types/profile.ts` | ⚠️ Sem referências |
| `CreateProxyDto` | `types/profile.ts` | ⚠️ Sem referências |
| `UpdateProxyDto` | `types/profile.ts` | ⚠️ Sem referências |
| `CreateTagDto` | `types/profile.ts` | ⚠️ Sem referências |
| `UpdateTagDto` | `types/profile.ts` | ⚠️ Sem referências |
| `BatchDeleteTagsDto` | `types/profile.ts` | ⚠️ Sem referências |

---

## 💡 4. Recomendações e Plano de Limpeza

1. **`components/browser/browser-download-modal.tsx` (337 linhas):**
   - Substituído pelo novo componente `update-center-dropdown.tsx`.
   - **Ação:** Pode ser removido com segurança.

2. **Abas antigas de MCP / API em `components/mcp-api/`:**
   - `automation-tab.tsx` (474 linhas)
   - `theneo-api-tab.tsx` (757 linhas)
   - `security-tab.tsx` (138 linhas)
   - `token-bar.tsx` (38 linhas)
   - A página `(app)/mcp-api/page.tsx` foi refatorada e agora usa apenas `CompactCredentials`, `McpTab` e `ApiTab`.
   - **Ação:** Essas 4 abas antigas somam mais de 1.400 linhas de código morto e podem ser removidas.

3. **Arquivos em `components/proxy/`:**
   - `formulario-campos-proxy.tsx` e `cadastro-proxies.tsx` foram unificados nas novas tabelas.
   - **Ação:** Avaliar remoção ou manter se planeja reutilizar em modal secundário.

---
*Relatório gerado automaticamente pelo script `scripts/audit_orphan_ui.py`.*

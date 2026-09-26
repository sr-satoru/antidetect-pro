# 🛠️ Plano de Ação: Correção Arquitetural e Limpeza do Frontend (`app`)

> **Data de criação:** 26/09/2026  
> **Objetivo:** Guia passo a passo com checklist para remover código órfão, eliminar duplicações, consertar falhas de arquitetura e corrigir bugs latentes no frontend Fury.

---

## 📋 Resumo Executivo das Etapas

| Fase | Descrição | Impacto / Criticidade |
| :--- | :--- | :--- |
| **Fase 1** | Limpeza de diretórios vazios e código morto | 🟢 Risco Baixo / Limpeza de projeto |
| **Fase 2** | Correção do Bug de Proxies e remoção de JSX duplicado | 🔴 Alta Criticidade (Resolve bug de edição de proxy) |
| **Fase 3** | Desacoplamento dos Serviços (`services/`) | 🟡 Média / Organização e Clean Architecture |
| **Fase 4** | Ativação do `types/profile.ts` (Fim do `any`) | 🟡 Média / Tipagem estrita TypeScript |
| **Fase 5** | Padronização de Nomenclatura, Branding e Detalhes | 🟢 Risco Baixo / Polimento e Consistência |

---

## 🚀 Fase 1: Limpeza de Pastas Vazias e Órfãos Imediatos

### 1.1 Remover diretórios vazios sem uso
Execute no terminal dentro de `frontend/app`:
```bash
# Entrar na pasta do frontend
cd /home/vanir/fury/frontend/app

# Remover pastas vazias não utilizadas
rm -rf "(app)/configuration"
rm -rf "services/auth/auth-offline"
rm -rf "services/auth/auth-serve"
```

### 1.2 Remover serviços com 100% de código morto
Estes arquivos foram criados, mas nenhuma de suas funções é consumida pelo sistema:
* `services/criar-perfil/service.plataforma.ts` (contém `validarContas` e `extrairDadosPlataforma` nunca chamados)
* `services/criar-perfil/service.avancado.ts` (contém `extrairConfigAvancada` nunca chamado)

```bash
rm -f services/criar-perfil/service.plataforma.ts
rm -f services/criar-perfil/service.avancado.ts
```

* Em `services/index.api.ts`:
  * Remover os exports de `servicePlataforma` e `serviceAvancado`.
  * Remover `api.plataforma` e `api.avancado` do objeto `api`.

---

## 🐛 Fase 2: Correção de Bugs Latentes e Duplicações Críticas

### 2.1 Corrigir Bug do CRUD de Proxies (Edição Criava Duplicado)
**Arquivos afetados:**
* `services/index.api.ts`
* `(app)/proxy/page.tsx`

**O que fazer:**
1. Em `services/index.api.ts`, adicionar o método `update` em `api.proxies`:
   ```ts
   proxies: {
     list: serviceProxy.listarSalvos,
     test: serviceProxy.testar,
     create: (data: any) => http.post<any>('/api/proxies', data),
     update: (id: string | number, data: any) => http.put<any>(`/api/proxies/${id}`, data),
     delete: (id: string | number) => http.delete<any>(`/api/proxies/${id}`),
   }
   ```
2. Em `(app)/proxy/page.tsx`, ajustar `handleSaveProxy`:
   * Verificar se `editingProxy` ou `data.id` existe.
   * Se for edição, chamar `api.proxies.update(id, data)`.
   * Se for novo, chamar `api.proxies.create(data)`.

---

### 2.2 Eliminar Duplicação de Interface em Criar Perfil
**Arquivos afetados:**
* `(app)/criar-perfil/page.tsx`
* `components/perfis/perfil-tabs-header.tsx`
* `components/perfis/perfil-footer.tsx`

**O que fazer:**
* Na página `(app)/criar-perfil/page.tsx`, substituir:
  * Linhas 167-185 (HTML das abas) por `<PerfilTabsHeader activeTab={activeTab} onTabChange={setActiveTab} />`.
  * Linhas 214-250 (HTML do rodapé com OK/Cancelar) por `<PerfilFooter isSaving={isSaving} onSave={handleSave} onCancel={() => navigate('/perfis')} />`.
* *Resultado:* Economia de mais de 80 linhas duplicadas e paridade visual perfeita entre Criação e Edição.

---

### 2.3 Unificar Ícones de Redes Sociais em um Componente Reutilizável
**Arquivos afetados:**
* Criar: `components/ui/platform-icon.tsx`
* Refatorar: `components/criar-perfil/plataforma.tsx` e `components/perfis/linhatabela.tsx`

**O que fazer:**
1. Criar `components/ui/platform-icon.tsx` (semelhante ao `os-icon.tsx`):
   ```tsx
   export const PlatformIcon: React.FC<{ platform: string; size?: number; className?: string }> = ...
   ```
2. Substituir `renderPlatformIcon` de `plataforma.tsx` e `renderPlatformBadge` de `linhatabela.tsx` por esse novo componente centralizado.

---

## 🏗️ Fase 3: Desacoplamento dos Serviços (Clean Architecture / SRP)

### 3.1 Criar Módulo Dedicado de Proxies
Atualmente, as funções de listagem e teste de proxies para toda a aplicação estão misturadas dentro de `services/criar-perfil/service.proxy.ts`.

**O que fazer:**
1. Criar `services/proxies/service.proxies.ts`:
   * Centralizar `list()`, `get(id)`, `create(data)`, `update(id, data)`, `delete(id)`, `test(data)`.
2. Em `services/criar-perfil/service.proxy.ts`:
   * Manter apenas funções estritamente pertinentes ao formulário de criação de perfil, ou reexportar a partir de `services/proxies/`.
3. Em `services/index.api.ts`:
   * Apontar `api.proxies` para `serviceProxies`.

---

### 3.2 Mover a Montagem Completa do Perfil para o Domínio Correto
* A função `montarPayloadPerfil()` monta o perfil inteiro (ID UUID v4, timestamps LWW, grupo, tags, proxy e fingerprint).
* Ela está atualmente escondida em `services/criar-perfil/service.impressoes.ts`.
* **Ajuste:** Mover `montarPayloadPerfil` para `services/perfis/service.mapper.ts` ou criar `services/perfis/service.assembler.ts`, mantendo `service.impressoes.ts` focado unicamente na extração técnica de WebGL/Canvas/Seeds/Áudio.

---

### 3.3 Mover Hooks que estão em `utils/` para a Camada Correta
* `utils/extensions.ts` contém o hook `useRegisteredExtensions`.
* `utils/extension-categories.ts` contém o hook `useExtensionCategories` e chamadas à API.
* **Ajuste:** Criar pasta `hooks/` ou mover para `services/extensoes/` para respeitar o princípio de que `utils/` contém apenas funções auxiliares puras.

---

## 🔒 Fase 4: Integração de Tipos e Extinção do `any`

### 4.1 Ativar o `types/profile.ts`
O arquivo `types/profile.ts` já está pronto com todas as definições canônicas de um perfil.
* Em `services/perfis/service.perfis.ts`:
  * Alterar `list: () => http.get<ProfileData[]>('/api/profiles')`.
  * Alterar `get: (id: string | number) => http.get<ProfileData>(`/api/profiles/${id}`)`.
* Em `(app)/perfis/page.tsx`:
  * Substituir `const [profiles, setProfiles] = useState<any[]>([])` por `useState<ProfileData[]>([])`.
* Em `components/perfis/tabela.tsx` e `components/perfis/linhatabela.tsx`:
  * Substituir `profile: any` por `profile: ProfileData`.

---

## 🎨 Fase 5: Padronização, Branding e Polimento

### 5.1 Padronizar Nomenclatura de Arquivos em `components/perfis/`
Renomear para `kebab-case` padrão:
* `headerTabela.tsx` ➔ `header-tabela.tsx`
* `linhatabela.tsx` ➔ `linha-tabela.tsx`

### 5.2 Ajustes Rápidos no `services/http.ts` e `sidebar.tsx`
1. Em `services/http.ts` (linha 71):
   * Trocar a mensagem `"Certifique-se de que o backend Python está rodando"` por `"Certifique-se de que o backend Rust está rodando"`.
2. Em `components/ui/sidebar.tsx` (linha 61):
   * Trocar `"Syncro"` por `"Fury Antidetect"` (ou "Fury"), alinhando com a tela de Login e com o resto do sistema.
3. Tratar links do menu sem rota:
   * Colocar indicador visual `"Em breve"` ou badge nos links que ainda não têm tela implementada (`/grupos`, `/ai-agent`, `/sincronizador`, `/api-mcp`, `/membros`, `/logs`), evitando a sensação de clique morto ou redirecionamento involuntário.

---

## ✅ Checklist de Validação Final

Após executar as correções, valide a estabilidade do sistema executando:
```bash
cd /home/vanir/fury/frontend/app

# 1. Checagem estrita de tipos
npx tsc --noEmit

# 2. Build de produção para garantir que não há imports quebrados
npm run build
```
Ambos os comandos devem finalizar com **código 0 (sucesso)**.

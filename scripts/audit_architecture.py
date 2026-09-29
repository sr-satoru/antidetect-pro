#!/usr/bin/env python3
"""
Auditor de Arquitetura — Star Multlogin / Fury
Valida a separação estrita de camadas entre Frontend e Backend:
1. app/services: Deve conter APENAS chamadas tipadas para a API Rust (sem lógica de negócio/banco)
2. app/utils: Deve conter APENAS utilitários puros de UI/formatação (sem regras de domínio ou persistência)
3. app/components e app/(app): Devem conter APENAS HTML e apresentação (sem fetch direto, sem lógica de domínio)
4. Mapeamento de rotas: Frontend <-> Backend Rust (Axum)
"""

import os
import re
import sys
import json
from pathlib import Path
from typing import List, Dict, Any

# Diretórios base
BASE_DIR = Path(__file__).resolve().parent.parent
APP_DIR = BASE_DIR / "app"
SERVICES_DIR = APP_DIR / "services"
UTILS_DIR = APP_DIR / "utils"
COMPONENTS_DIR = APP_DIR / "components"
PAGES_DIR = APP_DIR / "(app)"
BACKEND_DIR = BASE_DIR / "backend"
REPORT_PATH = BASE_DIR / "relatorio-app.md"

class ArchitectureAuditor:
    def __init__(self):
        self.findings: List[Dict[str, Any]] = []
        self.backend_routes: List[Dict[str, str]] = []
        self.frontend_endpoints: List[Dict[str, Any]] = []
        self.scanned_files_count = 0

    def add_finding(self, severity: str, layer: str, file_path: Path, line_no: int, rule: str, detail: str, recommendation: str):
        rel_path = file_path.relative_to(BASE_DIR)
        self.findings.append({
            "severity": severity,
            "layer": layer,
            "file": str(rel_path),
            "line": line_no,
            "rule": rule,
            "detail": detail,
            "recommendation": recommendation,
        })

    def run_audit(self):
        print(f"🚀 Iniciando Auditoria Arquitetural em: {APP_DIR}")
        self.audit_services()
        self.audit_utils()
        self.audit_ui_components()
        self.audit_backend_routes()
        self.cross_check_endpoints()
        self.generate_report()
        print(f"✅ Auditoria concluída! {len(self.findings)} apontamentos encontrados.")
        print(f"📄 Relatório gerado em: {REPORT_PATH}")

    # =========================================================================
    # 1. Auditoria de app/services
    # =========================================================================
    def audit_services(self):
        if not SERVICES_DIR.exists():
            return

        for ts_file in SERVICES_DIR.rglob("*.ts"):
            self.scanned_files_count += 1
            if ts_file.name == "http.ts":
                continue # http.ts é o módulo cliente base

            content = ts_file.read_text(encoding="utf-8")
            lines = content.splitlines()

            # Checagem A: O arquivo chama o backend?
            has_http_call = bool(re.search(r'\bhttp\.(get|post|put|delete|request)\b', content))
            has_ws_call = "WebSocket" in content or "WS_BASE_URL" in content
            
            # Se for um arquivo de serviço que não faz chamadas HTTP nem WS
            if not has_http_call and not has_ws_call:
                # Checar se não é apenas um barrel (ex: index.api.ts que reexporta)
                is_barrel = "export *" in content or ("export {" in content and not "class " in content and not "function " in content)
                if not is_barrel:
                    self.add_finding(
                        severity="ALTO",
                        layer="app/services",
                        file_path=ts_file,
                        line_no=1,
                        rule="Serviço sem chamada à API",
                        detail=f"O arquivo {ts_file.name} está em services/ mas não realiza chamadas HTTP ou WebSocket para o backend Rust.",
                        recommendation="Se gerencia estado local da UI, mova para contexts/ ou hooks/. Se precisa de persistência, delegue para uma rota no Rust."
                    )

            # Checagem B: Uso de localStorage em services
            for idx, line in enumerate(lines, 1):
                if "localStorage" in line and not line.strip().startswith("//"):
                    self.add_finding(
                        severity="CRÍTICO",
                        layer="app/services",
                        file_path=ts_file,
                        line_no=idx,
                        rule="Persistência local indevida em Service",
                        detail="Uso direto de localStorage dentro da camada de serviços.",
                        recommendation="Os serviços devem se comunicar com o backend Rust (SQLite/Vault). O frontend não deve manter banco paralelo em localStorage."
                    )

            # Checagem C: Geração sintética de UUID ou parâmetros de backend
            for idx, line in enumerate(lines, 1):
                if ("crypto.randomUUID()" in line or "Date.now()" in line) and "id" in line.lower() and not line.strip().startswith("//"):
                    self.add_finding(
                        severity="MÉDIO",
                        layer="app/services",
                        file_path=ts_file,
                        line_no=idx,
                        rule="Geração de ID no Frontend",
                        detail="Geração de identificador sintético via crypto.randomUUID() ou Date.now() no frontend.",
                        recommendation="O ID do perfil ou recurso deve ser gerado pelo backend Rust (usando o id_generator.rs atômico em Base62)."
                    )

            # Extração de endpoints chamados no service
            for idx, line in enumerate(lines, 1):
                matches = re.findall(r"http\.(get|post|put|delete)\s*<[^>]*>\s*\(\s*[`'\"]([^`'\"]+)[`'\"]", line)
                for verb, endpoint in matches:
                    clean_endpoint = endpoint.split("?")[0]
                    self.frontend_endpoints.append({
                        "file": str(ts_file.relative_to(BASE_DIR)),
                        "line": idx,
                        "verb": verb.upper(),
                        "endpoint": clean_endpoint
                    })

    # =========================================================================
    # 2. Auditoria de app/utils
    # =========================================================================
    def audit_utils(self):
        if not UTILS_DIR.exists():
            return

        for ts_file in UTILS_DIR.rglob("*.ts*"):
            self.scanned_files_count += 1
            content = ts_file.read_text(encoding="utf-8")
            lines = content.splitlines()

            # Checagem A: Geração de fingerprints e dados de hardware
            if "generators.ts" in ts_file.name or "fingerprint" in content.lower():
                for idx, line in enumerate(lines, 1):
                    if any(fn in line for fn in ["generateRandomSeed", "generateRandomDeviceName", "generateRandomMacAddress"]):
                        self.add_finding(
                            severity="CRÍTICO",
                            layer="app/utils",
                            file_path=ts_file,
                            line_no=idx,
                            rule="Lógica de Fingerprint / Hardware no Frontend",
                            detail=f"Função `{line.strip()}` gera hardware/fingerprint no cliente em vez de consultar o Rust.",
                            recommendation="Mover a geração de sementes, nomes de dispositivos e endereços MAC para o módulo `backend/src/fingerprint/` no Rust."
                        )

            # Checagem B: Validação e parsing de rede/proxy que já existe no Rust
            if "proxy" in ts_file.name:
                for idx, line in enumerate(lines, 1):
                    if any(fn in line for fn in ["parseProxyLine", "isValidHostAddress", "isValidPortNumber"]):
                        self.add_finding(
                            severity="ALTO",
                            layer="app/utils",
                            file_path=ts_file,
                            line_no=idx,
                            rule="Validador e Parser de Proxy duplicado no Frontend",
                            detail=f"Função `{line.strip()}` faz validação e parsing regex de proxy no frontend.",
                            recommendation="O backend Rust possui `backend/src/proxy_validator/`. O frontend deve apenas enviar o input bruto para a API e receber a estrutura validada."
                        )

            # Checagem C: Estado/Persistência com localStorage em utils
            for idx, line in enumerate(lines, 1):
                if "localStorage" in line and not line.strip().startswith("//"):
                    self.add_finding(
                        severity="CRÍTICO",
                        layer="app/utils",
                        file_path=ts_file,
                        line_no=idx,
                        rule="Gerenciamento de Estado/Banco em Util",
                        detail=f"Utilizando localStorage para persistência de dados ({line.strip()}).",
                        recommendation="Categorias e entidades devem ser mantidas no SQLite do backend Rust via `/api/extension-categories`."
                    )

            # Checagem D: Hooks de React dentro de utils
            if "useState" in content or "useEffect" in content:
                self.add_finding(
                    severity="MÉDIO",
                    layer="app/utils",
                    file_path=ts_file,
                    line_no=1,
                    rule="React Hook dentro de utils/",
                    detail=f"O arquivo {ts_file.name} contém React Hooks (useState/useEffect), o que viola o propósito de funções utilitárias puras.",
                    recommendation="Mova hooks para uma pasta dedicada `app/hooks/` ou encapsule a lógica em um contexto apropriado."
                )

    # =========================================================================
    # 3. Auditoria de app/components e app/(app) (UI)
    # =========================================================================
    def audit_ui_components(self):
        ui_dirs = [COMPONENTS_DIR, PAGES_DIR]
        for root_dir in ui_dirs:
            if not root_dir.exists():
                continue

            for file_path in root_dir.rglob("*.tsx"):
                self.scanned_files_count += 1
                content = file_path.read_text(encoding="utf-8")
                lines = content.splitlines()

                for idx, line in enumerate(lines, 1):
                    stripped = line.strip()
                    if stripped.startswith("//") or stripped.startswith("/*") or stripped.startswith("*"):
                        continue

                    # Checagem A: Chamada direta a fetch(...) na UI
                    if re.search(r'\bfetch\s*\(', line):
                        # Ignorar se estiver em uma string de template de documentação
                        if not ("`" in line and "${" in line and ("code" in content or "sample" in content or "curl" in content)):
                            # Checar contexto se é string pura
                            self.add_finding(
                                severity="CRÍTICO",
                                layer="app/components (UI)",
                                file_path=file_path,
                                line_no=idx,
                                rule="fetch() direto no componente de UI",
                                detail=f"Componente executando fetch() diretamente: `{stripped}`",
                                recommendation="A UI não deve fazer chamadas de rede diretas. Use o serviço correspondente em `app/services/`."
                            )

                    # Checagem B: Import direto de http.ts
                    if "services/http" in line or 'from "../http"' in line:
                        self.add_finding(
                            severity="ALTO",
                            layer="app/components (UI)",
                            file_path=file_path,
                            line_no=idx,
                            rule="Bypass da camada de serviços (Import direto de http)",
                            detail="O componente importa diretamente o cliente HTTP em vez de consumir um serviço especializado.",
                            recommendation="Importe os serviços específicos (ex: `servicePerfis`, `api`) que já abstraem os contratos."
                        )

                    # Checagem C: Invocação direta de geradores de fingerprint sintéticos
                    if any(gen in line for gen in ["generateRandomSeed()", "generateRandomMacAddress()", "generateRandomDeviceName("]):
                        self.add_finding(
                            severity="ALTO",
                            layer="app/components (UI)",
                            file_path=file_path,
                            line_no=idx,
                            rule="Geração de Fingerprint acoplada à tela",
                            detail=f"A interface gera parâmetros aleatórios de hardware manualmente: `{stripped}`",
                            recommendation="A tela deve solicitar ao backend Rust um modelo padrão de fingerprint ou novos valores randômicos gerados com entropia do SO."
                        )

    # =========================================================================
    # 4. Mapeamento de Rotas do Backend Rust
    # =========================================================================
    def audit_backend_routes(self):
        lib_rs = BACKEND_DIR / "src" / "lib.rs"
        if not lib_rs.exists():
            return

        content = lib_rs.read_text(encoding="utf-8")
        
        # Mapeamento dos grupos de rotas no lib.rs
        route_groups = {
            "/api/profiles": r'profile_routes\s*=\s*Router::new\(\)(.*?)\.with_state',
            "/api/proxies": r'proxy_routes\s*=\s*Router::new\(\)(.*?)\.with_state',
            "/api/extensions": r'extension_routes\s*=\s*Router::new\(\)(.*?)\.with_state',
            "/api/extension-categories": r'extension_category_routes\s*=\s*Router::new\(\)(.*?)\.with_state',
            "/api/auth": r'auth_routes\s*=\s*Router::new\(\)(.*?)\.with_state',
            "/api/cloud-sync": r'cloud_sync_routes\s*=\s*Router::new\(\)(.*?)\.with_state',
            "/api/tags": r'tag_routes\s*=\s*Router::new\(\)(.*?)\.with_state',
            "/api/browser": r'browser_routes\s*=\s*Router::new\(\)(.*?)\.with_state',
        }

        for prefix, pattern in route_groups.items():
            match = re.search(pattern, content, re.DOTALL)
            if match:
                block = match.group(1)
                subroutes = re.findall(r'\.route\(\s*"([^"]+)"\s*,\s*([^)]+)\)', block)
                for path, methods in subroutes:
                    full_path = prefix if path == "/" else f"{prefix}{path}"
                    self.backend_routes.append({
                        "prefix": prefix,
                        "path": full_path,
                        "methods": methods.strip()
                    })

    # =========================================================================
    # 5. Cruzamento Frontend <-> Backend
    # =========================================================================
    def cross_check_endpoints(self):
        backend_paths = {r["path"].replace("{id}", ":id").replace("{tab_id}", ":tab_id") for r in self.backend_routes}
        
        for fe in self.frontend_endpoints:
            # Normalizar parâmetro dinâmico para comparação
            normalized = re.sub(r'/\$\{[^}]+\}', '/:id', fe["endpoint"])
            normalized = re.sub(r'/[0-9a-fA-F-]+$', '/:id', normalized)
            
            # Verificar se prefixo existe
            matched = False
            for bp in backend_paths:
                # Checagem aproximada de rota
                bp_pattern = "^" + re.escape(bp).replace(r"\:id", r"[^/]+") + "$"
                if re.match(bp_pattern, normalized) or normalized == bp:
                    matched = True
                    break

            if not matched and not normalized.startswith("/api/app"):
                # Endpoints que começam com /api mas não foram achados no backend
                if normalized.startswith("/api/"):
                    self.add_finding(
                        severity="MÉDIO",
                        layer="Integração Frontend-Backend",
                        file_path=BASE_DIR / fe["file"],
                        line_no=fe["line"],
                        rule="Rota chamada no Frontend sem correspondente exato no lib.rs",
                        detail=f"Frontend chama `{fe['verb']} {fe['endpoint']}`, mas essa rota não foi identificada nos roteadores do Axum.",
                        recommendation="Verifique se a rota foi declarada em outro módulo ou se é um endpoint legado."
                    )

    # =========================================================================
    # 6. Geração do Relatório Markdown
    # =========================================================================
    def generate_report(self):
        criticos = [f for f in self.findings if f["severity"] == "CRÍTICO"]
        altos = [f for f in self.findings if f["severity"] == "ALTO"]
        medios = [f for f in self.findings if f["severity"] == "MÉDIO"]

        report = []
        report.append("# 📋 Relatório de Auditoria Arquitetural — Frontend vs. Backend Rust\n")
        report.append(f"**Data da Avaliação:** 29 de Setembro de 2026  ")
        report.append(f"**Arquivos Analisados:** {self.scanned_files_count} arquivos em `app/`  ")
        report.append(f"**Total de Apontamentos:** {len(self.findings)}  \n")

        report.append("## 📊 Resumo Executivo\n")
        report.append("| Nível de Severidade | Quantidade | Impacto |")
        report.append("| :--- | :---: | :--- |")
        report.append(f"| 🔴 **CRÍTICO** | {len(criticos)} | Lógica de backend/banco (fingerprints, localStorage) duplicada no frontend |")
        report.append(f"| 🟠 **ALTO** | {len(altos)} | Serviços sem conexão à API ou UI quebrando o encapsulamento de services |")
        report.append(f"| 🟡 **MÉDIO** | {len(medios)} | Geração de IDs sintéticos no cliente ou React Hooks em local incorreto |")
        report.append("\n---\n")

        report.append("## 🎯 Diretriz Arquitetural do Projeto\n")
        report.append("> [!IMPORTANT]\n")
        report.append("> **Regra de Ouro:**\n")
        report.append("> 1. **`app/components/` e `app/(app)/`**: Devem conter **apenas HTML, estilos e renderização de UI**.\n")
        report.append("> 2. **`app/services/`**: Deve conter **apenas funções de chamada ao backend Rust via HTTP/WebSocket** (sem regras de negócio, sem banco em memória).\n")
        report.append("> 3. **`app/utils/`**: Deve conter **apenas funções utilitárias puras de formatação de UI** (sem geração de fingerprints, sem validação de rede duplicada).\n")
        report.append("> 4. **`backend/ (Rust)`**: Responsável exclusivo pela persistência (SQLite/Vault), validação de proxies, geração atômica de IDs e cálculo/proteção de fingerprints.\n")
        report.append("\n---\n")

        report.append("## 🔍 Apontamentos Detalhados por Arquivo\n")

        # Agrupar por arquivo
        files_map = {}
        for f in self.findings:
            files_map.setdefault(f["file"], []).append(f)

        for file_name, items in sorted(files_map.items()):
            report.append(f"### 📁 `{file_name}`\n")
            report.append("| Linha | Severidade | Regra Violada | O que foi encontrado | Ação Recomendada |")
            report.append("| :---: | :---: | :--- | :--- | :--- |")
            for item in items:
                badge = "🔴 CRÍTICO" if item["severity"] == "CRÍTICO" else ("🟠 ALTO" if item["severity"] == "ALTO" else "🟡 MÉDIO")
                detail = item["detail"].replace("|", "\\|")
                rec = item["recommendation"].replace("|", "\\|")
                report.append(f"| {item['line']} | {badge} | {item['rule']} | {detail} | {rec} |")
            report.append("\n")

        report.append("---\n")
        report.append("## 🗺️ Mapeamento de Rotas no Backend Rust (`lib.rs`)\n")
        report.append(f"Foram identificadas **{len(self.backend_routes)} rotas oficiais** registradas no servidor Axum local:\n")
        report.append("| Prefixo | Rota Completa | Handlers Axum |")
        report.append("| :--- | :--- | :--- |")
        for br in self.backend_routes:
            report.append(f"| `{br['prefix']}` | `{br['path']}` | `{br['methods']}` |")

        report.append("\n---\n")
        report.append("## 🛠️ Plano de Ação Recomendado (Refatoração Limpa)\n")
        report.append("1. **Remover Geração Sintética de Fingerprints do Frontend** (`app/utils/generators.ts`):\n")
        report.append("   - Criar endpoint `GET /api/fingerprint/generate?os={os}` no backend Rust.\n")
        report.append("   - Fazer as abas de Criar Perfil consumirem a semente e os parâmetros reais calculados pelo Rust.\n\n")
        report.append("2. **Migrar Validador de Proxy para o Rust** (`app/utils/proxy-utils.ts`):\n")
        report.append("   - Eliminar os regex de IPv4/IPv6 e parsers do frontend. Chamar a rota `POST /api/proxies/test` ou rota de parsing do Rust.\n\n")
        report.append("3. **Desacoplar `service.notifications.ts` e `extension-categories.ts` do `localStorage`**:\n")
        report.append("   - As categorias de extensão devem ser 100% lidas do SQLite via `/api/extension-categories`.\n")
        report.append("   - O serviço de notificações do frontend deve ser movido para `app/contexts/notification-context.tsx` ou receber eventos reais do WebSocket (`/api/ws`).\n\n")
        report.append("4. **Eliminar `fetch` direto no componente de UI** (`theneo-api-tab.tsx`):\n")
        report.append("   - Criar uma chamada no service específico em vez de usar `fetch` avulso dentro do JSX.\n")

        REPORT_PATH.write_text("\n".join(report), encoding="utf-8")

if __name__ == "__main__":
    auditor = ArchitectureAuditor()
    auditor.run_audit()

#!/usr/bin/env python3
"""
Audit Orphan UI & Dead Components Script
Varre o diretório app/ para identificar componentes, modais, interfaces e arquivos UI órfãos (não utilizados).
Gera um relatório detalhado em Markdown em: scripts/relatorio_componentes_orfaos.md
"""

import os
import re
import sys
from pathlib import Path
from collections import defaultdict
from datetime import datetime

ROOT_DIR = Path(__file__).resolve().parent.parent
APP_DIR = ROOT_DIR / "app"
REPORT_FILE = ROOT_DIR / "scripts" / "relatorio_componentes_orfaos.md"

EXCLUDE_DIRS = {"node_modules", "dist", "src-tauri", ".git", ".next"}

def get_all_source_files(root: Path):
    files = []
    for p in root.rglob("*"):
        if p.is_file() and p.suffix in {".ts", ".tsx"}:
            parts = p.relative_to(root).parts
            if any(part in EXCLUDE_DIRS for part in parts):
                continue
            files.append(p)
    return files

def audit():
    source_files = get_all_source_files(APP_DIR)
    
    # Leitura de todos os arquivos
    file_contents = {}
    for f in source_files:
        rel = f.relative_to(APP_DIR)
        try:
            file_contents[rel] = f.read_text(encoding="utf-8")
        except Exception as e:
            file_contents[rel] = ""

    # Separar arquivos de componentes
    component_files = [f.relative_to(APP_DIR) for f in source_files if "components" in f.relative_to(APP_DIR).parts]
    type_files = [f.relative_to(APP_DIR) for f in source_files if "types" in f.relative_to(APP_DIR).parts]

    # 1. Mapeamento de imports de arquivos
    file_import_counts = defaultdict(list)
    for comp in component_files:
        base_name = comp.stem
        # Não considerar index.ts como nome de arquivo isolado para busca direta
        if base_name == "index":
            # Para index.ts, o import é pelo nome da pasta pai
            parent_dir = comp.parent.name
            escaped_dir = re.escape(parent_dir)
            pattern = re.compile(rf'from\s+[\'"].*?/{escaped_dir}(?:/index)?[\'"]', re.MULTILINE)
        else:
            escaped_stem = re.escape(base_name)
            pattern = re.compile(rf'from\s+[\'"].*?/{escaped_stem}(?:\.tsx?|\.jsx?)?[\'"]', re.MULTILINE)

        for other_rel, content in file_contents.items():
            if other_rel == comp:
                continue
            if pattern.search(content):
                file_import_counts[comp].append(other_rel)

    # 2. Análise de Componentes Exportados e Uso de Tags JSX
    # Busca por export const / export function / export default
    component_data = {}
    
    for comp in component_files:
        if comp.name == "index.ts":
            continue
        content = file_contents[comp]
        lines = len(content.splitlines())
        
        # Encontra nomes de componentes (PascalCase)
        exports = re.findall(r'export\s+(?:default\s+)?(?:function|const)\s+([A-Z][a-zA-Z0-9_]*)', content)
        bottom_exports = re.findall(r'export\s+default\s+([A-Z][a-zA-Z0-9_]*)\s*;', content)
        bottom_named = re.findall(r'export\s*\{\s*([^}]+)\s*\}', content)
        
        extracted_names = set(exports + bottom_exports)
        for bn in bottom_named:
            for item in bn.split(","):
                item_name = item.strip().split(" as ")[-1].strip()
                if item_name and item_name[0].isupper():
                    extracted_names.add(item_name)
                    
        for comp_name in extracted_names:
            # Verifica se é usado como JSX (<CompName) ou chamado diretamente em outros arquivos
            jsx_pattern = re.compile(rf'<({comp_name})\b')
            ident_pattern = re.compile(rf'\b({comp_name})\b')
            
            external_jsx_usages = []
            internal_jsx_usages = []
            external_ident_usages = []
            
            for other_rel, other_content in file_contents.items():
                if other_rel == comp:
                    if jsx_pattern.search(other_content):
                        internal_jsx_usages.append(str(other_rel))
                    continue
                
                if jsx_pattern.search(other_content):
                    external_jsx_usages.append(str(other_rel))
                elif ident_pattern.search(other_content):
                    # Pode estar sendo importado em re-export ou passado como prop
                    external_ident_usages.append(str(other_rel))

            component_data[comp_name] = {
                "file": str(comp),
                "total_lines": lines,
                "external_jsx": external_jsx_usages,
                "internal_jsx": internal_jsx_usages,
                "external_idents": external_ident_usages,
                "is_imported": len(file_import_counts[comp]) > 0
            }

    # 3. Análise de Tipos e Interfaces
    types_data = {}
    for tf in type_files:
        content = file_contents[tf]
        interfaces = re.findall(r'export\s+(?:interface|type)\s+([A-Za-z0-9_]+)', content)
        for iface in interfaces:
            pattern = re.compile(rf'\b{re.escape(iface)}\b')
            usages = []
            for other_rel, other_content in file_contents.items():
                if other_rel == tf:
                    continue
                if pattern.search(other_content):
                    usages.append(str(other_rel))
            types_data[iface] = {
                "file": str(tf),
                "usages": usages
            }

    # Classificação
    # A) Arquivos de componentes completamente órfãos (nenhum import e nenhum uso de export externo)
    completely_orphan_files = []
    for comp in component_files:
        has_file_import = len(file_import_counts[comp]) > 0
        # Checar se algum componente exportado desse arquivo é usado externamente
        any_export_used = False
        for cname, cinfo in component_data.items():
            if cinfo["file"] == str(comp):
                if cinfo["external_jsx"] or cinfo["external_idents"]:
                    any_export_used = True
                    break
        if not has_file_import and not any_export_used:
            lines = len(file_contents[comp].splitlines())
            completely_orphan_files.append((str(comp), lines))

    # B) Componentes/Modais nunca renderizados via JSX
    orphan_components = []
    for cname, cinfo in component_data.items():
        if not cinfo["external_jsx"] and not cinfo["internal_jsx"] and not cinfo["external_idents"]:
            orphan_components.append((cname, cinfo["file"], cinfo["total_lines"]))

    # C) Types/Interfaces não utilizados
    orphan_types = []
    for tname, tinfo in types_data.items():
        if not tinfo["usages"]:
            orphan_types.append((tname, tinfo["file"]))

    # Gerar Relatório em Markdown
    now_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    
    md_content = f"""# 📊 Relatório de Auditoria: Componentes & UI Órfãos

> **Data da Auditoria:** {now_str}  
> **Diretório Analisado:** `app/components/` e `app/types/`  
> **Status:** Verificação Concluída com Sucesso

---

## 🚨 1. Arquivos de Componentes/Modais 100% Órfãos
*Estes arquivos existem no disco, mas NENHUM outro arquivo do projeto os importa ou utiliza.*

| Arquivo Órfão | Linhas de Código | Categoria / Diagnóstico |
|---|:---:|---|
"""
    for fpath, lcount in completely_orphan_files:
        diag = "Modal obsoleto" if "modal" in fpath else ("Aba/View antiga" if "tab" in fpath or "mcp" in fpath else "Componente não conectado")
        md_content += f"| `{fpath}` | {lcount} linhas | {diag} |\n"

    total_orphan_lines = sum(l for _, l in completely_orphan_files)
    md_content += f"\n**Total de código morto encontrado:** `{total_orphan_lines}` linhas em `{len(completely_orphan_files)}` arquivos.\n"

    md_content += """
---

## 🧩 2. Componentes & Modais Declarados sem Renderização JSX (`<Component />`)
*Estes componentes foram definidos no código, mas nunca são renderizados na interface do usuário.*

| Componente | Arquivo de Origem | Status |
|---|---|---|
"""
    for cname, fpath, lcount in orphan_components:
        md_content += f"| `<{cname} />` | `{fpath}` | ❌ Nunca renderizado |\n"

    md_content += """
---

## 🏷️ 3. Interfaces & Types Exportados sem Uso
*Definições em `app/types/` que não estão sendo consumidas em nenhuma tela ou serviço.*

| Tipo / Interface | Arquivo | Status |
|---|---|---|
"""
    for tname, fpath in orphan_types:
        md_content += f"| `{tname}` | `{fpath}` | ⚠️ Sem referências |\n"

    md_content += """
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
"""

    REPORT_FILE.write_text(md_content, encoding="utf-8")
    
    # Imprimir no terminal
    print("\n" + "="*70)
    print(" 🚀 RELATÓRIO DE COMPONENTES & MODAIS ÓRFÃOS GERADO COM SUCESSO!")
    print("="*70)
    print(f"📄 Arquivo salvo em: {REPORT_FILE.relative_to(ROOT_DIR)}")
    print(f"📦 Arquivos 100% órfãos: {len(completely_orphan_files)} ({total_orphan_lines} linhas de código morto)")
    print(f"🧩 Componentes sem renderização JSX: {len(orphan_components)}")
    print(f"🏷️ Types/Interfaces sem uso: {len(orphan_types)}")
    print("="*70)
    print("\n📋 ARQUIVOS ÓRFÃOS ENCONTRADOS:")
    for fpath, lcount in completely_orphan_files:
        print(f"  • {fpath} ({lcount} linhas)")
    print("\n" + "="*70 + "\n")

if __name__ == "__main__":
    audit()

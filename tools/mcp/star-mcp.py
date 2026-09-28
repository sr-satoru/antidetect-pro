#!/usr/bin/env python3
# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright 2026 Star Multlogin & Star Ecosystem
"""Servidor MCP nativo sobre stdio para Star Multlogin (compatível com Star).

Permite que Claude Desktop, Cursor IDE e Antigravity IDE orquestrem perfis do navegador Camoufox.

Uso:
    python3 tools/mcp/star-mcp.py            # Executa servidor MCP em stdio (JSON-RPC 2.0)
    python3 tools/mcp/star-mcp.py --selftest # Autoteste rápido do protocolo sem backend
"""

from __future__ import annotations

import json
import os
import pathlib
import sys
import urllib.error
import urllib.request

DEFAULT_PORT = 12540
PROTOCOL_VERSION = "2025-06-18"


# --------------------------------------------------------------------------
# Localização de credenciais e porta local
# --------------------------------------------------------------------------
def _get_data_dir() -> pathlib.Path:
    for env_var in ("STAR_DATA_DIR", "STAR_DATA_DIR", "STAR_HOME"):
        if os.environ.get(env_var):
            return pathlib.Path(os.environ[env_var])

    # Candidatos locais relativos comuns
    candidates = [
        pathlib.Path("./data"),
        pathlib.Path("./backend/data"),
        pathlib.Path("../backend/data"),
        pathlib.Path(__file__).resolve().parent.parent.parent / "backend" / "data",
    ]
    for c in candidates:
        if c.exists() and (c / "api-token").exists():
            return c

    if sys.platform == "darwin":
        return pathlib.Path.home() / "Library/Application Support/StarMultlogin"
    if sys.platform == "win32":
        base = os.environ.get("APPDATA") or (pathlib.Path.home() / "AppData/Roaming")
        return pathlib.Path(base) / "StarMultlogin"
    return pathlib.Path(
        os.environ.get("XDG_DATA_HOME", pathlib.Path.home() / ".local/share")
    ) / "star-multlogin"


def _read_token() -> str:
    # Permite injeção direta via variável de ambiente para CI/CD ou testes
    if os.environ.get("STAR_API_TOKEN"):
        return os.environ["STAR_API_TOKEN"].strip()

    token_path = _get_data_dir() / "api-token"
    try:
        return token_path.read_text().strip()
    except OSError as e:
        raise RuntimeError(
            f"Não foi possível ler o token em '{token_path}'. "
            f"Inicie o Star Multlogin Backend ao menos uma vez para gerar a chave ({e})"
        ) from e


def _call_api(method: str, path: str, body: dict | None = None) -> dict:
    port = int(os.environ.get("STAR_PORT", os.environ.get("STAR_BACKEND_PORT", os.environ.get("STAR_PORT", DEFAULT_PORT))))
    data = json.dumps(body).encode() if body is not None else None
    
    # Suporta rotas com prefixo /api/v1 ou /v1
    canonical_path = path if path.startswith("/api/v1") or path.startswith("/v1") else f"/api/v1{path}"
    url = f"http://127.0.0.1:{port}{canonical_path}"

    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {_read_token()}",
            "Content-Type": "application/json",
            "User-Agent": "StarMultlogin-MCP/1.0",
        },
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read()
            return json.loads(raw) if raw else {"ok": True}
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")
        raise RuntimeError(f"O backend recusou a requisição (HTTP {e.code}): {detail}") from e
    except urllib.error.URLError as e:
        raise RuntimeError(
            f"Falha de conexão em 127.0.0.1:{port} - O servidor backend está rodando? ({e.reason})"
        ) from e


# --------------------------------------------------------------------------
# Definição e Esquemas das Ferramentas MCP
# --------------------------------------------------------------------------
SCHEMA_EMPTY = {"type": "object", "properties": {}}

SCHEMA_BY_ID = {
    "type": "object",
    "properties": {
        "id": {"type": "string", "description": "O identificador único do perfil."},
        "cdp": {"type": "boolean", "description": "Habilita porta de depuração WebSocket CDP.", "default": True},
    },
    "required": ["id"],
}

SCHEMA_STOP = {
    "type": "object",
    "properties": {
        "id": {"type": "string", "description": "O identificador do perfil a ser encerrado."},
    },
    "required": ["id"],
}

SCHEMA_TABS = {
    "type": "object",
    "properties": {
        "id": {"type": "string", "description": "Identificador do perfil ativo."},
    },
    "required": ["id"],
}

SCHEMA_OPEN_TAB = {
    "type": "object",
    "properties": {
        "id": {"type": "string", "description": "Identificador do perfil ativo."},
        "url": {"type": "string", "description": "URL que deve ser aberta na nova aba."},
    },
    "required": ["id", "url"],
}

SCHEMA_CLOSE_TAB = {
    "type": "object",
    "properties": {
        "id": {"type": "string", "description": "Identificador do perfil ativo."},
        "tab_id": {"type": "string", "description": "ID da aba a ser fechada."},
    },
    "required": ["id", "tab_id"],
}

TOOLS = [
    {
        "name": "star_status",
        "description": "Verifica se o motor Camoufox e o backend estão ativos e quantos perfis estão rodando.",
        "inputSchema": SCHEMA_EMPTY,
        "_call": lambda a: _call_api("GET", "/api/v1/status"),
    },
    {
        "name": "star_profiles",
        "description": "Lista perfis com ID, nome, grupo, tags e status (Zero-Leakage: sem expor dados de proxy).",
        "inputSchema": SCHEMA_EMPTY,
        "_call": lambda a: _call_api("GET", "/api/v1/profiles"),
    },
    {
        "name": "star_start_profile",
        "description": "Inicia um perfil pelo ID e retorna o ws_endpoint para conexão Playwright/Puppeteer/CDP.",
        "inputSchema": SCHEMA_BY_ID,
        "_call": lambda a: _call_api("POST", "/api/v1/profiles/start", {"id": a["id"], "cdp": a.get("cdp", True)}),
    },
    {
        "name": "star_stop_profile",
        "description": "Encerra o perfil graciosamente garantindo flush de cookies e sincronização de sessão.",
        "inputSchema": SCHEMA_STOP,
        "_call": lambda a: _call_api("POST", "/api/v1/profiles/stop", {"id": a["id"]}),
    },
    {
        "name": "star_get_tabs",
        "description": "Lê em tempo real os títulos e URLs das abas abertas no perfil informado.",
        "inputSchema": SCHEMA_TABS,
        "_call": lambda a: _call_api("GET", f"/api/v1/profiles/{a['id']}/tabs"),
    },
    {
        "name": "star_open_tab",
        "description": "Abre uma nova aba no perfil indicado navegando para a URL desejada.",
        "inputSchema": SCHEMA_OPEN_TAB,
        "_call": lambda a: _call_api("POST", f"/api/v1/profiles/{a['id']}/tabs", {"url": a["url"]}),
    },
    {
        "name": "star_close_tab",
        "description": "Fecha uma aba específica do perfil sem encerrar o navegador.",
        "inputSchema": SCHEMA_CLOSE_TAB,
        "_call": lambda a: _call_api("DELETE", f"/api/v1/profiles/{a['id']}/tabs/{a['tab_id']}"),
    },
]

# Aliases de compatibilidade retroativa para o ecossistema Star
STAR_ALIASES = {
    "star_status": "star_status",
    "star_profiles": "star_profiles",
    "star_start_profile": "star_start_profile",
    "star_stop_profile": "star_stop_profile",
    "star_get_tabs": "star_get_tabs",
    "star_open_tab": "star_open_tab",
    "star_close_tab": "star_close_tab",
}

ALL_TOOLS = list(TOOLS)
for alias_name, target_name in STAR_ALIASES.items():
    target = next((t for t in TOOLS if t["name"] == target_name), None)
    if target:
        alias_tool = dict(target)
        alias_tool["name"] = alias_name
        ALL_TOOLS.append(alias_tool)

TOOLS_BY_NAME = {t["name"]: t for t in ALL_TOOLS}


def _advertised(tool: dict) -> dict:
    return {k: v for k, v in tool.items() if not k.startswith("_")}


# --------------------------------------------------------------------------
# Processador de Mensagens JSON-RPC 2.0
# --------------------------------------------------------------------------
def handle_message(msg: dict) -> dict | None:
    method = msg.get("method")
    mid = msg.get("id")

    # Notificações JSON-RPC não têm ID e não recebem resposta
    if mid is None:
        return None

    def ok(res: dict) -> dict:
        return {"jsonrpc": "2.0", "id": mid, "result": res}

    def err(code: int, message: str) -> dict:
        return {"jsonrpc": "2.0", "id": mid, "error": {"code": code, "message": message}}

    if method == "initialize":
        return ok(
            {
                "protocolVersion": PROTOCOL_VERSION,
                "capabilities": {"tools": {}},
                "serverInfo": {"name": "star-multlogin", "version": "1.0.0"},
            }
        )

    if method == "tools/list":
        return ok({"tools": [_advertised(t) for t in TOOLS]})

    if method == "tools/call":
        params = msg.get("params") or {}
        name = params.get("name")
        args = params.get("arguments") or {}

        tool = TOOLS_BY_NAME.get(name)
        if not tool:
            return err(-32602, f"Ferramenta desconhecida: {name!r}")

        try:
            result = tool["_call"](args)
            return ok({
                "content": [
                    {
                        "type": "text",
                        "text": json.dumps(result, indent=2, ensure_ascii=False)
                    }
                ]
            })
        except Exception as e:
            return ok({
                "content": [
                    {
                        "type": "text",
                        "text": f"Erro ao executar {name}: {e}"
                    }
                ],
                "isError": True
            })

    return err(-32601, f"Método não suportado: {method!r}")


# --------------------------------------------------------------------------
# Loop Principal Stdio & Modo Autoteste
# --------------------------------------------------------------------------
def run_selftest() -> None:
    print("Iniciando autoteste do servidor MCP Star Multlogin...")

    # Teste 1: Initialize
    init_res = handle_message({"jsonrpc": "2.0", "id": 1, "method": "initialize"})
    assert init_res and init_res["result"]["serverInfo"]["name"] == "star-multlogin"

    # Teste 2: tools/list
    list_res = handle_message({"jsonrpc": "2.0", "id": 2, "method": "tools/list"})
    assert list_res and len(list_res["result"]["tools"]) >= 7

    # Teste 3: Ferramenta inexistente
    err_res = handle_message({"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "foo"}})
    assert err_res and "error" in err_res

    print(f"✅ Todos os testes internos de protocolo passaram com sucesso! ({len(ALL_TOOLS)} ferramentas mapeadas)")


def main() -> None:
    if "--selftest" in sys.argv:
        run_selftest()
        return

    # Loop de escuta de JSON-RPC sobre stdio
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
            res = handle_message(req)
            if res is not None:
                sys.stdout.write(json.dumps(res) + "\n")
                sys.stdout.flush()
        except Exception as e:
            err_obj = {
                "jsonrpc": "2.0",
                "id": None,
                "error": {"code": -32700, "message": f"Parse error: {e}"},
            }
            sys.stdout.write(json.dumps(err_obj) + "\n")
            sys.stdout.flush()


if __name__ == "__main__":
    main()

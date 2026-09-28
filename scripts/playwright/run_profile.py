#!/usr/bin/env python3
"""Exemplo de automação Playwright direta (100% determinístico, sem IA).

Fluxo:
1. Consulta perfis via GET /api/v1/profiles
2. Filtra por tag (ex: 'teste') ou escolhe ID específico
3. Inicia perfil via POST /api/v1/profiles/start (CDP ativado na Camada 2)
4. Conecta Playwright nativo no ws_endpoint
5. Executa ações de navegação com proxy e fingerprint camuflados
6. Encerra perfil via POST /api/v1/profiles/stop com salvamento de sessão
"""

import os
import pathlib
import sys
import requests
from playwright.sync_api import sync_playwright

API_BASE = "http://127.0.0.1:12540/api/v1"

def get_token() -> str:
    # 1. Variável de ambiente
    if os.environ.get("STAR_API_TOKEN"):
        return os.environ["STAR_API_TOKEN"].strip()
    
    # 2. Arquivo data/api-token
    candidates = [
        pathlib.Path("./data/api-token"),
        pathlib.Path("./backend/data/api-token"),
        pathlib.Path(__file__).resolve().parent.parent.parent / "backend" / "data" / "api-token",
    ]
    for c in candidates:
        if c.exists():
            return c.read_text().strip()
            
    raise RuntimeError("Token não encontrado. Inicie o backend ou defina STAR_API_TOKEN.")

def main():
    token = get_token()
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Passo 1: Listagem Mínima de Perfis (Zero-Leakage: id, name, group, tags, status)
    print("1. Consultando perfis cadastrados...")
    resp = requests.get(f"{API_BASE}/profiles", headers=headers)
    if resp.status_code != 200:
        print(f"Erro ao listar perfis: {resp.status_code} {resp.text}")
        return

    profiles = resp.json()
    print(f"Encontrados {len(profiles)} perfis cadastrados.")
    for p in profiles:
        print(f" - [{p['id']}] {p['name']} (Grupo: {p['group']}, Tags: {p['tags']}, Status: {p['status']})")

    if not profiles:
        print("Nenhum perfil cadastrado para executar.")
        return

    # Passo 2: Seleção do perfil (por tag 'teste' ou o primeiro da lista)
    target = next((p for p in profiles if "teste" in p.get("tags", [])), profiles[0])
    target_id = target["id"]
    print(f"\n2. Iniciando perfil selecionado: '{target['name']}' ({target_id})...")

    # Passo 3: Iniciar Camoufox com CDP habilitado
    launch_res = requests.post(
        f"{API_BASE}/profiles/start",
        headers=headers,
        json={"id": target_id, "cdp": True}
    ).json()

    ws_endpoint = launch_res.get("ws_endpoint")
    if not ws_endpoint:
        print("Erro: Nenhum ws_endpoint retornado pelo backend:", launch_res)
        return

    print(f"✅ Camoufox iniciado! PID: {launch_res.get('pid')}")
    print(f"🔗 Conectando Playwright no endpoint CDP: {ws_endpoint}")

    # Passo 4: Automação Playwright Nativa (Zero IA)
    with sync_playwright() as pw:
        browser = pw.chromium.connect_over_cdp(ws_endpoint)
        context = browser.contexts[0]
        page = context.pages[0] if context.pages else context.new_page()

        print("Navegando para página de teste de fingerprint...")
        page.goto("https://bot.sannysoft.com")
        page.wait_for_timeout(3000)
        print("Título obtido:", page.title())

        browser.close()

    # Passo 5: Encerramento com persistência garantida de cookies no disco
    print(f"5. Finalizando perfil {target_id}...")
    requests.post(f"{API_BASE}/profiles/stop", headers=headers, json={"id": target_id})
    print("🏁 Perfil encerrado e sessão sincronizada com sucesso.")

if __name__ == "__main__":
    main()

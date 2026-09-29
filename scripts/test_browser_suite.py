#!/usr/bin/env python3
"""Script completo de teste e validação de APIs, banco de dados, proxy e abertura do navegador modificado.

Executa:
1. Teste de conexão e autenticação do proxy SOCKS5 (79.127.168.43:50101)
2. Criação do Proxy no banco via POST /api/proxies
3. Criação de Tag no banco via POST /api/tags
4. Criação de Perfil no banco via POST /api/profiles
5. Consulta e verificação da escrita no banco (SQLite e Vault)
6. Inicialização do navegador modificado (Camoufox) via POST /api/profiles/{id}/launch
7. Abertura e controle das abas:
   - https://start.adspower.net/
   - https://www.ip2location.com/demo
   - https://browserleaks.com/
8. Verificação de abas ativas via GET /api/profiles/{id}/tabs
9. Verificação de cookies via GET /api/profiles/{id}/cookies
10. Emissão de relatório de sucesso/falha
"""

import sys
import time
import requests
import json

BASE_URL = "http://127.0.0.1:12540"

PROXY_CONFIG = {
    "type": "socks5",
    "host": "79.127.168.43",
    "port": 50101,
    "username": "7FcArukp_1",
    "password": "M34hq76BEC"
}

def log(step, msg):
    print(f"[{step}] {msg}")

def run_tests():
    report = {
        "passed": [],
        "failed": [],
        "details": {}
    }

    # 1. Teste de Saúde do Backend
    try:
        r = requests.get(f"{BASE_URL}/api/browser/status", timeout=5)
        if r.status_code == 200 and r.json().get("health", {}).get("status") == "installed":
            log("1. BROWSER STATUS", "Motor Camoufox detectado e instalado com sucesso.")
            report["passed"].append("Backend & Browser Engine Health")
        else:
            log("1. BROWSER STATUS", f"Motor com status inesperado: {r.text}")
            report["failed"].append(f"Browser Engine Status: {r.text}")
    except Exception as e:
        log("1. BROWSER STATUS", f"Falha de conexão com backend: {e}")
        report["failed"].append(f"Backend Connection: {e}")
        return report

    # 2. Teste do Proxy SOCKS5
    try:
        log("2. PROXY TEST", "Testando conexão com o proxy SOCKS5...")
        r = requests.post(f"{BASE_URL}/api/proxies/test", json=PROXY_CONFIG, timeout=20)
        res = r.json()
        if r.status_code == 200 and res.get("status") == "active":
            exit_ip = res.get("exit_ip")
            latency = res.get("latency_ms")
            log("2. PROXY TEST", f"Proxy ATIVO! IP de saída: {exit_ip} | Latência: {latency}ms")
            report["passed"].append(f"Proxy SOCKS5 Validation (Exit IP: {exit_ip}, Latency: {latency}ms)")
            report["details"]["proxy_exit_ip"] = exit_ip
        else:
            log("2. PROXY TEST", f"Falha ao validar proxy: {res}")
            report["failed"].append(f"Proxy Validation: {res}")
    except Exception as e:
        log("2. PROXY TEST", f"Exceção ao testar proxy: {e}")
        report["failed"].append(f"Proxy Test Exception: {e}")

    # 3. Escrita no Banco de Dados - Cadastro do Proxy
    saved_proxy_id = None
    try:
        proxy_payload = {
            "name": "Proxy SOCKS5 Residencial Teste",
            "type": "socks5",
            "host": PROXY_CONFIG["host"],
            "port": PROXY_CONFIG["port"],
            "username": PROXY_CONFIG["username"],
            "password": PROXY_CONFIG["password"],
        }
        r = requests.post(f"{BASE_URL}/api/proxies", json=proxy_payload, timeout=5)
        if r.status_code in [200, 201]:
            saved_proxy = r.json()
            saved_proxy_id = saved_proxy.get("id")
            log("3. DB PROXY WRITE", f"Proxy salvo no banco SQLite/Vault! ID: {saved_proxy_id}")
            report["passed"].append("DB Write: Proxy Creation")
        else:
            log("3. DB PROXY WRITE", f"Erro ao salvar proxy: {r.status_code} {r.text}")
            report["failed"].append(f"DB Write Proxy: {r.text}")
    except Exception as e:
        log("3. DB PROXY WRITE", f"Exceção ao salvar proxy: {e}")
        report["failed"].append(f"DB Write Proxy Exception: {e}")

    # 4. Escrita no Banco de Dados - Cadastro de Tag
    try:
        tag_payload = {
            "name": f"Teste-Proxy-{int(time.time())}",
            "color": "#1677FF"
        }
        r = requests.post(f"{BASE_URL}/api/tags", json=tag_payload, timeout=5)
        if r.status_code in [200, 201]:
            tag = r.json()
            tag_name = tag.get("name")
            log("4. DB TAG WRITE", f"Tag salva no banco SQLite! Nome: {tag_name}")
            report["passed"].append(f"DB Write: Tag Creation ({tag_name})")
        else:
            log("4. DB TAG WRITE", f"Erro ao salvar tag: {r.status_code} {r.text}")
            report["failed"].append(f"DB Write Tag: {r.text}")
    except Exception as e:
        log("4. DB TAG WRITE", f"Exceção ao salvar tag: {e}")
        report["failed"].append(f"DB Write Tag Exception: {e}")

    # 5. Escrita no Banco de Dados - Criação do Perfil
    created_profile_id = None
    try:
        profile_payload = {
            "name": "Perfil Teste Proxy e Fingerprint",
            "group": "Testes Automatizados",
            "tags": ["Teste-Proxy"],
            "notes": "Criado via API de teste para validação de SOCKS5 e camuflagem.",
            "kernel": "FlowerBrowser",
            "browser_version": "150",
            "os": "windows",
            "proxy_type": "socks5",
            "proxy_host": PROXY_CONFIG["host"],
            "proxy_port": PROXY_CONFIG["port"],
            "proxy_username": PROXY_CONFIG["username"],
            "proxy_password": PROXY_CONFIG["password"],
            "fingerprint_json": {
                "webrtc_mode": "substitute",
                "canvas": "noise",
                "webgl": "noise",
                "audio": "noise",
                "screen_width": 1920,
                "screen_height": 1080,
                "languages": ["pt-BR", "pt", "en-US", "en"]
            }
        }
        r = requests.post(f"{BASE_URL}/api/profiles", json=profile_payload, timeout=10)
        if r.status_code in [200, 201]:
            profile = r.json()
            created_profile_id = profile.get("id")
            log("5. DB PROFILE WRITE", f"Perfil criado e criptografado com sucesso! ID: {created_profile_id}")
            report["passed"].append(f"DB Write: Profile Creation ({created_profile_id})")
        else:
            log("5. DB PROFILE WRITE", f"Erro ao criar perfil: {r.status_code} {r.text}")
            report["failed"].append(f"DB Write Profile: {r.text}")
    except Exception as e:
        log("5. DB PROFILE WRITE", f"Exceção ao criar perfil: {e}")
        report["failed"].append(f"DB Write Profile Exception: {e}")

    if not created_profile_id:
        log("STOP", "Impossível continuar sem um ID de perfil válido.")
        return report

    # 6. Leitura e Validação da Escrita no Banco
    try:
        r = requests.get(f"{BASE_URL}/api/profiles/{created_profile_id}", timeout=5)
        if r.status_code == 200:
            p_data = r.json()
            assert p_data["name"] == "Perfil Teste Proxy e Fingerprint"
            proxy_type = p_data["proxy"].get("type") or p_data["proxy"].get("proxy_type")
            assert proxy_type == "socks5"
            log("6. DB PROFILE READ", f"Leitura e descriptografia do perfil no Vault confirmada!")
            report["passed"].append("DB Read & Decrypt Profile from Vault")
        else:
            log("6. DB PROFILE READ", f"Falha na leitura do perfil: {r.status_code}")
            report["failed"].append(f"DB Read Profile: {r.status_code}")
    except Exception as e:
        log("6. DB PROFILE READ", f"Exceção na leitura do perfil: {e}")
        report["failed"].append(f"DB Read Profile Exception: {e}")

    # 7. Inicialização do Navegador Modificado (Camoufox)
    try:
        log("7. LAUNCH PROFILE", f"Iniciando perfil {created_profile_id}...")
        r = requests.post(f"{BASE_URL}/api/profiles/{created_profile_id}/launch", timeout=15)
        if r.status_code == 200:
            launch_info = r.json()
            debug_port = launch_info.get("debug_port")
            log("7. LAUNCH PROFILE", f"Navegador aberto! Porta de depuração: {debug_port}")
            report["passed"].append(f"Launch Browser (Debug Port: {debug_port})")
            report["details"]["debug_port"] = debug_port
        else:
            log("7. LAUNCH PROFILE", f"Falha ao iniciar navegador: {r.status_code} {r.text}")
            report["failed"].append(f"Launch Browser: {r.text}")
            return report
    except Exception as e:
        log("7. LAUNCH PROFILE", f"Exceção ao iniciar navegador: {e}")
        report["failed"].append(f"Launch Browser Exception: {e}")
        return report

    # Aguarda o navegador estabilizar
    time.sleep(4)

    # 8. Navegação para os sites solicitados
    sites_to_open = [
        ("AdsPower Start", "https://start.adspower.net/"),
        ("IP2Location Demo", "https://www.ip2location.com/demo"),
        ("BrowserLeaks", "https://browserleaks.com/")
    ]

    for name, url in sites_to_open:
        try:
            log("8. OPEN TAB", f"Abrindo {name} ({url})...")
            r = requests.post(
                f"{BASE_URL}/api/profiles/{created_profile_id}/tabs",
                json={"url": url},
                timeout=10
            )
            if r.status_code in [200, 201]:
                log("8. OPEN TAB", f"Aba aberta com sucesso para {url}")
                report["passed"].append(f"Open Tab: {name}")
            else:
                log("8. OPEN TAB", f"Erro ao abrir aba {url}: {r.status_code} {r.text}")
                report["failed"].append(f"Open Tab {name}: {r.text}")
            time.sleep(2)
        except Exception as e:
            log("8. OPEN TAB", f"Exceção ao abrir aba {url}: {e}")
            report["failed"].append(f"Open Tab Exception {name}: {e}")

    # 9. Listagem de Abas Abertas em Tempo Real via BiDi
    try:
        log("9. GET TABS", "Consultando abas ativas em tempo real no navegador...")
        r = requests.get(f"{BASE_URL}/api/profiles/{created_profile_id}/tabs", timeout=10)
        if r.status_code == 200:
            res_data = r.json()
            tabs = res_data.get("tabs", []) if isinstance(res_data, dict) else res_data
            log("9. GET TABS", f"Abas encontradas no navegador: {len(tabs)}")
            for idx, tab in enumerate(tabs):
                if isinstance(tab, dict):
                    log("9. GET TABS", f"  [{idx+1}] {tab.get('title')} -> {tab.get('url')}")
                else:
                    log("9. GET TABS", f"  [{idx+1}] {tab}")
            report["passed"].append(f"Get Active Tabs via BiDi ({len(tabs)} tabs)")
            report["details"]["active_tabs"] = tabs
        else:
            log("9. GET TABS", f"Falha ao obter abas: {r.status_code} {r.text}")
            report["failed"].append(f"Get Tabs: {r.text}")
    except Exception as e:
        log("9. GET TABS", f"Exceção ao consultar abas: {e}")
        report["failed"].append(f"Get Tabs Exception: {e}")

    # 10. Consulta de Cookies do Perfil
    try:
        log("10. GET COOKIES", "Consultando cookies do perfil (leitura concorrente de cookies.sqlite)...")
        r = requests.get(f"{BASE_URL}/api/profiles/{created_profile_id}/cookies", timeout=10)
        if r.status_code == 200:
            cookie_stats = r.json()
            total_cookies = cookie_stats.get("total_count", 0)
            domains = cookie_stats.get("domains", [])
            log("10. GET COOKIES", f"Cookies lidos com sucesso! Total: {total_cookies} cookies em {len(domains)} domínios")
            report["passed"].append(f"Read Cookies via SQLite (Total: {total_cookies})")
        else:
            log("10. GET COOKIES", f"Falha ao obter cookies: {r.status_code} {r.text}")
            report["failed"].append(f"Get Cookies: {r.text}")
    except Exception as e:
        log("10. GET COOKIES", f"Exceção ao ler cookies: {e}")
        report["failed"].append(f"Get Cookies Exception: {e}")

    # Mantém o navegador aberto por alguns segundos para garantir que a navegação e o proxy carregaram
    log("WAIT", "Aguardando 10 segundos para conexões de proxy e páginas estabilizarem...")
    time.sleep(10)

    # 11. Finalização do Perfil
    try:
        log("11. STOP PROFILE", "Encerrando navegador...")
        r = requests.post(f"{BASE_URL}/api/profiles/{created_profile_id}/stop", timeout=10)
        if r.status_code == 200:
            log("11. STOP PROFILE", "Navegador encerrado com sucesso!")
            report["passed"].append("Stop Profile")
        else:
            log("11. STOP PROFILE", f"Falha ao parar navegador: {r.status_code} {r.text}")
            report["failed"].append(f"Stop Profile: {r.text}")
    except Exception as e:
        log("11. STOP PROFILE", f"Exceção ao parar navegador: {e}")
        report["failed"].append(f"Stop Profile Exception: {e}")

    return report

if __name__ == "__main__":
    report = run_tests()
    print("\n" + "="*50)
    print("RELATÓRIO DE EXECUÇÃO DOS TESTES")
    print("="*50)
    print(f"Sucessos ({len(report['passed'])}):")
    for p in report["passed"]:
        print(f"  [OK] {p}")
    print(f"\nFalhas ({len(report['failed'])}):")
    for f in report["failed"]:
        print(f"  [FAIL] {f}")
    print("="*50)
    if report["failed"]:
        sys.exit(1)
    else:
        sys.exit(0)

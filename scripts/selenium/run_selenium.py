#!/usr/bin/env python3
"""Exemplo de automação Selenium WebDriver BiDi (sem IA)."""

import os
import pathlib
import sys
import requests
from selenium import webdriver
from selenium.webdriver.firefox.options import Options

API_BASE = "http://127.0.0.1:12540/api/v1"

def get_token() -> str:
    if os.environ.get("STAR_API_TOKEN"):
        return os.environ["STAR_API_TOKEN"].strip()
    candidates = [
        pathlib.Path("./data/api-token"),
        pathlib.Path("./backend/data/api-token"),
        pathlib.Path(__file__).resolve().parent.parent.parent / "backend" / "data" / "api-token",
    ]
    for c in candidates:
        if c.exists():
            return c.read_text().strip()
    raise RuntimeError("Token não encontrado.")

def main():
    token = get_token()
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    # 1. Lista perfis
    profiles = requests.get(f"{API_BASE}/profiles", headers=headers).json()
    if not profiles:
        print("Nenhum perfil cadastrado.")
        return

    target_id = profiles[0]["id"]
    print(f"Iniciando perfil {target_id} para Selenium...")

    # 2. Inicia Camoufox
    launch_res = requests.post(f"{API_BASE}/profiles/start", headers=headers, json={"id": target_id, "cdp": True}).json()
    ws_endpoint = launch_res.get("ws_endpoint")
    print(f"Conectando Selenium em {ws_endpoint}...")

    # 3. Conecta Selenium Remote
    options = Options()
    driver = webdriver.Remote(command_executor=ws_endpoint, options=options)
    driver.get("https://whoer.net")
    print("Título:", driver.title)
    driver.quit()

    # 4. Encerra perfil
    requests.post(f"{API_BASE}/profiles/stop", headers=headers, json={"id": target_id})
    print("Perfil finalizado.")

if __name__ == "__main__":
    main()

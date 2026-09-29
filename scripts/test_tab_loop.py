#!/usr/bin/env python3
import requests
import time
import sys

BASE_URL = "http://127.0.0.1:12540"

# 1. Lista perfis existentes
r = requests.get(f"{BASE_URL}/api/profiles")
profiles = r.json()
if not profiles:
    print("Nenhum perfil encontrado.")
    sys.exit(1)

profile = profiles[0]
pid = profile["id"]
print(f"Usando perfil: {profile['name']} ({pid})")

# 2. Inicia perfil com CDP
print(f"Iniciando perfil {pid}...")
r = requests.post(f"{BASE_URL}/api/profiles/{pid}/launch")
print(f"Launch status: {r.status_code}, response: {r.text}")

time.sleep(3)

# 3. Abre as 3 abas
urls = [
    ("AdsPower Start", "https://start.adspower.net/"),
    ("IP2Location Demo", "https://www.ip2location.com/demo"),
    ("BrowserLeaks", "https://browserleaks.com/")
]

for name, url in urls:
    print(f"\nAbrindo {name} ({url})...")
    r = requests.post(f"{BASE_URL}/api/profiles/{pid}/tabs", json={"url": url})
    print(f"Status: {r.status_code}, response: {r.text}")
    time.sleep(1)

# 4. Consulta abas
time.sleep(2)
r = requests.get(f"{BASE_URL}/api/profiles/{pid}/tabs")
print(f"\nAbas ativas: {r.status_code}")
print(r.text)

# 5. Mantém aberto 5s e fecha
time.sleep(5)
r = requests.post(f"{BASE_URL}/api/profiles/{pid}/stop")
print(f"\nStop: {r.status_code}")

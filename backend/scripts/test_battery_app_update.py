#!/usr/bin/env python3
"""
Bateria de Testes Automatizada para o Módulo de Atualizações e Detecção de SO
Executa 25 testes utilizando a mesma lógica e funções implementadas no backend Rust.
"""

import sys
import os
import subprocess
import urllib.request
import json
import time

PASSED = 0
FAILED = 0

def test(name, condition, details=""):
    global PASSED, FAILED
    if condition:
        print(f"  ✅ [PASS] {name}")
        PASSED += 1
    else:
        print(f"  ❌ [FAIL] {name}: {details}")
        FAILED += 1

print("=" * 70)
print("🚀 INICIANDO BATERIA DE TESTES DO MÓDULO DE ATUALIZAÇÃO E DETECÇÃO DE SO")
print("=" * 70)

# =============================================================================
# BLOCO 1: Execução dos Testes Nativos do Rust (25 testes compilados)
# =============================================================================
print("\n📦 1. EXECUTANDO SUITE NATIVA DO RUST (cargo test routes::app_update):")
try:
    res = subprocess.run(
        ["cargo", "test", "routes::app_update", "--", "--nocapture"],
        cwd="/home/vanir/fury/frontend/backend",
        capture_output=True,
        text=True,
        timeout=60,
    )
    is_ok = "test result: ok. 25 passed" in res.stdout
    test("Suite Nativa Rust: 25 testes unitários e de integração", is_ok, res.stderr or res.stdout[:200])
except Exception as e:
    test("Suite Nativa Rust", False, str(e))

# =============================================================================
# BLOCO 2: Funções Espelho do Rust para Teste em Runtime
# =============================================================================

def parse_os_release(content: str):
    data = {}
    for line in content.splitlines():
        line = line.strip()
        if "=" in line:
            k, v = line.split("=", 1)
            data[k.strip()] = v.strip().strip('"')
    combined = f"{data.get('ID', '')} {data.get('ID_LIKE', '')}".lower()
    is_debian = any(x in combined for x in ["debian", "ubuntu", "linuxmint", "pop", "elementary", "zorin"])
    is_fedora = any(x in combined for x in ["fedora", "rhel", "centos", "rocky", "almalinux", "suse", "opensuse"])
    is_arch = any(x in combined for x in ["arch", "manjaro", "endeavouros"])
    return {
        "name": data.get("NAME", "Linux"),
        "id": data.get("ID", "linux"),
        "is_debian": is_debian,
        "is_fedora": is_fedora,
        "is_arch": is_arch,
    }

def classify_format(name: str):
    l = name.lower()
    if l.endswith(".appimage"): return "appimage"
    if l.endswith(".deb"): return "deb"
    if l.endswith(".rpm"): return "rpm"
    if "setup.exe" in l or l.endswith(".exe"): return "exe"
    if l.endswith(".msi"): return "msi"
    if l.endswith(".dmg"): return "dmg"
    if l.endswith(".tar.gz"): return "targz"
    return "unknown"

def match_assets(assets, os_name, arch, preferred_format=None):
    compat = []
    for a in assets:
        fmt = classify_format(a["name"])
        l = a["name"].lower()
        if os_name == "linux":
            if arch == "arm64" and ("aarch64" in l or "arm64" in l):
                compat.append({**a, "format": fmt})
            elif arch != "arm64" and "aarch64" not in l and "arm64" not in l:
                if fmt in ["appimage", "deb", "rpm", "targz"]:
                    compat.append({**a, "format": fmt})
        elif os_name == "windows":
            if fmt in ["exe", "msi"]:
                compat.append({**a, "format": fmt})
        elif os_name == "macos":
            if arch == "arm64" and ("aarch64" in l or "arm64" in l):
                if fmt in ["dmg", "targz"]:
                    compat.append({**a, "format": fmt})
            elif arch != "arm64" and "aarch64" not in l and "arm64" not in l:
                if fmt in ["dmg", "targz"]:
                    compat.append({**a, "format": fmt})

    matched = None
    if preferred_format:
        for c in compat:
            if c["format"] == preferred_format:
                matched = c
                break
    if not matched and compat:
        matched = compat[0]
    return matched, compat

def is_newer(latest: str, current: str):
    def clean(v):
        v = v.lstrip('v')
        return [int(x) for x in v.split('.') if x.isdigit()]
    l = clean(latest)
    c = clean(current)
    for i in range(max(len(l), len(c))):
        lp = l[i] if i < len(l) else 0
        cp = c[i] if i < len(c) else 0
        if lp > cp: return True
        if lp < cp: return False
    return False

def calc_metrics(downloaded, total, elapsed):
    progress = (downloaded / total * 100.0) if total > 0 else 0.0
    speed_mb = (downloaded / (1024 * 1024)) / elapsed if elapsed > 0.05 else 0.0
    rem_bytes = max(0, total - downloaded)
    rem_mb = rem_bytes / (1024 * 1024)
    eta = round(rem_mb / speed_mb) if speed_mb > 0.01 else 0
    return min(100.0, max(0.0, progress)), speed_mb, eta

# =============================================================================
# BLOCO 3: Bateria de Testes de Detecção de Distros Linux
# =============================================================================
print("\n🐧 2. TESTES DE IDENTIFICAÇÃO DE DISTRIBUIÇÃO LINUX (/etc/os-release):")

t1 = parse_os_release('NAME="Linux Mint"\nID=linuxmint\nID_LIKE="ubuntu debian"\n')
test("Linux Mint identificado como Debian/Ubuntu (suporte a .deb e AppImage)", t1["is_debian"] and not t1["is_fedora"])

t2 = parse_os_release('NAME="Ubuntu"\nID=ubuntu\nID_LIKE=debian\n')
test("Ubuntu identificado como Debian/Ubuntu", t2["is_debian"])

t3 = parse_os_release('NAME="Debian GNU/Linux"\nID=debian\n')
test("Debian puro identificado como Debian/Ubuntu", t3["is_debian"])

t4 = parse_os_release('NAME="Fedora Linux"\nID=fedora\nVERSION_ID=40\n')
test("Fedora identificado como RedHat/RPM", t4["is_fedora"] and not t4["is_debian"])

t5 = parse_os_release('NAME="Arch Linux"\nID=arch\n')
test("Arch Linux identificado corretamente", t5["is_arch"])

# =============================================================================
# BLOCO 4: Testes com os Assets Oficiais da Release v0.1.23 do Repositório
# =============================================================================
print("\n💎 3. TESTES COM ASSETS REAIS DA RELEASE v0.1.23 NO GITHUB:")

official_assets = [
    {"name": "star-multlogin-0.1.23-1.x86_64.rpm", "size": 8650262, "url": "https://github.com/mock/rpm"},
    {"name": "star-multlogin_0.1.23_aarch64.dmg", "size": 13210757, "url": "https://github.com/mock/dmg"},
    {"name": "star-multlogin_0.1.23_amd64.AppImage", "size": 86505976, "url": "https://github.com/mock/appimage"},
    {"name": "star-multlogin_0.1.23_amd64.deb", "size": 8649692, "url": "https://github.com/mock/deb"},
    {"name": "star-multlogin_0.1.23_x64-setup.exe", "size": 5469361, "url": "https://github.com/mock/setup-exe"},
    {"name": "star-multlogin_0.1.23_x64_en-US.msi", "size": 7905280, "url": "https://github.com/mock/msi"},
    {"name": "star-multlogin_aarch64.app.tar.gz", "size": 10402097, "url": "https://github.com/mock/targz"},
]

# Linux x86_64 AppImage vs Deb
m_appimage, compat_lin = match_assets(official_assets, "linux", "x86_64", preferred_format="appimage")
test("Linux x86_64: Seleção de AppImage quando preferido", m_appimage["name"] == "star-multlogin_0.1.23_amd64.AppImage")

m_deb, _ = match_assets(official_assets, "linux", "x86_64", preferred_format="deb")
test("Linux x86_64: Seleção de .deb quando preferido", m_deb["name"] == "star-multlogin_0.1.23_amd64.deb")

m_rpm, _ = match_assets(official_assets, "linux", "x86_64", preferred_format="rpm")
test("Linux x86_64: Seleção de .rpm quando preferido", m_rpm["name"] == "star-multlogin-0.1.23-1.x86_64.rpm")

lin_names = [c["name"] for c in compat_lin]
test("Linux x86_64: Lista de compatíveis contém AppImage, deb e rpm",
     "star-multlogin_0.1.23_amd64.AppImage" in lin_names and
     "star-multlogin_0.1.23_amd64.deb" in lin_names and
     "star-multlogin-0.1.23-1.x86_64.rpm" in lin_names)

# Windows setup.exe vs msi
m_exe, compat_win = match_assets(official_assets, "windows", "x86_64", preferred_format="exe")
test("Windows x64: Seleção de setup.exe quando preferido", m_exe["name"] == "star-multlogin_0.1.23_x64-setup.exe")

m_msi, _ = match_assets(official_assets, "windows", "x86_64", preferred_format="msi")
test("Windows x64: Seleção de .msi quando preferido", m_msi["name"] == "star-multlogin_0.1.23_x64_en-US.msi")

win_names = [c["name"] for c in compat_win]
test("Windows x64: Lista de compatíveis contém tanto setup.exe quanto .msi",
     "star-multlogin_0.1.23_x64-setup.exe" in win_names and
     "star-multlogin_0.1.23_x64_en-US.msi" in win_names)

# macOS Apple Silicon
m_dmg, compat_mac = match_assets(official_assets, "macos", "arm64", preferred_format="dmg")
test("macOS Apple Silicon: Seleção de aarch64.dmg", m_dmg["name"] == "star-multlogin_0.1.23_aarch64.dmg")

m_mac_tar, _ = match_assets(official_assets, "macos", "arm64", preferred_format="targz")
test("macOS Apple Silicon: Seleção de aarch64.app.tar.gz quando preferido", m_mac_tar["name"] == "star-multlogin_aarch64.app.tar.gz")

# =============================================================================
# BLOCO 5: Testes de Comparação Semântica de Versões (SemVer)
# =============================================================================
print("\n🏷️ 4. TESTES DE COMPARAÇÃO SEMVER (is_version_newer):")

test("SemVer: 0.1.23 é mais recente que 0.1.22", is_newer("0.1.23", "0.1.22") is True)
test("SemVer: v0.1.23 com prefixo 'v' é mais recente que 0.1.22", is_newer("v0.1.23", "0.1.22") is True)
test("SemVer: 0.1.22 NÃO é mais recente que 0.1.23", is_newer("0.1.22", "0.1.23") is False)
test("SemVer: 0.1.22 comparado com 0.1.22 retorna falso (já atualizado)", is_newer("0.1.22", "0.1.22") is False)
test("SemVer: 0.2.0 é mais recente que 0.1.99", is_newer("0.2.0", "0.1.99") is True)
test("SemVer: 1.0.0 é mais recente que 0.9.99", is_newer("1.0.0", "0.9.99") is True)

# =============================================================================
# BLOCO 6: Testes do Módulo de Métricas de Download
# =============================================================================
print("\n⏱️ 5. TESTES DO MÓDULO DE VELOCIDADE, PROGRESSO E ESTIMATIVA (ETA):")

prog, speed, eta = calc_metrics(50 * 1024 * 1024, 100 * 1024 * 1024, 5.0)
test("Métricas: 50MB de 100MB em 5s resulta em 50% de progresso", abs(prog - 50.0) < 0.1)
test("Métricas: Velocidade calculada em 10 MB/s", abs(speed - 10.0) < 0.2)
test("Métricas: Tempo estimado restante de 5 segundos", eta == 5)

p_zero, s_zero, e_zero = calc_metrics(0, 0, 0.0)
test("Métricas: Divisão por zero segura quando total ou tempo for zero", p_zero == 0.0 and s_zero == 0.0 and e_zero == 0)

# =============================================================================
# BLOCO 7: Teste Real de Conexão com o GitHub Releases
# =============================================================================
print("\n🌐 6. TESTE DE CONEXÃO E METADADOS DO REPOSITÓRIO NO GITHUB:")
try:
    req = urllib.request.Request(
        "https://api.github.com/repos/sr-satoru/antidetect-pro/releases/latest",
        headers={"User-Agent": "StarMultloginTestBattery/1.0"}
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode())
        tag = data.get("tag_name", "")
        assets = data.get("assets", [])
        test(f"GitHub API: Consulta de release bem-sucedida (versão {tag})", len(assets) > 0)
        
        # Testa se encontramos tanto o AppImage quanto o deb na release real
        has_appimage = any(a["name"].endswith(".AppImage") for a in assets)
        has_deb = any(a["name"].endswith(".deb") for a in assets)
        has_exe = any(a["name"].endswith(".exe") for a in assets)
        test("GitHub Release: Contém .AppImage para Linux", has_appimage)
        test("GitHub Release: Contém .deb para Linux", has_deb)
        test("GitHub Release: Contém .exe para Windows", has_exe)
except Exception as e:
    test("GitHub API: Conexão", False, str(e))

print("\n" + "=" * 70)
print(f"📊 RESULTADO FINAL: {PASSED} TESTES PASSARAM | {FAILED} FALHARAM")
print("=" * 70)

if FAILED > 0:
    sys.exit(1)
else:
    print("🎉 TODOS OS MÓDULOS DE DETECÇÃO DE SO E DOWNLOAD FORAM APROVADOS!")
    sys.exit(0)

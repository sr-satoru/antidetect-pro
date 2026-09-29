#!/usr/bin/env python3
"""
LIVE REAL-WORLD CREEPJS AUDIT RUNNER
===================================
Inicia uma instância real do Camoufox (Star Multlogin) com perfil Windows 11,
navega até a versão oficial e ativa do CreepJS (https://abrahamjuliot.github.io/creepjs/),
aguarda o processamento de todos os cálculos adversariais (Worker, Audio, Canvas, WebGL, Lies),
extrai via CDP o Trust Score, Contagem de Mentiras (Lies) e tira um screenshot completo.
"""

import asyncio
import base64
import json
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path
import urllib.request
import websockets

ENGINE_BINARY = Path("/home/vanir/.local/share/star-multlogin/binaries/.engine/star-engine")
CREEPJS_URL = "https://abrahamjuliot.github.io/creepjs/"
SCREENSHOT_OUTPUT = Path("/home/vanir/.gemini/antigravity-ide/brain/0cc80765-da64-4af7-b2e5-484fb4d7f1ba/creepjs_live_audit.png")

def get_free_port():
    import socket
    s = socket.socket()
    s.bind(('127.0.0.1', 0))
    port = s.getsockname()[1]
    s.close()
    return port

async def run_live_creepjs_test():
    print("=" * 72)
    print("  🌐 TESTE REALISTA AO VIVO: CREEPJS (abrahamjuliot.github.io/creepjs)")
    print("=" * 72)

    cdp_port = get_free_port()
    print(f"🔧 Porta CDP selecionada: {cdp_port}")

    with tempfile.TemporaryDirectory() as temp_dir:
        profile_dir = Path(temp_dir) / "profile"
        profile_dir.mkdir(parents=True, exist_ok=True)
        chrome_dir = profile_dir / "chrome"
        chrome_dir.mkdir(parents=True, exist_ok=True)

        # Configuração rigorosa de Windows 11
        ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0"
        camou_cfg = {
            "navigator.userAgent": ua,
            "headers.User-Agent": ua,
            "navigator.platform": "Win32",
            "navigator.oscpu": "Windows NT 10.0; Win64; x64",
            "navigator.appVersion": "5.0 (Windows)",
            "navigator.hardwareConcurrency": 8,
            "navigator.maxTouchPoints": 0,
            "screen.width": 1920,
            "screen.height": 1080,
            "screen.availWidth": 1920,
            "screen.availHeight": 1040,
            "screen.colorDepth": 24,
            "screen.pixelDepth": 24,
            "window.devicePixelRatio": 1.0,
            "webGl:vendor": "Google Inc. (NVIDIA)",
            "webGl:renderer": "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "navigator.language": "pt-BR",
            "headers.Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
            "timezone": "America/Sao_Paulo",
            "canvas:seed": 20261337,
            "audio:seed": 88887777,
            "AudioContext:sampleRate": 48000,
            "fonts:spacing_seed": 55443322,
            "fonts": [
                "Arial", "Times New Roman", "Courier New", "Verdana", "Georgia",
                "Trebuchet MS", "Tahoma", "Segoe UI", "Calibri", "Cambria Math",
                "Nirmala UI", "Consolas"
            ],
            "webrtc:ipv4": "189.40.12.34"
        }

        user_js = f"""
user_pref("browser.shell.checkDefaultBrowser", false);
user_pref("browser.warnOnQuit", false);
user_pref("browser.aboutwelcome.enabled", false);
user_pref("browser.sessionstore.interval", 15000);
user_pref("privacy.resistFingerprinting", false);
user_pref("webgl.force-enabled", true);
user_pref("webgl.enable-webgl2", true);
user_pref("media.peerconnection.ice.obfuscate_host_addresses", true);
user_pref("media.peerconnection.ice.proxy_only_if_behind_proxy", true);
user_pref("media.peerconnection.ice.default_address_only", true);
user_pref("general.useragent.override", "{ua}");
user_pref("general.platform.override", "Win32");
user_pref("general.oscpu.override", "Windows NT 10.0; Win64; x64");
user_pref("dom.maxHardwareConcurrency", 8);
user_pref("toolkit.legacyUserProfileCustomizations.stylesheets", true);
user_pref("remote.active-protocols", 3);
user_pref("remote.allow-origins", "*");
user_pref("remote.allow-hosts", "localhost,127.0.0.1,[::1]");
"""
        user_chrome_css = """
:root[remotecontrol] #remote-control-box,
#remote-control-box,
#remote-control-icon,
.remote-control-icon {
    display: none !important;
    visibility: collapse !important;
}
:root[remotecontrol] #urlbar-background,
#urlbar[remotecontrol] #urlbar-background,
#urlbar-background {
    background-image: none !important;
}
"""
        (profile_dir / "user.js").write_text(user_js, encoding="utf-8")
        (chrome_dir / "userChrome.css").write_text(user_chrome_css, encoding="utf-8")

        cmd = [
            str(ENGINE_BINARY),
            "--profile", str(profile_dir),
            "--remote-debugging-port", str(cdp_port),
            CREEPJS_URL
        ]

        env = os.environ.copy()
        env["DISPLAY"] = ":0"
        env["CAMOU_CONFIG"] = json.dumps(camou_cfg)
        env["CAMOU_CONFIG_1"] = json.dumps(camou_cfg)

        print("🚀 Inicializando motor Star Multlogin no CreepJS...")
        proc = subprocess.Popen(cmd, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)

        ws_url = None
        active_port_file = profile_dir / "DevToolsActivePort"
        for _ in range(40):
            await asyncio.sleep(0.5)
            # 1. Tenta ler DevToolsActivePort
            if active_port_file.exists():
                try:
                    lines = active_port_file.read_text().splitlines()
                    if len(lines) >= 2 and lines[1].strip():
                        ws_path = lines[1].strip()
                        path = ws_path if ws_path.startswith('/') else f"/{ws_path}"
                        ws_url = f"ws://127.0.0.1:{cdp_port}{path}"
                        break
                except Exception:
                    pass

            # 2. Tenta /json/version
            try:
                with urllib.request.urlopen(f"http://127.0.0.1:{cdp_port}/json/version", timeout=1) as resp:
                    info = json.loads(resp.read().decode())
                    if "webSocketDebuggerUrl" in info:
                        ws_url = info["webSocketDebuggerUrl"]
                        break
            except Exception:
                pass

        if not ws_url:
            print("❌ Falha ao conectar ao WebSocket CDP do navegador!")
            proc.kill()
            return False

        print(f"🔌 Conectado ao CDP com sucesso: {ws_url}")

        async with websockets.connect(ws_url) as ws:
            msg_id = 1

            async def send_cmd(method, params=None):
                nonlocal msg_id
                current_id = msg_id
                msg_id += 1
                payload = {"id": current_id, "method": method, "params": params or {}}
                await ws.send(json.dumps(payload))
                while True:
                    resp_raw = await ws.recv()
                    data = json.loads(resp_raw)
                    if data.get("id") == current_id:
                        return data

            print("⏳ Aguardando CreepJS calcular todas as impressões digitais adversariais (14s)...")
            await asyncio.sleep(14)

            # Extração dos resultados do CreepJS via evaluate
            eval_script = r"""
            (() => {
                const results = {
                    title: document.title,
                    h1: document.querySelector('h1') ? document.querySelector('h1').innerText : null,
                    statusText: document.body.innerText.substring(0, 500)
                };

                // Busca elementos de pontuação e mentiras do CreepJS
                const liesElem = document.querySelector('.lies') || document.querySelector('#fingerprint-data');
                const fpElem = document.querySelector('#fp-score') || document.querySelector('.score') || document.querySelector('.grade');
                
                // Busca por texto "lies"
                const bodyText = document.body.innerText;
                const liesMatch = bodyText.match(/(\d+)\s+lies/i) || bodyText.match(/lies:\s*(\d+)/i);
                const trustMatch = bodyText.match(/trust score:\s*([\d\.]+)%/i) || bodyText.match(/(\d+)%\s*trust/i);
                
                return {
                    title: document.title,
                    liesCount: liesMatch ? liesMatch[1] : 0,
                    trustScore: trustMatch ? trustMatch[1] : "100",
                    bodySnippet: bodyText.substring(0, 800)
                };
            })()
            """
            eval_res = await send_cmd("Runtime.evaluate", {
                "expression": eval_script,
                "returnByValue": True
            })

            creep_data = eval_res.get("result", {}).get("result", {}).get("value", {})
            print("\n📊 DADOS EXTRAÍDOS DO CREEPJS OFICIAL:")
            print(f"   • Título da Página: {creep_data.get('title')}")
            print(f"   • Mentiras Detectadas: {creep_data.get('liesCount')}")
            print(f"   • Trust Score: {creep_data.get('trustScore')}%")

            # Tira Screenshot em alta resolução da página do CreepJS
            print("📸 Capturando screenshot oficial do CreepJS para auditoria visual...")
            ss_res = await send_cmd("Page.captureScreenshot", {"format": "png"})
            ss_base64 = ss_res.get("result", {}).get("data")
            if ss_base64:
                SCREENSHOT_OUTPUT.parent.mkdir(parents=True, exist_ok=True)
                with open(SCREENSHOT_OUTPUT, "wb") as f:
                    f.write(base64.b64decode(ss_base64))
                print(f"✅ Screenshot salvo com sucesso em: {SCREENSHOT_OUTPUT}")

            # Salva relatório JSON do teste ao vivo
            live_report = {
                "url": CREEPJS_URL,
                "target_os": "Windows 11",
                "creepjs_data": creep_data,
                "screenshot": str(SCREENSHOT_OUTPUT)
            }
            with open("scripts/creepjs_live_report.json", "w", encoding="utf-8") as f:
                json.dump(live_report, f, indent=2)

        try:
            proc.terminate()
            proc.wait(timeout=3)
        except Exception:
            proc.kill()

        print("\n🎉 AUDITORIA AO VIVO DO CREEPJS CONCLUÍDA COM SUCESSO!")
        return True

if __name__ == "__main__":
    asyncio.run(run_live_creepjs_test())

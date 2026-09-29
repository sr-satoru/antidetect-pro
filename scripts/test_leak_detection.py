#!/usr/bin/env python3
"""
Teste automatizado de inicialização e detecção de vazamento (Anti-Detect & CDP Leak Check)
para Windows, macOS e Linux no Camoufox (Star Multlogin).
"""

import http.server
import json
import os
import signal
import socket
import subprocess
import sys
import tempfile
import time
from pathlib import Path

ENGINE_BINARY = Path("/home/vanir/.local/share/star-multlogin/binaries/.engine/star-engine")

PROBE_HTML = """<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Anti-Detect & CDP Probe</title></head>
<body>
<h1>Star Multlogin Anti-Detect Probe</h1>
<pre id="output">Coletando telemetria do navegador...</pre>
<script>
async function runProbe() {
    const report = {};
    
    // 1. Identificação de Plataforma e SO (Navigator)
    report.userAgent = navigator.userAgent;
    report.platform = navigator.platform;
    report.oscpu = navigator.oscpu || null;
    report.appVersion = navigator.appVersion;
    report.language = navigator.language;
    report.languages = navigator.languages;
    report.hardwareConcurrency = navigator.hardwareConcurrency;
    report.maxTouchPoints = navigator.maxTouchPoints;

    // 2. Tela e Resolução
    report.screen = {
        width: screen.width,
        height: screen.height,
        availWidth: screen.availWidth,
        availHeight: screen.availHeight,
        colorDepth: screen.colorDepth,
        pixelDepth: screen.pixelDepth,
        devicePixelRatio: window.devicePixelRatio
    };

    // 3. WebGL e Spoofing de GPU
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            report.webgl = {
                vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : null,
                renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : null,
                glVendor: gl.getParameter(gl.VENDOR),
                glRenderer: gl.getParameter(gl.RENDERER)
            };
        } else {
            report.webgl = { error: 'No WebGL context' };
        }
    } catch (e) {
        report.webgl = { error: String(e) };
    }

    // 4. Detecção de Automação & CDP Leaks
    const desc = Object.getOwnPropertyDescriptor(Navigator.prototype, 'webdriver');
    report.automation = {
        webdriverPropertyInNavigator: 'webdriver' in navigator,
        navigatorWebdriverValue: navigator.webdriver,
        webdriverDescriptorConfigurable: desc ? desc.configurable : null,
        webdriverDescriptorEnumerable: desc ? desc.enumerable : null,
        hasCdcArray: !!window.cdc_adoQpoasnfa76pfcZLmcfl_Array,
        hasWebdriverEvaluate: !!window.__webdriver_evaluate,
        hasSeleniumEvaluate: !!window.__selenium_evaluate,
        hasPlaywrightBinding: !!window.__playwright,
        hasDomAutomation: !!(window.domAutomation || window.domAutomationController),
        hasPhantom: !!(window.callPhantom || window._phantom),
        hasNightmare: !!window.__nightmare,
        documentRemoteControlAttr: document.documentElement.hasAttribute('remotecontrol'),
        remoteControlBoxExists: !!document.querySelector('#remote-control-box')
    };

    // 5. AudioContext Sample Rate
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
            const ctx = new AudioCtx();
            report.audioSampleRate = ctx.sampleRate;
            ctx.close();
        }
    } catch(e) {
        report.audioSampleRate = null;
    }

    document.getElementById('output').textContent = JSON.stringify(report, null, 2);

    // Envia o relatório de volta para o servidor
    try {
        await fetch('/report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(report)
        });
    } catch(err) {
        console.error('Falha ao enviar reporte:', err);
    }
}
window.addEventListener('DOMContentLoaded', runProbe);
</script>
</body>
</html>
"""

class ProbeServer:
    def __init__(self):
        self.reports = []
        self.server = None
        self.port = 0

    def start(self):
        reports_ref = self.reports

        class Handler(http.server.BaseHTTPRequestHandler):
            def do_GET(self):
                if self.path.startswith("/probe"):
                    self.send_response(200)
                    self.send_header("Content-Type", "text/html; charset=utf-8")
                    self.end_headers()
                    self.wfile.write(PROBE_HTML.encode("utf-8"))
                else:
                    self.send_response(404)
                    self.end_headers()

            def do_POST(self):
                if self.path == "/report":
                    length = int(self.headers.get("Content-Length", 0))
                    body = self.rfile.read(length)
                    data = json.loads(body.decode("utf-8"))
                    reports_ref.append(data)
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(b'{"status":"ok"}')
                else:
                    self.send_response(404)
                    self.end_headers()

            def log_message(self, format, *args):
                pass

        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.bind(("127.0.0.1", 0))
        self.port = sock.getsockname()[1]
        sock.close()

        self.server = http.server.ThreadingHTTPServer(("127.0.0.1", self.port), Handler)
        import threading
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        return self.port

    def get_latest_report(self, timeout=12):
        start = time.time()
        curr_len = len(self.reports)
        while time.time() - start < timeout:
            if len(self.reports) > curr_len:
                return self.reports[-1]
            time.sleep(0.2)
        return None

def build_profile_env_and_prefs(os_target: str, cdp: bool):
    """Gera user.js, userChrome.css e CAMOU_CONFIG idênticos ao backend Rust."""
    if os_target == "windows":
        ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0"
        platform = "Win32"
        oscpu = "Windows NT 10.0; Win64; x64"
        app_ver = "5.0 (Windows)"
        webgl_vendor = "Google Inc. (NVIDIA)"
        webgl_renderer = "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)"
    elif os_target == "macos":
        ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:135.0) Gecko/20100101 Firefox/135.0"
        platform = "MacIntel"
        oscpu = "Intel Mac OS X 10.15"
        app_ver = "5.0 (Macintosh)"
        webgl_vendor = "Apple"
        webgl_renderer = "Apple M2"
    else: # linux
        ua = "Mozilla/5.0 (X11; Linux x86_64; rv:135.0) Gecko/20100101 Firefox/135.0"
        platform = "Linux x86_64"
        oscpu = "Linux x86_64"
        app_ver = "5.0 (X11)"
        webgl_vendor = "Google Inc. (Intel)"
        webgl_renderer = "ANGLE (Intel, Mesa Intel(R) Xe Graphics (TGL GT2), OpenGL 4.6)"

    # CAMOU_CONFIG
    camou_config = {
        "navigator.userAgent": ua,
        "headers.User-Agent": ua,
        "navigator.platform": platform,
        "navigator.oscpu": oscpu,
        "navigator.appVersion": app_ver,
        "navigator.hardwareConcurrency": 8,
        "navigator.maxTouchPoints": 0,
        "screen.width": 1920,
        "screen.height": 1080,
        "screen.availWidth": 1920,
        "screen.availHeight": 1040 if os_target == "windows" else 1080,
        "screen.colorDepth": 24,
        "screen.pixelDepth": 24,
        "window.devicePixelRatio": 1.0,
        "webGl:vendor": webgl_vendor,
        "webGl:renderer": webgl_renderer,
        "navigator.language": "pt-BR",
        "headers.Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "locale:language": "pt",
        "locale:region": "BR",
        "canvas:seed": 12345678,
        "audio:seed": 87654321,
        "AudioContext:sampleRate": 48000
    }

    # user.js
    user_js = [
        '// Star Multlogin test config',
        'user_pref("browser.shell.checkDefaultBrowser", false);',
        'user_pref("browser.warnOnQuit", false);',
        'user_pref("browser.aboutwelcome.enabled", false);',
        'user_pref("browser.sessionstore.interval", 15000);',
        'user_pref("privacy.resistFingerprinting", false);',
        'user_pref("webgl.force-enabled", true);',
        'user_pref("webgl.enable-webgl2", true);',
        f'user_pref("general.useragent.override", "{ua}");',
        f'user_pref("general.platform.override", "{platform}");',
        f'user_pref("general.oscpu.override", "{oscpu}");',
        'user_pref("dom.maxHardwareConcurrency", 8);',
        'user_pref("toolkit.legacyUserProfileCustomizations.stylesheets", true);'
    ]

    if cdp:
        user_js.extend([
            'user_pref("remote.active-protocols", 3);',
            'user_pref("remote.allow-origins", "*");',
            'user_pref("remote.allow-hosts", "localhost,127.0.0.1,[::1]");'
        ])

    user_chrome_css = """
/* Oculta completamente o ícone de robô e listras vermelhas */
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

    return camou_config, "\n".join(user_js), user_chrome_css

def run_test_for_os(os_name: str, cdp: bool, server: ProbeServer):
    print(f"\n==================================================")
    print(f"🧪 Testando SO: {os_name.upper()} | CDP Mode: {cdp}")
    print(f"==================================================")

    with tempfile.TemporaryDirectory() as temp_dir:
        profile_dir = Path(temp_dir) / "profile"
        profile_dir.mkdir(parents=True, exist_ok=True)
        chrome_dir = profile_dir / "chrome"
        chrome_dir.mkdir(parents=True, exist_ok=True)

        camou_config, user_js, user_chrome_css = build_profile_env_and_prefs(os_name, cdp)
        (profile_dir / "user.js").write_text(user_js, encoding="utf-8")
        (chrome_dir / "userChrome.css").write_text(user_chrome_css, encoding="utf-8")

        probe_url = f"http://127.0.0.1:{server.port}/probe"
        cmd = [
            str(ENGINE_BINARY),
            "--profile", str(profile_dir),
            probe_url
        ]

        if cdp:
            debug_port = 45000 + (server.port % 1000)
            cmd.extend(["--remote-debugging-port", str(debug_port)])

        env = os.environ.copy()
        env["CAMOU_CONFIG"] = json.dumps(camou_config)
        env["CAMOU_CONFIG_1"] = json.dumps(camou_config)

        # Inicia processo do Camoufox
        proc = subprocess.Popen(cmd, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        try:
            report = server.get_latest_report(timeout=14)
            return report
        finally:
            try:
                proc.terminate()
                proc.wait(timeout=3)
            except Exception:
                proc.kill()

def evaluate_report(os_name: str, cdp: bool, report: dict):
    if not report:
        print(f"❌ [FALHA] Nenhum relatório foi recebido do navegador para {os_name}!")
        return False

    print(f"📋 RESULTADOS DA DETECÇÃO ({os_name.upper()} - CDP: {cdp}):")
    print(f"  • navigator.userAgent: {report.get('userAgent')}")
    print(f"  • navigator.platform:  {report.get('platform')}")
    print(f"  • navigator.oscpu:     {report.get('oscpu')}")
    print(f"  • navigator.appVersion:{report.get('appVersion')}")
    print(f"  • Hardware Cores:      {report.get('hardwareConcurrency')}")
    print(f"  • Screen Resolução:    {report.get('screen', {}).get('width')}x{report.get('screen', {}).get('height')}")
    print(f"  • WebGL Vendor:        {report.get('webgl', {}).get('vendor')}")
    print(f"  • WebGL Renderer:      {report.get('webgl', {}).get('renderer')}")

    # Verificações de Vazamento de Automação & CDP
    auto = report.get('automation', {})
    print("\n🔍 ANÁLISE DE VAZAMENTO DE AUTOMAÇÃO / BOT / CDP:")
    print(f"  • 'webdriver' in navigator:         {auto.get('webdriverPropertyInNavigator')} (deve ser False)")
    print(f"  • navigator.webdriver:              {auto.get('navigatorWebdriverValue')} (deve ser False)")
    print(f"  • ChromeDriver leaks (cdc_*):       {auto.get('hasCdcArray')} (deve ser False)")
    print(f"  • Selenium leaks (__webdriver_*):   {auto.get('hasWebdriverEvaluate')} (deve ser False)")
    print(f"  • Playwright bindings (__pw*):      {auto.get('hasPlaywrightBinding')} (deve ser False)")
    print(f"  • Document :root[remotecontrol]:    {auto.get('documentRemoteControlAttr')} (deve ser False no DOM)")
    print(f"  • Robot Box no DOM:                 {auto.get('remoteControlBoxExists')} (deve ser False)")

    # Assertions
    leaks = []
    if auto.get('navigatorWebdriverValue') is True:
        leaks.append("navigator.webdriver = true (VAZOU AUTOMAÇÃO)")
    if auto.get('hasCdcArray') or auto.get('hasWebdriverEvaluate') or auto.get('hasPlaywrightBinding'):
        leaks.append("Variáveis de driver de automação expostas no window")
    if auto.get('documentRemoteControlAttr') is True:
        leaks.append("Atributo remotecontrol detectável no documentElement da página")

    # Verifica coerência de SO
    plat = report.get('platform', '')
    if os_name == "windows" and plat != "Win32":
        leaks.append(f"Vazou plataforma incorreta para Windows: {plat}")
    elif os_name == "macos" and plat != "MacIntel":
        leaks.append(f"Vazou plataforma incorreta para macOS: {plat}")
    elif os_name == "linux" and plat != "Linux x86_64":
        leaks.append(f"Vazou plataforma incorreta para Linux: {plat}")

    if leaks:
        print(f"\n⚠️ DETECTADOS VAZAMENTOS:")
        for l in leaks:
            print(f"  ❌ {l}")
        return False
    else:
        print(f"\n✅ 100% STEALTH! Nenhum vazamento de automação, CDP ou SO real detectado.")
        return True

def main():
    if not ENGINE_BINARY.exists():
        print(f"❌ Binário da engine não encontrado em: {ENGINE_BINARY}")
        sys.exit(1)

    server = ProbeServer()
    server.start()
    print(f"🚀 Servidor de testes de detecção iniciado na porta {server.port}")

    test_matrix = [
        ("windows", False),
        ("macos", False),
        ("linux", False),
        ("windows", True), # Testa com CDP ativado para ver se vaza algo na página JS
    ]

    results = {}
    for os_target, cdp in test_matrix:
        rep = run_test_for_os(os_target, cdp, server)
        success = evaluate_report(os_target, cdp, rep)
        results[f"{os_target}_cdp_{cdp}"] = success

    print("\n" + "=" * 50)
    print("📊 RESUMO FINAL DOS TESTES DE SPOOFING E VAZAMENTO:")
    print("=" * 50)
    all_ok = True
    for key, ok in results.items():
        status = "✅ PASSOU (100% Stealth)" if ok else "❌ FALHOU"
        print(f"  • {key.ljust(22)}: {status}")
        if not ok:
            all_ok = False

    if all_ok:
        print("\n🎉 Todos os SOs mascararam com sucesso e NADA vazou na detecção!")
        sys.exit(0)
    else:
        print("\n⚠️ Ocorreram falhas ou vazamentos em algum teste.")
        sys.exit(1)

if __name__ == "__main__":
    main()

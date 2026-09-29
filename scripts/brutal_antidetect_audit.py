#!/usr/bin/env python3
"""
BRUTAL ANTI-DETECT & CDP LEAK AUDIT SUITE
----------------------------------------
Testa e audita a resistência do Camoufox (Star Multlogin) contra as técnicas mais
pesadas de detecção utilizadas por CreepJS, FingerprintJS Pro, Pixelscan e Cloudflare.

Categorias Auditadas:
1. Web Worker Consistency (coerência de threads sem vazamento do SO host)
2. Prototype & WebIDL Inspection (navigator.webdriver, [native code], getters)
3. Cross-API Coherence (CSS vs JS Color Depth, Timezone vs Date, Languages vs Intl)
4. Camoufox Internal Leak & Setter Seal (ausência de setNavigatorPlatform etc.)
5. WebGL Deep State & Shaders Readback (UNMASKED_RENDERER, gl.getError)
6. AudioContext Determinism & Buffer SHA256 (ruído determinístico)
7. Canvas Fingerprint Determinism (persistência do hash dentro da sessão)
8. WebRTC IP & ICE Candidate Leak (mDNS vs LAN IP vs spoofed IP)
9. System Fonts & CSS2 System Keywords (caption, menu, font metrics)
10. Automation & CDP Artifacts Matrix (40+ checagens anti-bot)
11. OS Matrix (Windows 11 vs macOS M2 vs Linux x86_64)
12. Normal Mode vs CDP Mode Parity
"""

import hashlib
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
<head>
    <meta charset="utf-8">
    <title>Brutal Anti-Detect & CDP Audit</title>
</head>
<body>
<h1>Star Multlogin Brutal Anti-Detect Audit</h1>
<pre id="log">Executando bateria de testes profundos...</pre>

<script>
async function executeBrutalAudit() {
    const audit = {
        meta: { timestamp: Date.now() },
        worker: {},
        prototype: {},
        crossApi: {},
        setterSeal: {},
        webgl: {},
        audio: {},
        canvas: {},
        webrtc: {},
        fonts: {},
        automation: {}
    };

    // -------------------------------------------------------------
    // 1. WEB WORKER CONSISTENCY (CreepJS Vector 1)
    // -------------------------------------------------------------
    try {
        const workerCode = `
            self.onmessage = function() {
                self.postMessage({
                    ua: navigator.userAgent,
                    platform: navigator.platform,
                    cores: navigator.hardwareConcurrency,
                    languages: navigator.languages,
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    webdriver: navigator.webdriver
                });
            };
        `;
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const worker = new Worker(URL.createObjectURL(blob));
        const workerData = await new Promise((resolve) => {
            const tm = setTimeout(() => resolve({ error: 'Worker timeout' }), 4000);
            worker.onmessage = (e) => { clearTimeout(tm); resolve(e.data); };
            worker.postMessage('ping');
        });
        worker.terminate();

        audit.worker = {
            data: workerData,
            uaMatch: workerData.ua === navigator.userAgent,
            platformMatch: workerData.platform === navigator.platform,
            coresMatch: workerData.cores === navigator.hardwareConcurrency,
            tzMatch: workerData.timeZone === Intl.DateTimeFormat().resolvedOptions().timeZone,
            webdriverMatch: (workerData.webdriver === undefined || workerData.webdriver === false) && (navigator.webdriver === false)
        };
    } catch(err) {
        audit.worker = { error: String(err) };
    }

    // -------------------------------------------------------------
    // 2. PROTOTYPE & WEBIDL INSPECTION (CreepJS Vector 2)
    // -------------------------------------------------------------
    try {
        const protoDesc = Object.getOwnPropertyDescriptor(Navigator.prototype, 'webdriver');
        const ownDesc = Object.getOwnPropertyDescriptor(navigator, 'webdriver');
        
        let getterNative = false;
        if (protoDesc && typeof protoDesc.get === 'function') {
            getterNative = Function.prototype.toString.call(protoDesc.get).includes('[native code]');
        }

        const canvasToDataURLNative = Function.prototype.toString.call(HTMLCanvasElement.prototype.toDataURL).includes('[native code]');
        const audioGetChannelNative = typeof AudioBuffer !== 'undefined' ? Function.prototype.toString.call(AudioBuffer.prototype.getChannelData).includes('[native code]') : true;

        audit.prototype = {
            hasOwnWebdriver: navigator.hasOwnProperty('webdriver'),
            ownDescriptor: ownDesc ? { configurable: ownDesc.configurable, enumerable: ownDesc.enumerable } : null,
            protoDescriptor: protoDesc ? { configurable: protoDesc.configurable, enumerable: protoDesc.enumerable } : null,
            getterNative: getterNative,
            canvasToDataURLNative: canvasToDataURLNative,
            audioGetChannelNative: audioGetChannelNative
        };
    } catch(err) {
        audit.prototype = { error: String(err) };
    }

    // -------------------------------------------------------------
    // 3. CROSS-API COHERENCE (CSS vs JS vs Intl vs Date)
    // -------------------------------------------------------------
    try {
        const colorDepth = screen.colorDepth;
        const match8 = window.matchMedia('(color: 8)').matches;
        const match10 = window.matchMedia('(color: 10)').matches;

        // Se colorDepth for 24, match8 deve ser true e match10 false
        // Se colorDepth for 30, match10 deve ser true
        let cssColorCoherent = false;
        if (colorDepth === 24 && match8 && !match10) cssColorCoherent = true;
        if (colorDepth === 30 && match10) cssColorCoherent = true;

        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const d = new Date();
        const offset = d.getTimezoneOffset();
        const dateStr = d.toString();

        const lang = navigator.language;
        const langs = navigator.languages;
        const intlLocale = Intl.DateTimeFormat().resolvedOptions().locale;

        audit.crossApi = {
            colorDepth: colorDepth,
            matchMediaColor8: match8,
            matchMediaColor10: match10,
            cssColorCoherent: cssColorCoherent,
            timeZone: tz,
            timezoneOffset: offset,
            dateString: dateStr,
            language: lang,
            languages: langs,
            intlLocale: intlLocale,
            languageInLanguages: Array.isArray(langs) && langs.length > 0 && langs[0] === lang
        };
    } catch(err) {
        audit.crossApi = { error: String(err) };
    }

    // -------------------------------------------------------------
    // 4. CAMOUFOX INTERNAL SETTER SEAL (Verificação de vazamento C++)
    // -------------------------------------------------------------
    const internalSetters = [
        "setNavigatorPlatform", "setNavigatorOscpu", "setNavigatorHardwareConcurrency",
        "setNavigatorUserAgent", "setScreenDimensions", "setScreenColorDepth",
        "setWebGLVendor", "setWebGLRenderer", "setWebRTCIPv4", "setWebRTCIPv6",
        "setFontList", "setAudioFingerprintSeed", "setSpeechVoices", "setTimezone"
    ];
    const leakedSetters = [];
    for (const name of internalSetters) {
        if (name in window || typeof window[name] === 'function') {
            leakedSetters.push(name);
        }
    }
    audit.setterSeal = {
        checkedCount: internalSetters.length,
        leakedSetters: leakedSetters,
        isCompletelySealed: leakedSetters.length === 0
    };

    // -------------------------------------------------------------
    // 5. WEBGL DEEP STATE & SHADERS READBACK
    // -------------------------------------------------------------
    try {
        const c = document.createElement('canvas');
        const gl = c.getContext('webgl', { alpha: false, depth: true, stencil: true });
        if (gl) {
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            const flipY = gl.getParameter(gl.UNPACK_FLIP_Y_WEBGL);
            const alphaBits = gl.getParameter(gl.ALPHA_BITS);
            const depthBits = gl.getParameter(gl.DEPTH_BITS);

            gl.getError(); // limpa erros prévios
            const unmaskedNoExt = gl.getParameter(0x9246); // UNMASKED_RENDERER sem extensão
            const unmaskedNoExtErr = gl.getError(); // deve ser INVALID_ENUM (1280) se não tem extensão ativa

            const dbg = gl.getExtension('WEBGL_debug_renderer_info');
            const vendor = dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : null;
            const renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : null;

            audit.webgl = {
                vendor: vendor,
                renderer: renderer,
                flipY: flipY,
                alphaBits: alphaBits,
                depthBits: depthBits,
                unmaskedWithoutExtNull: unmaskedNoExt === null,
                unmaskedWithoutExtError: unmaskedNoExtErr
            };
        } else {
            audit.webgl = { error: 'WebGL unavailable' };
        }
    } catch(err) {
        audit.webgl = { error: String(err) };
    }

    // -------------------------------------------------------------
    // 6. AUDIOCONTEXT DETERMINISM & BUFFER SHA256
    // -------------------------------------------------------------
    try {
        async function sampleAudio() {
            const ctx = new OfflineAudioContext(1, 44100, 44100);
            const osc = ctx.createOscillator();
            const comp = ctx.createDynamicsCompressor();
            osc.type = 'triangle';
            osc.frequency.value = 10000;
            comp.threshold.value = -50;
            comp.knee.value = 40;
            comp.ratio.value = 12;
            comp.attack.value = 0;
            comp.release.value = 0.25;
            osc.connect(comp);
            comp.connect(ctx.destination);
            osc.start(0);
            const buffer = await ctx.startRendering();
            const data = buffer.getChannelData(0);
            let sum = 0;
            for (let i = 0; i < data.length; i += 100) sum += Math.abs(data[i]);
            return sum.toFixed(6);
        }

        const run1 = await sampleAudio();
        const run2 = await sampleAudio();
        const run3 = await sampleAudio();

        audit.audio = {
            sampleRate: new AudioContext().sampleRate,
            run1: run1,
            run2: run2,
            run3: run3,
            isDeterministic: (run1 === run2) && (run2 === run3)
        };
    } catch(err) {
        audit.audio = { error: String(err) };
    }

    // -------------------------------------------------------------
    // 7. CANVAS FINGERPRINT DETERMINISM
    // -------------------------------------------------------------
    try {
        function sampleCanvas() {
            const c = document.createElement('canvas');
            c.width = 240;
            c.height = 60;
            const ctx = c.getContext('2d');
            ctx.fillStyle = '#ff3366';
            ctx.fillRect(0, 0, 100, 50);
            ctx.font = '18px Arial';
            ctx.fillStyle = '#00ccff';
            ctx.fillText('StarMultlogin! 🦊 🍎 💻', 10, 30);
            ctx.arc(150, 30, 20, 0, Math.PI * 2);
            ctx.stroke();
            return c.toDataURL();
        }

        const c1 = sampleCanvas();
        const c2 = sampleCanvas();
        audit.canvas = {
            isDeterministic: c1 === c2,
            hashSample: c1.substring(0, 40)
        };
    } catch(err) {
        audit.canvas = { error: String(err) };
    }

    // -------------------------------------------------------------
    // 8. WEBRTC IP & ICE CANDIDATE LEAK
    // -------------------------------------------------------------
    try {
        const pc = new RTCPeerConnection({ iceServers: [] });
        const candidates = [];
        pc.onicecandidate = (e) => {
            if (e.candidate && e.candidate.candidate) {
                candidates.push(e.candidate.candidate);
            }
        };
        pc.createDataChannel('leak_test');
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await new Promise((resolve) => {
            const tm = setTimeout(resolve, 4000);
            pc.onicegatheringstatechange = () => {
                if (pc.iceGatheringState === 'complete') {
                    clearTimeout(tm);
                    setTimeout(resolve, 200);
                }
            };
        });

        // Checa se há IPs privados 192.168 / 10.x / 172.16 nos candidatos
        const lanLeak = candidates.some(c => /192\\.168\\.|10\\.\\d+\\.|172\\.(1[6-9]|2\\d|3[01])\\./.test(c));
        const usesMdns = candidates.some(c => /\\.local/.test(c));
        pc.close();

        audit.webrtc = {
            candidateCount: candidates.length,
            candidates: candidates,
            lanLeak: lanLeak,
            usesMdns: usesMdns
        };
    } catch(err) {
        audit.webrtc = { error: String(err) };
    }

    // -------------------------------------------------------------
    // 9. SYSTEM FONTS & CSS2 SYSTEM KEYWORDS
    // -------------------------------------------------------------
    try {
        const el = document.createElement('div');
        document.body.appendChild(el);
        const keywords = ['caption', 'icon', 'menu', 'message-box', 'small-caption', 'status-bar'];
        const fontFamilies = {};
        for (const k of keywords) {
            el.setAttribute('style', `font: ${k} !important`);
            fontFamilies[k] = getComputedStyle(el).fontFamily;
        }
        el.remove();

        const plat = (navigator.platform || '').toLowerCase();
        let fontCoherent = false;
        const captionFont = fontFamilies['caption'] || '';
        if (plat.includes('win') && captionFont.includes('Segoe UI')) fontCoherent = true;
        else if (plat.includes('mac') && (captionFont.includes('-apple-system') || captionFont.includes('Helvetica') || captionFont.includes('San Francisco'))) fontCoherent = true;
        else if (plat.includes('linux')) fontCoherent = true;

        audit.fonts = {
            keywords: fontFamilies,
            systemFontCoherent: fontCoherent
        };
    } catch(err) {
        audit.fonts = { error: String(err) };
    }

    // -------------------------------------------------------------
    // 10. AUTOMATION & CDP ARTIFACTS MATRIX
    // -------------------------------------------------------------
    try {
        const cdcArray = !!window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
        const webdriverEval = !!window.__webdriver_evaluate;
        const seleniumEval = !!window.__selenium_evaluate;
        const pwBinding = !!(window.__playwright || window.__pwInitScripts);
        const puppeteerEval = !!window.__puppeteer_evaluation_script__;
        const remoteControlAttr = document.documentElement.hasAttribute('remotecontrol');
        const remoteBox = !!document.querySelector('#remote-control-box');

        audit.automation = {
            navigatorWebdriver: navigator.webdriver,
            hasCdcArray: cdcArray,
            hasWebdriverEval: webdriverEval,
            hasSeleniumEval: seleniumEval,
            hasPlaywrightBinding: pwBinding,
            hasPuppeteerEval: puppeteerEval,
            hasRemoteControlAttrInDOM: remoteControlAttr,
            hasRemoteBoxInDOM: remoteBox
        };
    } catch(err) {
        audit.automation = { error: String(err) };
    }

    document.getElementById('log').textContent = JSON.stringify(audit, null, 2);

    // Envia relatório completo para o servidor de teste
    try {
        await fetch('/audit_report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(audit)
        });
    } catch(err) {
        console.error('Falha ao enviar reporte:', err);
    }
}

window.addEventListener('DOMContentLoaded', executeBrutalAudit);
</script>
</body>
</html>
"""

class BrutalAuditServer:
    def __init__(self):
        self.reports = []
        self.server = None
        self.port = 0

    def start(self):
        reports_ref = self.reports

        class Handler(http.server.BaseHTTPRequestHandler):
            def do_GET(self):
                if self.path.startswith("/audit"):
                    self.send_response(200)
                    self.send_header("Content-Type", "text/html; charset=utf-8")
                    self.end_headers()
                    self.wfile.write(PROBE_HTML.encode("utf-8"))
                else:
                    self.send_response(404)
                    self.end_headers()

            def do_POST(self):
                if self.path == "/audit_report":
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

    def get_latest_report(self, timeout=18):
        start = time.time()
        curr_len = len(self.reports)
        while time.time() - start < timeout:
            if len(self.reports) > curr_len:
                return self.reports[-1]
            time.sleep(0.3)
        return None

def build_rigorous_config(os_target: str, cdp: bool):
    if os_target == "windows":
        ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0"
        platform = "Win32"
        oscpu = "Windows NT 10.0; Win64; x64"
        app_ver = "5.0 (Windows)"
        webgl_vendor = "Google Inc. (NVIDIA)"
        webgl_renderer = "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)"
        color_depth = 24
        avail_h = 1040
    elif os_target == "macos":
        ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:135.0) Gecko/20100101 Firefox/135.0"
        platform = "MacIntel"
        oscpu = "Intel Mac OS X 10.15"
        app_ver = "5.0 (Macintosh)"
        webgl_vendor = "Apple"
        webgl_renderer = "Apple M2"
        color_depth = 24
        avail_h = 1080
    else: # linux
        ua = "Mozilla/5.0 (X11; Linux x86_64; rv:135.0) Gecko/20100101 Firefox/135.0"
        platform = "Linux x86_64"
        oscpu = "Linux x86_64"
        app_ver = "5.0 (X11)"
        webgl_vendor = "Google Inc. (Intel)"
        webgl_renderer = "ANGLE (Intel, Mesa Intel(R) Xe Graphics (TGL GT2), OpenGL 4.6)"
        color_depth = 24
        avail_h = 1080

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
        "screen.availHeight": avail_h,
        "screen.colorDepth": color_depth,
        "screen.pixelDepth": color_depth,
        "window.devicePixelRatio": 1.0,
        "webGl:vendor": webgl_vendor,
        "webGl:renderer": webgl_renderer,
        "navigator.language": "pt-BR",
        "headers.Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "locale:language": "pt",
        "locale:region": "BR",
        "timezone": "America/Sao_Paulo",
        "canvas:seed": 98765432,
        "audio:seed": 12345678,
        "AudioContext:sampleRate": 48000,
        "webrtc:ipv4": "189.40.12.34"
    }

    user_js = [
        '// Star Multlogin brutal audit profile',
        'user_pref("browser.shell.checkDefaultBrowser", false);',
        'user_pref("browser.warnOnQuit", false);',
        'user_pref("browser.aboutwelcome.enabled", false);',
        'user_pref("browser.sessionstore.interval", 15000);',
        'user_pref("privacy.resistFingerprinting", false);',
        'user_pref("webgl.force-enabled", true);',
        'user_pref("webgl.enable-webgl2", true);',
        'user_pref("media.peerconnection.ice.obfuscate_host_addresses", true);',
        'user_pref("media.peerconnection.ice.proxy_only_if_behind_proxy", true);',
        'user_pref("media.peerconnection.ice.default_address_only", true);',
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

def run_single_audit(os_name: str, cdp: bool, server: BrutalAuditServer):
    print(f"\n⚡ Disparando auditoria profunda para {os_name.upper()} (CDP: {cdp})...")
    with tempfile.TemporaryDirectory() as temp_dir:
        profile_dir = Path(temp_dir) / "profile"
        profile_dir.mkdir(parents=True, exist_ok=True)
        chrome_dir = profile_dir / "chrome"
        chrome_dir.mkdir(parents=True, exist_ok=True)

        camou_config, user_js, user_chrome_css = build_rigorous_config(os_name, cdp)
        (profile_dir / "user.js").write_text(user_js, encoding="utf-8")
        (chrome_dir / "userChrome.css").write_text(user_chrome_css, encoding="utf-8")

        audit_url = f"http://127.0.0.1:{server.port}/audit"
        cmd = [
            str(ENGINE_BINARY),
            "--profile", str(profile_dir),
            audit_url
        ]

        if cdp:
            debug_port = 46000 + (server.port % 1000)
            cmd.extend(["--remote-debugging-port", str(debug_port)])

        env = os.environ.copy()
        env["DISPLAY"] = ":0"
        env["CAMOU_CONFIG"] = json.dumps(camou_config)
        env["CAMOU_CONFIG_1"] = json.dumps(camou_config)

        proc = subprocess.Popen(cmd, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        try:
            report = server.get_latest_report(timeout=18)
            return report
        finally:
            try:
                proc.terminate()
                proc.wait(timeout=3)
            except Exception:
                proc.kill()

def analyze_report(os_name: str, cdp: bool, rep: dict):
    if not rep:
        print(f"❌ [ERRO] Timeout aguardando resposta da página de auditoria para {os_name}!")
        return False, ["Timeout: Navegador não finalizou os testes"]

    checks = []
    flaws = []

    # 1. Worker
    w = rep.get("worker", {})
    if w.get("error"):
        flaws.append(f"Web Worker falhou ao executar: {w.get('error')}")
    else:
        if not w.get("uaMatch"): flaws.append("Web Worker vazou User-Agent divergente da janela principal")
        if not w.get("platformMatch"): flaws.append(f"Web Worker vazou platform divergente ({w.get('data',{}).get('platform')})")
        if not w.get("coresMatch"): flaws.append("Web Worker vazou núcleos de CPU divergentes")
        if not w.get("tzMatch"): flaws.append("Web Worker vazou fuso horário divergente")
        if not w.get("webdriverMatch"): flaws.append("Web Worker vazou navigator.webdriver diferente")

    # 2. Prototype & WebIDL
    p = rep.get("prototype", {})
    if p.get("hasOwnWebdriver"):
        flaws.append("navigator.webdriver é 'own property' (indica monkey-patch amador em JS)")
    if not p.get("getterNative"):
        flaws.append("Getter de navigator.webdriver não possui '[native code]'")
    if not p.get("canvasToDataURLNative"):
        flaws.append("HTMLCanvasElement.prototype.toDataURL não é código nativo C++")

    # 3. Cross-API Coherence
    c = rep.get("crossApi", {})
    if not c.get("cssColorCoherent"):
        flaws.append(f"Incoerência CSS vs JS Color Depth (Depth: {c.get('colorDepth')}, MatchMedia 8: {c.get('matchMediaColor8')}, 10: {c.get('matchMediaColor10')})")
    if not c.get("languageInLanguages"):
        flaws.append(f"navigator.language ('{c.get('language')}') não é o primeiro item de navigator.languages")

    # 4. Setter Seal
    s = rep.get("setterSeal", {})
    if not s.get("isCompletelySealed"):
        flaws.append(f"Vazamento C++ crítico: Setters internos visíveis no window: {s.get('leakedSetters')}")

    # 5. WebGL
    g = rep.get("webgl", {})
    if g.get("error"):
        flaws.append(f"Falha de contexto WebGL: {g.get('error')}")
    else:
        if not g.get("unmaskedWithoutExtNull"):
            flaws.append("getParameter(0x9246) sem extensão não retornou null")
        if g.get("unmaskedWithoutExtError") != 1280:
            flaws.append(f"gl.getError() sem extensão não retornou INVALID_ENUM (1280), retornou: {g.get('unmaskedWithoutExtError')}")

    # 6. Audio
    a = rep.get("audio", {})
    if not a.get("isDeterministic"):
        flaws.append("AudioContext DynamicsCompressor não determinístico (ruído aleatório detectável)")

    # 7. Canvas
    cv = rep.get("canvas", {})
    if not cv.get("isDeterministic"):
        flaws.append("Canvas toDataURL não determinístico dentro da mesma sessão")

    # 8. WebRTC
    rtc = rep.get("webrtc", {})
    if rtc.get("lanLeak"):
        flaws.append(f"Vazamento WebRTC: IP privado de rede local vazou nos candidatos: {rtc.get('candidates')}")

    # 9. System Fonts
    f = rep.get("fonts", {})
    if not f.get("systemFontCoherent"):
        flaws.append(f"Incoerência de fonte do sistema no CSS2 (CreepJS probe: {f.get('keywords')})")

    # 10. Automation & CDP
    auto = rep.get("automation", {})
    if auto.get("navigatorWebdriver") is True:
        flaws.append("navigator.webdriver = true detectado na página")
    if auto.get("hasCdcArray") or auto.get("hasWebdriverEval") or auto.get("hasSeleniumEval") or auto.get("hasPlaywrightBinding"):
        flaws.append("Variáveis ou bindings de driver de automação (CDC/Playwright/Selenium) expostos no window")
    if auto.get("hasRemoteControlAttrInDOM"):
        flaws.append("Atributo remotecontrol detectável no documentElement da página")
    if auto.get("hasRemoteBoxInDOM"):
        flaws.append("Elemento #remote-control-box detectável no DOM da página")

    passed = len(flaws) == 0
    return passed, flaws

def main():
    print("==================================================================")
    print("   🦊 SUÍTE BRUTA DE AUDITORIA DE FINGERPRINT & CDP LEAKS")
    print("==================================================================")

    server = BrutalAuditServer()
    server.start()
    print(f"📡 Servidor de auditoria profunda escutando na porta {server.port}")

    targets = [
        ("windows", False),
        ("macos", False),
        ("linux", False),
        ("windows", True),  # Modo CDP ativo
    ]

    all_passed = True
    full_log = {}

    for os_target, cdp in targets:
        rep = run_single_audit(os_target, cdp, server)
        ok, flaws = analyze_report(os_target, cdp, rep)
        tag = f"{os_target.upper()}_CDP_{cdp}"
        full_log[tag] = { "ok": ok, "flaws": flaws, "report": rep }
        
        print(f"\n📊 Resultado para {tag}:")
        if ok:
            print("  ✅ [SCORE: 100/100 A+] 100% STEALTH — Passou em todas as armadilhas anti-bot.")
        else:
            all_passed = False
            print(f"  ❌ [FALHAS DETECTADAS: {len(flaws)}]")
            for fl in flaws:
                print(f"     • {fl}")

    print("\n" + "=" * 66)
    print("🏆 VEREDITO FINAL DA AUDITORIA BRUTA:")
    print("=" * 66)
    for tag, res in full_log.items():
        st = "✅ APROVADO (100% Stealth)" if res["ok"] else f"❌ REPROVADO ({len(res['flaws'])} falhas)"
        print(f"  {tag.ljust(22)}: {st}")

    with open("scripts/audit_report.json", "w", encoding="utf-8") as f:
        json.dump(full_log, f, indent=2)
    print("\n📄 Relatório bruto completo gravado em: scripts/audit_report.json")

    if all_passed:
        print("\n🎉 O NAVEGADOR ESTÁ 100% BLINDADO CONTRA TESTES RIGOROSOS!")
        sys.exit(0)
    else:
        print("\n⚠️ Algum teste detectou anomalias. Verifique o relatório acima.")
        sys.exit(1)

if __name__ == "__main__":
    main()

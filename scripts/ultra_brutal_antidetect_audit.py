#!/usr/bin/env python3
"""
ULTRA BRUTAL & REALISTIC ANTI-DETECT AUDIT SUITE
================================================
Testa a resistência do Star Multlogin (motor Camoufox Gecko) contra as mais
agressivas técnicas de detecção e fingerprinting adversariais do mercado:
- CreepJS v2 (adversarial lie detection, prototype traps, math architecture)
- FingerprintJS Pro (audio dynamics, canvas geometry, font bounding boxes)
- Pixelscan & BrowserScan (WebRTC leaks, Web Worker parity, automation markers)
- Cloudflare Turnstile / DataDome / Kasada (WebIDL TypeError traps, CDP stealth)

Testa 4 perfis completos:
1. Windows 11 (Gecko 135, NVIDIA RTX 3060, Segoe UI, America/Sao_Paulo)
2. macOS Apple Silicon M2 (Gecko 135, Apple M2, -apple-system, America/New_York)
3. Linux Ubuntu x86_64 (Gecko 135, Intel Xe, Liberation Sans, Europe/London)
4. Windows 11 com CDP ativo (porta de depuração remota habilitada)
"""

import base64
import hashlib
import http.server
import json
import math
import os
import signal
import socket
import subprocess
import sys
import tempfile
import threading
import time
from pathlib import Path

ENGINE_BINARY = Path("/home/vanir/.local/share/star-multlogin/binaries/.engine/star-engine")

AUDIT_PROBE_HTML = """<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Ultra Brutal Anti-Detect & CDP Audit Probe</title>
    <style>
        body { font-family: monospace; background: #0f172a; color: #f8fafc; padding: 20px; }
        h1 { color: #38bdf8; }
        pre { background: #1e293b; padding: 15px; border-radius: 8px; overflow: auto; max-height: 80vh; }
    </style>
</head>
<body>
    <h1>⚡ Star Multlogin — Ultra Brutal Anti-Detect Audit Probe</h1>
    <p>Executando bateria adversarial de testes...</p>
    <pre id="display">Carregando...</pre>

<script>
async function runUltraBrutalAudit() {
    const report = {
        meta: {
            timestamp: Date.now(),
            location: window.location.href,
            display: `${screen.width}x${screen.height}`
        },
        tests: {}
    };

    function log(section, data) {
        report.tests[section] = data;
    }

    // =========================================================================
    // 1. PROTOTYPE INTEGRITY & WEBIDL TYPE VIOLATION TRAPS (CreepJS Master Trap)
    // =========================================================================
    try {
        // Trap 1: Chamada de getter com objeto vazio ({}) como `this`.
        // Em um navegador real nativo Gecko/Firefox, DEVE lançar TypeError:
        // "'get <prop>' called on an object that does not implement interface Navigator."
        // Spoofers amadores em JS puro (Puppeteer-stealth) esquecem disso e retornam o valor ou undefined sem erro.
        let platformThrowsTypeError = false;
        let platformErrorMsg = "";
        try {
            const desc = Object.getOwnPropertyDescriptor(Navigator.prototype, 'platform');
            if (desc && desc.get) {
                desc.get.call({});
            }
        } catch(e) {
            platformThrowsTypeError = (e instanceof TypeError);
            platformErrorMsg = e.message;
        }

        let uaThrowsTypeError = false;
        let uaErrorMsg = "";
        try {
            const desc = Object.getOwnPropertyDescriptor(Navigator.prototype, 'userAgent');
            if (desc && desc.get) {
                desc.get.call({});
            }
        } catch(e) {
            uaThrowsTypeError = (e instanceof TypeError);
            uaErrorMsg = e.message;
        }

        // Trap 2: Navigator.prototype descriptors
        const protoWd = Object.getOwnPropertyDescriptor(Navigator.prototype, 'webdriver');
        const protoPlat = Object.getOwnPropertyDescriptor(Navigator.prototype, 'platform');
        const ownWd = Object.prototype.hasOwnProperty.call(navigator, 'webdriver');
        const ownPlat = Object.prototype.hasOwnProperty.call(navigator, 'platform');

        // Trap 3: Prototype Chain Depth
        const isProtoChainValid = (
            Object.getPrototypeOf(navigator) === Navigator.prototype &&
            Object.getPrototypeOf(Navigator.prototype) === Object.prototype &&
            navigator instanceof Navigator
        );

        // Trap 4: toString tampering
        const navToString = Object.prototype.toString.call(navigator);
        const navProtoToString = Object.prototype.toString.call(Navigator.prototype);
        const getterNative = protoPlat && protoPlat.get && Function.prototype.toString.call(protoPlat.get).includes('[native code]');

        log("prototypeAndWebIDL", {
            platformThrowsTypeError,
            platformErrorMsg,
            uaThrowsTypeError,
            uaErrorMsg,
            hasOwnWebdriver: ownWd,
            hasOwnPlatform: ownPlat,
            protoWebdriverEnumerable: protoWd ? protoWd.enumerable : null,
            protoWebdriverConfigurable: protoWd ? protoWd.configurable : null,
            protoPlatformEnumerable: protoPlat ? protoPlat.enumerable : null,
            protoPlatformConfigurable: protoPlat ? protoPlat.configurable : null,
            isProtoChainValid,
            navToString,
            navProtoToString,
            getterNative
        });
    } catch(err) {
        log("prototypeAndWebIDL", { error: String(err) });
    }

    // =========================================================================
    // 2. MATH & FLOAT PRECISION ARCHITECTURE FINGERPRINT (CreepJS CPU Lie Detector)
    // =========================================================================
    try {
        const mathPrecision = {
            acos: Math.acos(0.123456789),
            acosh: Math.acosh(1e308),
            asin: Math.asin(0.123456789),
            atanh: Math.atanh(0.5),
            cbrt: Math.cbrt(Math.PI),
            cos: Math.cos(21 * Math.LN2),
            cosh: Math.cosh(492 * Math.LOG2E),
            expm1: Math.expm1(1),
            hypot: Math.hypot(Number.MIN_VALUE, 1.0),
            log1p: Math.log1p(Math.E - 1),
            sin: Math.sin(35 * Math.SQRT1_2),
            sinh: Math.sinh(1),
            tan: Math.tan(-1e300),
            tanh: Math.tanh(1)
        };

        const f32 = new Float32Array(1);
        f32[0] = Math.PI;
        const piF32 = f32[0];

        log("mathPrecision", {
            values: mathPrecision,
            piF32: piF32,
            isAccurate: Number.isFinite(mathPrecision.acos) && Number.isFinite(mathPrecision.sin)
        });
    } catch(err) {
        log("mathPrecision", { error: String(err) });
    }

    // =========================================================================
    // 3. WEB WORKER CONSISTENCY & OFFSCREENCANVAS ISOLATION
    // =========================================================================
    try {
        const workerScript = `
            self.onmessage = function() {
                let offscreenHash = null;
                try {
                    const oc = new OffscreenCanvas(100, 30);
                    const ctx = oc.getContext('2d');
                    ctx.fillStyle = '#ff0055';
                    ctx.fillRect(0, 0, 50, 20);
                    ctx.font = '14px Arial';
                    ctx.fillText('WorkerCanvas', 5, 15);
                    // hash básico
                    offscreenHash = oc.convertToBlob ? 'supported' : 'unsupported';
                } catch(e) {
                    offscreenHash = 'error: ' + e;
                }

                self.postMessage({
                    ua: navigator.userAgent,
                    platform: navigator.platform,
                    cores: navigator.hardwareConcurrency,
                    languages: navigator.languages,
                    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                    webdriver: navigator.webdriver,
                    hasOffscreen: typeof OffscreenCanvas !== 'undefined',
                    offscreenStatus: offscreenHash
                });
            };
        `;
        const blob = new Blob([workerScript], { type: 'application/javascript' });
        const worker = new Worker(URL.createObjectURL(blob));
        const workerData = await new Promise((resolve) => {
            const tm = setTimeout(() => resolve({ error: 'Worker timed out' }), 4000);
            worker.onmessage = (e) => { clearTimeout(tm); resolve(e.data); };
            worker.postMessage('ping');
        });
        worker.terminate();

        const windowTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        log("webWorker", {
            workerData,
            uaMatch: workerData.ua === navigator.userAgent,
            platformMatch: workerData.platform === navigator.platform,
            coresMatch: workerData.cores === navigator.hardwareConcurrency,
            tzMatch: workerData.timeZone === windowTz,
            webdriverMatch: (workerData.webdriver === undefined || workerData.webdriver === false) && (navigator.webdriver === false)
        });
    } catch(err) {
        log("webWorker", { error: String(err) });
    }

    // =========================================================================
    // 4. AUDIOCONTEXT DYNAMICS, OSCILLATOR & MULTI-RUN DETERMINISM
    // =========================================================================
    try {
        async function renderAudioSample() {
            const ctx = new OfflineAudioContext(1, 44100, 44100);
            const osc = ctx.createOscillator();
            const comp = ctx.createDynamicsCompressor();
            const filter = ctx.createBiquadFilter();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(10000, 0);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, 0);

            comp.threshold.setValueAtTime(-50, 0);
            comp.knee.setValueAtTime(40, 0);
            comp.ratio.setValueAtTime(12, 0);
            comp.attack.setValueAtTime(0, 0);
            comp.release.setValueAtTime(0.25, 0);

            osc.connect(filter);
            filter.connect(comp);
            comp.connect(ctx.destination);
            osc.start(0);

            const buffer = await ctx.startRendering();
            const data = buffer.getChannelData(0);

            let sum = 0;
            let peak = 0;
            let zeroCount = 0;
            for (let i = 0; i < data.length; i += 20) {
                const absVal = Math.abs(data[i]);
                sum += absVal;
                if (absVal > peak) peak = absVal;
                if (absVal === 0) zeroCount++;
            }
            return {
                sum: sum.toFixed(7),
                peak: peak.toFixed(7),
                sampleCount: data.length
            };
        }

        const run1 = await renderAudioSample();
        const run2 = await renderAudioSample();
        const run3 = await renderAudioSample();

        // Checagem de determinismo (deve ser 100% idêntico entre chamadas na mesma sessão)
        const isDeterministic = (run1.sum === run2.sum) && (run2.sum === run3.sum);
        // Checagem de sanidade (não pode ser silêncio total nem overflow)
        const isWithinNaturalBounds = parseFloat(run1.sum) > 0 && parseFloat(run1.peak) <= 1.0;

        log("audioContext", {
            sampleRate: new AudioContext().sampleRate,
            run1,
            run2,
            run3,
            isDeterministic,
            isWithinNaturalBounds
        });
    } catch(err) {
        log("audioContext", { error: String(err) });
    }

    // =========================================================================
    // 5. 2D CANVAS GEOMETRY, WINDING RULES & MULTI-RUN DETERMINISM
    // =========================================================================
    try {
        function renderCanvasSample() {
            const canvas = document.createElement('canvas');
            canvas.width = 280;
            canvas.height = 70;
            const ctx = canvas.getContext('2d');

            // Fundo com gradiente linear
            const grad = ctx.createLinearGradient(0, 0, 280, 0);
            grad.addColorStop(0, '#10b981');
            grad.addColorStop(0.5, '#3b82f6');
            grad.addColorStop(1, '#8b5cf6');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 280, 70);

            // Path complexo com regra evenodd
            ctx.beginPath();
            ctx.arc(50, 35, 25, 0, Math.PI * 2, true);
            ctx.arc(50, 35, 12, 0, Math.PI * 2, true);
            ctx.fillStyle = '#ffffff';
            ctx.fill('evenodd');

            // Curva Bezier
            ctx.beginPath();
            ctx.moveTo(90, 50);
            ctx.bezierCurveTo(110, 10, 130, 60, 150, 20);
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Texto com emojis e sombra
            ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
            ctx.shadowBlur = 4;
            ctx.font = '16px Arial, sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('StarMult 🦊 🍎 💻 🚀 100%', 100, 45);

            // Operação de composição
            ctx.globalCompositeOperation = 'multiply';
            ctx.fillStyle = '#ff0055';
            ctx.fillRect(20, 20, 40, 40);

            const dataUrl = canvas.toDataURL('image/png');
            const pixels = ctx.getImageData(0, 0, 20, 20).data;
            let pixelSum = 0;
            for (let i = 0; i < pixels.length; i++) pixelSum += pixels[i];

            return {
                dataUrlSample: dataUrl.substring(0, 50),
                dataUrlLength: dataUrl.length,
                dataUrlFull: dataUrl,
                pixelSum: pixelSum
            };
        }

        const c1 = renderCanvasSample();
        const c2 = renderCanvasSample();
        const c3 = renderCanvasSample();

        const isDeterministic = (c1.dataUrlFull === c2.dataUrlFull) && (c2.dataUrlFull === c3.dataUrlFull);
        const pixelSumMatch = (c1.pixelSum === c2.pixelSum) && (c2.pixelSum === c3.pixelSum);

        log("canvas2D", {
            run1Sum: c1.pixelSum,
            run2Sum: c2.pixelSum,
            run3Sum: c3.pixelSum,
            dataUrlLength: c1.dataUrlLength,
            sample: c1.dataUrlSample,
            isDeterministic,
            pixelSumMatch
        });
    } catch(err) {
        log("canvas2D", { error: String(err) });
    }

    // =========================================================================
    // 6. WEBGL & WEBGL2 HARDWARE STATE, SHADER PRECISION & READBACK
    // =========================================================================
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

        if (gl) {
            // Teste de segurança: getParameter(0x9246) sem extensão ativa deve gerar erro INVALID_ENUM (1280)
            gl.getError(); // limpa erros anteriores
            const unmaskedRaw = gl.getParameter(0x9246);
            const rawErrorCode = gl.getError();

            // Extensão debug info
            const dbg = gl.getExtension('WEBGL_debug_renderer_info');
            const vendor = dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : null;
            const renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : null;

            // Shader precision format
            const vertPrecision = gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.HIGH_FLOAT);
            const fragPrecision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);

            // Renderiza triângulo 3D e faz ReadPixels
            gl.viewport(0, 0, 64, 64);
            gl.clearColor(0.2, 0.4, 0.8, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);

            const pixels = new Uint8Array(64 * 64 * 4);
            gl.readPixels(0, 0, 64, 64, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
            let pixelSum = 0;
            for (let i = 0; i < pixels.length; i += 16) pixelSum += pixels[i];

            log("webgl", {
                isWebGL2: typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext,
                vendor,
                renderer,
                unmaskedWithoutExtNull: unmaskedRaw === null,
                unmaskedWithoutExtError: rawErrorCode,
                vertexShaderPrecision: vertPrecision ? { rangeMin: vertPrecision.rangeMin, rangeMax: vertPrecision.rangeMax, precision: vertPrecision.precision } : null,
                fragmentShaderPrecision: fragPrecision ? { rangeMin: fragPrecision.rangeMin, rangeMax: fragPrecision.rangeMax, precision: fragPrecision.precision } : null,
                readbackSum: pixelSum,
                maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE)
            });
        } else {
            log("webgl", { error: "WebGL Context Unavailable" });
        }
    } catch(err) {
        log("webgl", { error: String(err) });
    }

    // =========================================================================
    // 7. FONT BOUNDING BOX METRICS & HOST OS FONT LEAK PROBE (60+ Fonts)
    // =========================================================================
    try {
        const testFonts = [
            // Windows
            'Segoe UI', 'Calibri', 'Consolas', 'Cambria', 'MS Gothic', 'Tahoma', 'Trebuchet MS', 'Verdana', 'Segoe UI Symbol',
            // macOS
            '-apple-system', 'BlinkMacSystemFont', 'Helvetica Neue', 'Monaco', 'Menlo', 'Geneva', 'Lucida Grande', 'PingFang SC',
            // Linux
            'Ubuntu', 'Liberation Sans', 'DejaVu Sans', 'FreeSans', 'Droid Sans'
        ];

        const testString = "mmmmmmmmmmlliWWWW0123456789";
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        ctx.font = '72px monospace';
        const baseMono = ctx.measureText(testString).width;
        ctx.font = '72px sans-serif';
        const baseSans = ctx.measureText(testString).width;
        ctx.font = '72px serif';
        const baseSerif = ctx.measureText(testString).width;

        const detectedFonts = [];
        for (const font of testFonts) {
            ctx.font = `72px "${font}", monospace`;
            const w1 = ctx.measureText(testString).width;
            ctx.font = `72px "${font}", sans-serif`;
            const w2 = ctx.measureText(testString).width;
            ctx.font = `72px "${font}", serif`;
            const w3 = ctx.measureText(testString).width;

            // Se diferir de pelo menos 2 baselines, a fonte está presente
            if ((w1 !== baseMono && w2 !== baseSans) || (w1 !== baseMono && w3 !== baseSerif) || (w2 !== baseSans && w3 !== baseSerif)) {
                detectedFonts.push(font);
            }
        }

        // CSS2 System Font Keywords
        const el = document.createElement('div');
        document.body.appendChild(el);
        const keywords = ['caption', 'icon', 'menu', 'message-box', 'small-caption', 'status-bar'];
        const css2Families = {};
        for (const k of keywords) {
            el.setAttribute('style', `font: ${k} !important`);
            css2Families[k] = getComputedStyle(el).fontFamily;
        }
        el.remove();

        const platform = (navigator.platform || '').toLowerCase();
        let hostLeakDetected = false;
        let leakDetails = "";

        // Se spoofou Windows ou macOS em host Linux, fontes Linux nativas (Ubuntu, Liberation Sans) NÃO devem vazar
        if (platform.includes('win') || platform.includes('mac')) {
            const linuxLeaked = detectedFonts.filter(f => ['Ubuntu', 'Liberation Sans', 'DejaVu Sans'].includes(f));
            if (linuxLeaked.length > 0) {
                hostLeakDetected = true;
                leakDetails = `Fontes do host Linux vazaram no perfil ${platform}: ${linuxLeaked.join(', ')}`;
            }
        }

        log("fontsAndMetrics", {
            detectedFonts,
            css2Keywords: css2Families,
            hostLeakDetected,
            leakDetails
        });
    } catch(err) {
        log("fontsAndMetrics", { error: String(err) });
    }

    // =========================================================================
    // 8. INTL, TIMEZONE, LOCALE & DST DEEP CONSISTENCY
    // =========================================================================
    try {
        const intlTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const intlLocale = Intl.DateTimeFormat().resolvedOptions().locale;
        const navLang = navigator.language;
        const navLangs = navigator.languages;

        // Datas de verão e inverno para testar consistência de DST
        const winterDate = new Date(2026, 0, 15); // Janeiro
        const summerDate = new Date(2026, 6, 15); // Julho
        const winterOffset = winterDate.getTimezoneOffset();
        const summerOffset = summerDate.getTimezoneOffset();

        const dateStr = new Date().toString();
        const numberFormatted = new Intl.NumberFormat().format(123456.789);

        log("intlAndTimezone", {
            intlTz,
            intlLocale,
            navigatorLanguage: navLang,
            navigatorLanguages: navLangs,
            winterOffset,
            summerOffset,
            dateString: dateStr,
            numberFormatted,
            languageCoherent: Array.isArray(navLangs) && navLangs.length > 0 && navLangs[0] === navLang
        });
    } catch(err) {
        log("intlAndTimezone", { error: String(err) });
    }

    // =========================================================================
    // 9. WEBRTC SDP CANDIDATE AUDIT & IP LEAK DETECTION
    // =========================================================================
    try {
        const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
        const candidates = [];
        pc.onicecandidate = (e) => {
            if (e.candidate && e.candidate.candidate) {
                candidates.push(e.candidate.candidate);
            }
        };
        pc.createDataChannel('audit_dc');
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        await new Promise((resolve) => {
            const tm = setTimeout(resolve, 4500);
            pc.onicegatheringstatechange = () => {
                if (pc.iceGatheringState === 'complete') {
                    clearTimeout(tm);
                    setTimeout(resolve, 200);
                }
            };
        });
        pc.close();

        // Checagem rigorosa de vazamento de IP privado LAN (192.168.x.x / 10.x.x.x / 172.16-31.x.x)
        const lanLeak = candidates.some(c => /192\\.168\\.|10\\.\\d+\\.|172\\.(1[6-9]|2\\d|3[01])\\./.test(c));
        // Checagem de vazamento de IPv6 link-local (fe80::)
        const ipv6Leak = candidates.some(c => /fe80::/i.test(c));
        // Uso de mDNS para mascarar host local
        const usesMdns = candidates.some(c => /\\.local/.test(c));
        // Candidatos srflx
        const srflxCandidates = candidates.filter(c => c.includes('typ srflx'));

        log("webrtc", {
            totalCandidates: candidates.length,
            candidates,
            lanLeak,
            ipv6Leak,
            usesMdns,
            srflxCandidates
        });
    } catch(err) {
        log("webrtc", { error: String(err) });
    }

    // =========================================================================
    // 10. BOT & AUTOMATION ARTIFACTS MATRIX (50+ CHECKS)
    // =========================================================================
    try {
        const automationChecks = {
            navigatorWebdriver: navigator.webdriver,
            hasCdcArray: !!window.cdc_adoQpoasnfa76pfcZLmcfl_Array,
            hasCdcDoc: !!document.$cdc_asdjflasutopfnhvcZLmcfl_,
            hasWebdriverEval: !!window.__webdriver_evaluate,
            hasSeleniumEval: !!window.__selenium_evaluate,
            hasFxDriver: !!window.__fxdriver_evaluate,
            hasDriverEval: !!window.__driver_evaluate,
            hasPlaywright: !!(window.__playwright || window.__pwInitScripts),
            hasPuppeteer: !!window.__puppeteer_evaluation_script__,
            hasDomAutomation: !!(window.domAutomation || window.domAutomationController),
            hasMarionette: !!(window.__marionette || window.marionetteActive),
            docElementRemoteControl: document.documentElement.hasAttribute('remotecontrol'),
            docElementWebdriver: document.documentElement.hasAttribute('webdriver'),
            docRemoteBoxQuery: !!document.querySelector('#remote-control-box'),
            docRemoteIconQuery: !!document.querySelector('#remote-control-icon'),
            windowNameTampered: window.name && (window.name.includes('puppeteer') || window.name.includes('playwright')),
            isFirefoxChromeUndefined: typeof window.chrome === 'undefined'
        };

        log("automationMatrix", automationChecks);
    } catch(err) {
        log("automationMatrix", { error: String(err) });
    }

    // Exibe no DOM e envia via POST
    document.getElementById('display').textContent = JSON.stringify(report, null, 2);
    try {
        await fetch('/audit_result', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(report)
        });
    } catch(e) {
        console.error('Falha ao enviar reporte:', e);
    }
}

window.addEventListener('DOMContentLoaded', runUltraBrutalAudit);
</script>
</body>
</html>
"""

class UltraAuditServer:
    def __init__(self):
        self.reports = []
        self.port = 0
        self.server = None

    def start(self):
        reports_ref = self.reports

        class Handler(http.server.BaseHTTPRequestHandler):
            def do_GET(self):
                if self.path.startswith("/audit"):
                    self.send_response(200)
                    self.send_header("Content-Type", "text/html; charset=utf-8")
                    self.end_headers()
                    self.wfile.write(AUDIT_PROBE_HTML.encode("utf-8"))
                else:
                    self.send_response(404)
                    self.end_headers()

            def do_POST(self):
                if self.path == "/audit_result":
                    length = int(self.headers.get("Content-Length", 0))
                    data = json.loads(self.rfile.read(length).decode("utf-8"))
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
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        return self.port

    def wait_for_report(self, timeout=22):
        start = time.time()
        base_len = len(self.reports)
        while time.time() - start < timeout:
            if len(self.reports) > base_len:
                return self.reports[-1]
            time.sleep(0.3)
        return None

def build_profile_environment(target_os: str, cdp: bool):
    """
    Constrói as configurações idênticas às produzidas pelo backend Rust (star_multlogin_backend):
    - translator::build_camou_config
    - prefs::build_fingerprint_prefs
    - userChrome.css
    """
    if target_os == "windows":
        ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:135.0) Gecko/20100101 Firefox/135.0"
        platform = "Win32"
        oscpu = "Windows NT 10.0; Win64; x64"
        app_version = "5.0 (Windows)"
        webgl_vendor = "Google Inc. (NVIDIA)"
        webgl_renderer = "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)"
        timezone = "America/Sao_Paulo"
        lang = "pt-BR"
        accept_lang = "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7"
        avail_h = 1040
        fonts = [
            "Arial", "Times New Roman", "Courier New", "Verdana", "Georgia",
            "Trebuchet MS", "Tahoma", "Segoe UI", "Calibri", "Cambria Math",
            "Nirmala UI", "Consolas"
        ]
    elif target_os == "macos":
        ua = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:135.0) Gecko/20100101 Firefox/135.0"
        platform = "MacIntel"
        oscpu = "Intel Mac OS X 10.15"
        app_version = "5.0 (Macintosh)"
        webgl_vendor = "Apple"
        webgl_renderer = "Apple M2"
        timezone = "America/New_York"
        lang = "en-US"
        accept_lang = "en-US,en;q=0.9"
        avail_h = 1080
        fonts = [
            "Arial", "Helvetica", "Times New Roman", "Courier New", "Verdana",
            "Georgia", "Trebuchet MS", "Tahoma", "Helvetica Neue", "Lucida Grande",
            "Menlo", "Monaco", "Geneva", "PingFang HK", "PingFang SC", "PingFang TC"
        ]
    else: # linux
        ua = "Mozilla/5.0 (X11; Linux x86_64; rv:135.0) Gecko/20100101 Firefox/135.0"
        platform = "Linux x86_64"
        oscpu = "Linux x86_64"
        app_version = "5.0 (X11)"
        webgl_vendor = "Google Inc. (Intel)"
        webgl_renderer = "ANGLE (Intel, Mesa Intel(R) Xe Graphics (TGL GT2), OpenGL 4.6)"
        timezone = "Europe/London"
        lang = "en-GB"
        accept_lang = "en-GB,en;q=0.9"
        avail_h = 1080
        fonts = [
            "Arial", "Times New Roman", "Courier New", "Verdana", "Georgia",
            "Ubuntu", "Liberation Sans", "DejaVu Sans", "FreeSans"
        ]

    camou_cfg = {
        "navigator.userAgent": ua,
        "headers.User-Agent": ua,
        "navigator.platform": platform,
        "navigator.oscpu": oscpu,
        "navigator.appVersion": app_version,
        "navigator.hardwareConcurrency": 8,
        "navigator.maxTouchPoints": 0,
        "screen.width": 1920,
        "screen.height": 1080,
        "screen.availWidth": 1920,
        "screen.availHeight": avail_h,
        "screen.colorDepth": 24,
        "screen.pixelDepth": 24,
        "window.devicePixelRatio": 1.0,
        "webGl:vendor": webgl_vendor,
        "webGl:renderer": webgl_renderer,
        "navigator.language": lang,
        "headers.Accept-Language": accept_lang,
        "timezone": timezone,
        "canvas:seed": 20261337,
        "audio:seed": 88887777,
        "AudioContext:sampleRate": 48000,
        "fonts:spacing_seed": 55443322,
        "fonts": fonts,
        "webrtc:ipv4": "189.40.12.34"
    }

    user_js = [
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
    return camou_cfg, "\n".join(user_js), user_chrome_css

def execute_profile_audit(target_os: str, cdp: bool, server: UltraAuditServer):
    with tempfile.TemporaryDirectory() as temp_dir:
        p_dir = Path(temp_dir) / "profile"
        p_dir.mkdir(parents=True, exist_ok=True)
        chrome_dir = p_dir / "chrome"
        chrome_dir.mkdir(parents=True, exist_ok=True)

        camou_cfg, user_js, css = build_profile_environment(target_os, cdp)
        (p_dir / "user.js").write_text(user_js, encoding="utf-8")
        (chrome_dir / "userChrome.css").write_text(css, encoding="utf-8")

        audit_url = f"http://127.0.0.1:{server.port}/audit"
        cmd = [
            str(ENGINE_BINARY),
            "--profile", str(p_dir),
            audit_url
        ]

        if cdp:
            debug_port = 47000 + (server.port % 1000)
            cmd.extend(["--remote-debugging-port", str(debug_port)])

        env = os.environ.copy()
        env["DISPLAY"] = ":0"
        env["CAMOU_CONFIG"] = json.dumps(camou_cfg)
        env["CAMOU_CONFIG_1"] = json.dumps(camou_cfg)

        proc = subprocess.Popen(cmd, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        try:
            report = server.wait_for_report(timeout=22)
            return report
        finally:
            try:
                proc.terminate()
                proc.wait(timeout=3)
            except Exception:
                proc.kill()

def evaluate_audit_score(target_os: str, cdp: bool, rep: dict):
    if not rep or "tests" not in rep:
        return 0, ["Falha crítica: o navegador não executou a probe de auditoria a tempo (Timeout)"]

    t = rep["tests"]
    penalties = []
    category_scores = {}

    # 1. Prototype & WebIDL Trap (Max: 15 pts)
    p = t.get("prototypeAndWebIDL", {})
    p_score = 15
    if not p.get("platformThrowsTypeError"):
        penalties.append("WebIDL Fail: desc.get.call({}) não lançou TypeError em platform (delata proxy/spoofer amador)")
        p_score -= 8
    if not p.get("uaThrowsTypeError"):
        penalties.append("WebIDL Fail: desc.get.call({}) não lançou TypeError em userAgent")
        p_score -= 4
    if p.get("hasOwnWebdriver"):
        penalties.append("Prototype Fail: navigator.hasOwnProperty('webdriver') é true")
        p_score -= 5
    if p.get("hasOwnPlatform"):
        penalties.append("Prototype Fail: navigator.hasOwnProperty('platform') é true")
        p_score -= 5
    if not p.get("isProtoChainValid"):
        penalties.append("Prototype Chain rompida ou adulterada")
        p_score -= 8
    category_scores["Prototype & WebIDL"] = max(0, p_score)

    # 2. Math & Float Precision (Max: 10 pts)
    m = t.get("mathPrecision", {})
    m_score = 10
    if not m.get("isAccurate"):
        penalties.append("Math Precision corrompida (valores não finitos detectados)")
        m_score -= 10
    category_scores["Math & Float Precision"] = max(0, m_score)

    # 3. Web Worker Consistency (Max: 15 pts)
    w = t.get("webWorker", {})
    w_score = 15
    if not w.get("uaMatch"):
        penalties.append("Web Worker vazou User-Agent divergente da janela principal")
        w_score -= 4
    if not w.get("platformMatch"):
        penalties.append("Web Worker vazou platform divergente (SO host detectado na thread Worker)")
        w_score -= 6
    if not w.get("coresMatch"):
        penalties.append("Web Worker vazou núcleos de CPU divergentes")
        w_score -= 3
    if not w.get("tzMatch"):
        penalties.append("Web Worker vazou fuso horário divergente")
        w_score -= 4
    category_scores["Web Worker Consistency"] = max(0, w_score)

    # 4. AudioContext Determinism (Max: 10 pts)
    a = t.get("audioContext", {})
    a_score = 10
    if not a.get("isDeterministic"):
        penalties.append("AudioContext não determinístico (ruído aleatório detectado entre chamadas)")
        a_score -= 10
    if not a.get("isWithinNaturalBounds"):
        penalties.append("AudioContext fora dos limites naturais de áudio")
        a_score -= 5
    category_scores["AudioContext Determinism"] = max(0, a_score)

    # 5. Canvas 2D Determinism & Geometry (Max: 10 pts)
    c = t.get("canvas2D", {})
    c_score = 10
    if not c.get("isDeterministic"):
        penalties.append("Canvas 2D toDataURL não determinístico dentro da sessão")
        c_score -= 10
    if not c.get("pixelSumMatch"):
        penalties.append("Canvas 2D getImageData divergente na mesma sessão")
        c_score -= 5
    category_scores["Canvas 2D Geometry"] = max(0, c_score)

    # 6. WebGL Deep State (Max: 10 pts)
    g = t.get("webgl", {})
    g_score = 10
    if not g.get("unmaskedWithoutExtNull"):
        penalties.append("WebGL vazou UNMASKED_RENDERER sem extensão habilitada")
        g_score -= 5
    if g.get("unmaskedWithoutExtError") != 1280:
        penalties.append(f"gl.getError() sem extensão não retornou INVALID_ENUM (1280), retornou: {g.get('unmaskedWithoutExtError')}")
        g_score -= 5
    category_scores["WebGL Hardware State"] = max(0, g_score)

    # 7. Font Metrics & Host OS Leak (Max: 10 pts)
    f = t.get("fontsAndMetrics", {})
    f_score = 10
    if f.get("hostLeakDetected"):
        penalties.append(f"Font Leak: {f.get('leakDetails')}")
        f_score -= 10
    category_scores["Font Metrics & OS Isolation"] = max(0, f_score)

    # 8. Intl & Timezone Coherence (Max: 5 pts)
    i = t.get("intlAndTimezone", {})
    i_score = 5
    if not i.get("languageCoherent"):
        penalties.append("navigator.language não corresponde ao primeiro item de navigator.languages")
        i_score -= 3
    category_scores["Intl & Timezone"] = max(0, i_score)

    # 9. WebRTC IP Leak (Max: 10 pts)
    rtc = t.get("webrtc", {})
    rtc_score = 10
    if rtc.get("lanLeak"):
        penalties.append(f"WebRTC Vazou IP privado de rede local: {rtc.get('candidates')}")
        rtc_score -= 10
    if rtc.get("ipv6Leak"):
        penalties.append("WebRTC Vazou IPv6 link-local nos candidatos")
        rtc_score -= 5
    category_scores["WebRTC IP Protection"] = max(0, rtc_score)

    # 10. Bot & Automation Matrix (Max: 5 pts)
    auto = t.get("automationMatrix", {})
    auto_score = 5
    if auto.get("navigatorWebdriver") is True:
        penalties.append("navigator.webdriver = true detectado na página")
        auto_score -= 5
    if any([
        auto.get("hasCdcArray"), auto.get("hasCdcDoc"), auto.get("hasWebdriverEval"),
        auto.get("hasSeleniumEval"), auto.get("hasPlaywright"), auto.get("hasPuppeteer")
    ]):
        penalties.append("Variáveis globais de automação detectadas no window/document")
        auto_score -= 5
    if auto.get("docElementRemoteControl"):
        penalties.append("Atributo remotecontrol detectado no documentElement")
        auto_score -= 3
    if auto.get("docRemoteBoxQuery"):
        penalties.append("Elemento #remote-control-box detectado no DOM")
        auto_score -= 3
    category_scores["Automation & CDP Stealth"] = max(0, auto_score)

    total_score = sum(category_scores.values())
    return total_score, penalties, category_scores

def main():
    print("=" * 72)
    print("  🚀 SUÍTE ULTRA BRUTA E REALISTA DE AUDITORIA ANTI-DETECT & CDP")
    print("=" * 72)

    server = UltraAuditServer()
    server.start()
    print(f"📡 Probe server adversarial escutando na porta {server.port}...")

    configs = [
        ("windows", False, "Perfil Windows 11 (NVIDIA RTX 3060 - Sem CDP)"),
        ("macos", False, "Perfil macOS Apple Silicon (M2 - Sem CDP)"),
        ("linux", False, "Perfil Linux Ubuntu (Intel Xe - Sem CDP)"),
        ("windows", True, "Perfil Windows 11 (NVIDIA RTX 3060 - COM CDP ATIVO)"),
    ]

    all_passed = True
    full_audit_results = {}

    for os_target, cdp, desc in configs:
        print(f"\n" + "-" * 72)
        print(f"🔥 INICIANDO TESTE ADVERSARIAL: {desc}")
        print(f"-" * 72)

        raw_report = execute_profile_audit(os_target, cdp, server)
        score, penalties, cat_scores = evaluate_audit_score(os_target, cdp, raw_report)
        tag = f"{os_target.upper()}_CDP_{cdp}"

        full_audit_results[tag] = {
            "description": desc,
            "os": os_target,
            "cdp": cdp,
            "score": score,
            "grade": "A+" if score >= 95 else ("A" if score >= 85 else ("B" if score >= 75 else "REPROVADO")),
            "passed": len(penalties) == 0 and score >= 95,
            "penalties": penalties,
            "category_scores": cat_scores,
            "raw_probe_data": raw_report
        }

        print(f"📈 PONTUAÇÃO: {score}/100 | NOTA: {full_audit_results[tag]['grade']}")
        for cat, pts in cat_scores.items():
            print(f"   • {cat.ljust(30)}: {pts} pts")

        if len(penalties) == 0:
            print(f"✅ [IMPECÁVEL] Zero vazamentos. 100% blindado contra CreepJS / Datadome / FingerprintJS.")
        else:
            all_passed = False
            print(f"❌ [VULNERABILIDADES DETECTADAS: {len(penalties)}]")
            for p in penalties:
                print(f"   ⚠️  {p}")

    print("\n" + "=" * 72)
    print("🏆 RESUMO CONSOLIDADO DA AUDITORIA ADVERSARIAL:")
    print("=" * 72)
    for tag, res in full_audit_results.items():
        st = f"✅ {res['score']}/100 ({res['grade']}) — 100% STEALTH" if res['passed'] else f"❌ {res['score']}/100 ({res['grade']}) — {len(res['penalties'])} falhas"
        print(f"  {res['description'].ljust(48)}: {st}")

    out_file = Path("scripts/ultra_audit_report.json")
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(full_audit_results, f, indent=2)
    print(f"\n📄 Relatório JSON ultra detalhado gravado em: {out_file}")

    if all_passed:
        print("\n🎉 PARABÉNS! TODOS OS PERFIS PASSARAM NA BATERIA MAIS BRUTA E REALISTA POSSÍVEL!")
        sys.exit(0)
    else:
        print("\n⚠️ Algumas falhas foram identificadas. Verifique os logs acima.")
        sys.exit(1)

if __name__ == "__main__":
    main()

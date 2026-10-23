/**
 * Fury Vault & 2FA Extension Popup Script
 * 100% Client-Side & Local: RFC 6238 TOTP via WebCrypto API
 */

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Decode(input) {
  const clean = (input || "").replace(/[\s=]/g, "").toUpperCase();
  let bits = "";
  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32.indexOf(clean[i]);
    if (idx === -1) continue;
    bits += idx.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return new Uint8Array(bytes);
}

async function computeTotp(secret, nowMs = Date.now(), period = 30, digits = 6) {
  try {
    const keyBytes = base32Decode(secret);
    if (!keyBytes.length) return null;

    const key = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "HMAC", hash: "SHA-1" },
      false,
      ["sign"]
    );

    const seconds = Math.floor(nowMs / 1000);
    const counter = Math.floor(seconds / period);
    const buf = new ArrayBuffer(8);
    const view = new DataView(buf);
    view.setBigUint64(0, BigInt(counter));

    const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, buf));
    const offset = sig[sig.length - 1] & 0x0f;
    const bin =
      ((sig[offset] & 0x7f) << 24) |
      ((sig[offset + 1] & 0xff) << 16) |
      ((sig[offset + 2] & 0xff) << 8) |
      (sig[offset + 3] & 0xff);

    const rawCode = (bin % (10 ** digits)).toString().padStart(digits, "0");
    const formattedCode = `${rawCode.slice(0, 3)} ${rawCode.slice(3)}`;
    const secondsRemaining = period - (seconds % period);

    return { rawCode, formattedCode, secondsRemaining, period };
  } catch (err) {
    console.error("Falha ao calcular TOTP:", err);
    return null;
  }
}

function copyToClipboard(text, buttonElement) {
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    const originalText = buttonElement.innerHTML;
    buttonElement.classList.add("copied");
    buttonElement.innerHTML = `✓ Copiado!`;
    setTimeout(() => {
      buttonElement.classList.remove("copied");
      buttonElement.innerHTML = originalText;
    }, 2000);
  }).catch((err) => {
    console.warn("Erro ao copiar para clipboard:", err);
  });
}

// Global active timers for accounts with 2FA
let activeTotpAccounts = [];

function setupTotpLoop() {
  async function updateAllTotp() {
    for (const item of activeTotpAccounts) {
      const res = await computeTotp(item.secret);
      if (!res) continue;

      if (item.digitsEl) {
        item.digitsEl.textContent = res.formattedCode;
      }
      if (item.btnEl) {
        item.btnEl.setAttribute("data-code", res.rawCode);
      }
      if (item.timerEl) {
        item.timerEl.textContent = `${res.secondsRemaining}s`;
        item.timerEl.className = "totp-timer" + (res.secondsRemaining <= 5 ? " danger" : res.secondsRemaining <= 10 ? " warning" : "");
      }
      if (item.barEl) {
        const pct = (res.secondsRemaining / res.period) * 100;
        item.barEl.style.width = `${pct}%`;
        item.barEl.className = "totp-bar" + (res.secondsRemaining <= 5 ? " danger" : res.secondsRemaining <= 10 ? " warning" : "");
      }
    }
  }

  updateAllTotp();
  setInterval(updateAllTotp, 1000);
}

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("accounts-container");
  const profilePill = document.getElementById("profile-pill");

  try {
    const getUrlFn = (typeof browser !== "undefined" && browser.runtime?.getURL) 
      ? browser.runtime.getURL 
      : chrome.runtime.getURL;

    const res = await fetch(getUrlFn("credentials.json"), { cache: "no-store" });
    if (!res.ok) throw new Error("Arquivo credentials.json não encontrado");
    
    const data = await res.json();
    profilePill.textContent = data.profileName || "Perfil Ativo";
    profilePill.title = data.profileName || "Perfil Ativo";

    const accounts = Array.isArray(data.accounts) ? data.accounts : [];
    if (!accounts.length) {
      container.innerHTML = `
        <div class="empty-state">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6C7082" stroke-width="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          <span>Nenhuma conta configurada na aba Plataforma deste perfil.</span>
        </div>
      `;
      return;
    }

    container.innerHTML = "";

    accounts.forEach((acc, idx) => {
      const platformName = acc.platform || "Outro";
      const domain = acc.customDomain || acc.platform || "";
      const username = acc.username || "";
      const password = acc.password || "";
      const twoFaKey = acc.twoFactorKey || "";

      const card = document.createElement("div");
      card.className = "account-card";

      // Card Header
      const cardHeader = document.createElement("div");
      cardHeader.className = "card-header";
      cardHeader.innerHTML = `
        <div class="platform-title">
          <span>${platformName}</span>
        </div>
        ${domain ? `<span class="platform-tag">${domain}</span>` : ""}
      `;
      card.appendChild(cardHeader);

      // Username row
      if (username) {
        const userRow = document.createElement("div");
        userRow.className = "field-row";
        userRow.innerHTML = `
          <span class="field-label">Nome de Utilizador / E-mail</span>
          <div class="field-content">
            <span class="field-value">${username}</span>
            <div class="field-actions">
              <button type="button" class="btn-copy" data-copy="${username}">Copiar</button>
            </div>
          </div>
        `;
        const btn = userRow.querySelector(".btn-copy");
        btn.addEventListener("click", () => copyToClipboard(username, btn));
        card.appendChild(userRow);
      }

      // Password row
      if (password) {
        const passRow = document.createElement("div");
        passRow.className = "field-row";
        passRow.innerHTML = `
          <span class="field-label">Senha</span>
          <div class="field-content">
            <span class="field-value pass-text">••••••••</span>
            <div class="field-actions">
              <button type="button" class="btn-icon btn-toggle-pass" title="Ver / Ocultar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
              <button type="button" class="btn-copy" data-copy="${password}">Copiar</button>
            </div>
          </div>
        `;
        const passTextEl = passRow.querySelector(".pass-text");
        const toggleBtn = passRow.querySelector(".btn-toggle-pass");
        const copyBtn = passRow.querySelector(".btn-copy");

        let isRevealed = false;
        toggleBtn.addEventListener("click", () => {
          isRevealed = !isRevealed;
          passTextEl.textContent = isRevealed ? password : "••••••••";
        });

        copyBtn.addEventListener("click", () => copyToClipboard(password, copyBtn));
        card.appendChild(passRow);
      }

      // 2FA TOTP Box
      if (twoFaKey) {
        const totpBox = document.createElement("div");
        totpBox.className = "totp-box";
        totpBox.innerHTML = `
          <div class="totp-top">
            <span class="totp-badge">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              Código 2FA
            </span>
            <span class="totp-timer" id="timer-${idx}">30s</span>
          </div>
          <div class="totp-display">
            <span class="totp-digits" id="digits-${idx}">--- ---</span>
            <button type="button" class="btn-totp-copy" id="totp-btn-${idx}">
              Copiar 2FA
            </button>
          </div>
          <div class="totp-bar-container">
            <div class="totp-bar" id="bar-${idx}" style="width: 100%"></div>
          </div>
        `;

        const digitsEl = totpBox.querySelector(`#digits-${idx}`);
        const timerEl = totpBox.querySelector(`#timer-${idx}`);
        const barEl = totpBox.querySelector(`#bar-${idx}`);
        const totpBtn = totpBox.querySelector(`#totp-btn-${idx}`);

        totpBtn.addEventListener("click", () => {
          const codeToCopy = totpBtn.getAttribute("data-code");
          if (codeToCopy) copyToClipboard(codeToCopy, totpBtn);
        });

        activeTotpAccounts.push({
          secret: twoFaKey,
          digitsEl,
          timerEl,
          barEl,
          btnEl: totpBtn
        });

        card.appendChild(totpBox);
      }

      container.appendChild(card);
    });

    if (activeTotpAccounts.length > 0) {
      setupTotpLoop();
    }

  } catch (err) {
    console.error("Erro ao carregar credenciais no popup:", err);
    container.innerHTML = `
      <div class="empty-state">
        <span>Não foi possível carregar as credenciais deste perfil.</span>
      </div>
    `;
  }
});

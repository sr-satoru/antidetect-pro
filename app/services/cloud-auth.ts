/**
 * Módulo de Comunicação com o Servidor de Nuvem Fury
 * Conecta o aplicativo desktop ao backend da nuvem via Device-Code Flow e Proof-of-Work (PoW).
 */

export const DEFAULT_CLOUD_URL =
  (import.meta as any).env?.VITE_FURY_CLOUD_URL || 'http://localhost:12342';

export const DEFAULT_WEB_PORTAL_URL =
  (import.meta as any).env?.VITE_FURY_WEB_URL || 'http://localhost:3000/auth/link';

export interface DeviceCodeChallenge {
  challengeId: string;
  prefix: string;
  difficulty: number;
}

export interface DeviceCodeExchangeResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email?: string;
    plan: string;
    profileLimit: number;
  };
}

/**
 * 1. Solicita o desafio de Proof-of-Work (PoW) ao servidor da nuvem
 */
export async function fetchChallenge(
  serverUrl: string = DEFAULT_CLOUD_URL,
): Promise<DeviceCodeChallenge> {
  const cleanUrl = serverUrl.replace(/\/+$/, '');
  const res = await fetch(`${cleanUrl}/api/auth/device-code/challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    throw new Error(
      `Não foi possível conectar ao servidor da nuvem em ${cleanUrl} (${res.status})`,
    );
  }

  return (await res.json()) as DeviceCodeChallenge;
}

/**
 * 2. Resolve o Proof-of-Work no navegador via Web Crypto API nativa
 */
export async function solveProofOfWork(
  prefix: string,
  difficulty: number,
): Promise<number> {
  const target = '0'.repeat(difficulty);
  const encoder = new TextEncoder();
  let nonce = 0;

  while (true) {
    const data = encoder.encode(`${prefix}${nonce}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    if (hashHex.startsWith(target)) {
      return nonce;
    }
    nonce++;
    if (nonce > 10_000_000) {
      throw new Error('Tempo limite excedido ao resolver o Proof-of-Work');
    }
  }
}

/**
 * 3. Troca o código digitado + solução do PoW pelo token JWT e dados do usuário
 */
export async function exchangeDeviceCode(
  code: string,
  challengeId: string,
  nonce: number,
  serverUrl: string = DEFAULT_CLOUD_URL,
): Promise<DeviceCodeExchangeResponse> {
  const cleanUrl = serverUrl.replace(/\/+$/, '');
  const res = await fetch(`${cleanUrl}/api/auth/device-code/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: code.trim().toUpperCase(),
      challengeId,
      nonce,
    }),
  });

  if (!res.ok) {
    let errorMsg = `Código inválido ou expirado (${res.status})`;
    try {
      const json = await res.json();
      if (json.message) errorMsg = json.message;
    } catch {}
    throw new Error(errorMsg);
  }

  return (await res.json()) as DeviceCodeExchangeResponse;
}

/**
 * 4. Atalho de desenvolvimento: gera um código de teste na API
 */
export async function createQuickTestCode(
  serverUrl: string = DEFAULT_CLOUD_URL,
): Promise<string> {
  const cleanUrl = serverUrl.replace(/\/+$/, '');
  const res = await fetch(`${cleanUrl}/api/auth/device-code/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: `user_${Date.now().toString(36)}`,
      email: 'usuario@fury.local',
      plan: 'pro',
    }),
  });

  if (!res.ok) {
    throw new Error(`Falha ao gerar código de teste no servidor (${res.status})`);
  }

  const json = await res.json();
  return json.code;
}

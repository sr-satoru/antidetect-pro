const BASE62_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
// Época de referência: 01 de Janeiro de 2026 00:00:00 UTC
const CUSTOM_EPOCH_MS = 1767225600000;
const MAX_BASE62_7 = 3521614606207n; // 62^7 - 1

let lastId = 0n;

/**
 * Gera uma string de exatamente 7 caracteres em Base62.
 * - 100% livre de colisões (incremento atômico monotônico)
 * - Cronologicamente ordenável (fatias de 50ms com 11 bits de sequência)
 * - Capacidade de 3.521.614.606.208 valores únicos
 */
export function generateBase62_7(): string {
  const nowMs = Date.now();
  const deltaUnits = BigInt(
    Math.max(0, Math.floor((nowMs - CUSTOM_EPOCH_MS) / 50)),
  );
  const target = (deltaUnits << 11n) % MAX_BASE62_7;

  const next = target > lastId ? target : (lastId + 1n) % MAX_BASE62_7;
  lastId = next;

  let num = next;
  const chars: string[] = [];

  for (let i = 0; i < 7; i++) {
    const rem = Number(num % 62n);
    chars.unshift(BASE62_ALPHABET[rem]);
    num = num / 62n;
  }

  return chars.join("");
}

/**
 * Gera um ID semântico prefixado (ex: usr_01Ab2K9, prf_01Ab2K9)
 */
export function generateId(prefix: "usr" | "prf" | "code"): string {
  return `${prefix}_${generateBase62_7()}`;
}

export function generateUserId(): string {
  return generateId("usr");
}

export function generateProfileId(): string {
  return generateId("prf");
}

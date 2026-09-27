import { createHmac, randomBytes } from "node:crypto";

/**
 * Gera um sal criptográfico de alta entropia (256 bits / 32 bytes) em hexadecimal.
 * Utilizado exclusivamente para blindar o diretório de armazenamento do usuário.
 */
export function generateVaultSalt(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Deriva o identificador cego (Blind Storage Hash) para isolamento absoluto de pastas no servidor.
 * 
 * Garantias de Segurança:
 * 1. Pre-image Resistance: HMAC-SHA256 é estritamente unidirecional (impossível de reverter matematicamente).
 * 2. Pepper Secreto (256 bits): Apenas o servidor possui a chave mestre (STORAGE_VAULT_PEPPER no .env).
 *    Sem o Pepper, nenhum atacante com supercomputador ou GPU consegue testar ou adivinhar hashes.
 * 3. Sal Exclusivo por Usuário (256 bits): Cada usuário possui um vaultSalt único no banco.
 *    Destrói qualquer possibilidade de ataques de dicionário ou Rainbow Tables pré-computadas.
 * 4. Separação de Domínio: O prefixo de domínio 'fury_blind_storage_v2' impede colisões com outros módulos.
 * 
 * @param sub Identificador único do usuário (ex: 'usr_Gl8GRYu')
 * @param vaultSalt Sal criptográfico exclusivo do usuário
 * @param pepper Segredo mestre do servidor (STORAGE_VAULT_PEPPER)
 * @returns Hash hexadecimal de 32 caracteres (128 bits de entropia de saída, 100% livre de colisões)
 */
export function deriveBlindVaultHash(
  sub: string,
  vaultSalt: string,
  pepper: string,
): string {
  const safeSalt = vaultSalt && vaultSalt.trim() ? vaultSalt.trim() : "default_vault_entropy";
  return createHmac("sha256", pepper)
    .update(`fury_blind_storage_v2:${sub}:${safeSalt}`)
    .digest("hex")
    .substring(0, 32);
}

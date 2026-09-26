import { randomBytes, createHash } from "node:crypto";
import { Injectable, BadRequestException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as jwt from "jsonwebtoken";

interface PendingChallenge {
  challengeId: string;
  prefix: string;
  difficulty: number;
  createdAt: number;
}

interface PendingDeviceCode {
  code: string;
  userId: string;
  email: string;
  plan: string;
  createdAt: number;
  consumed: boolean;
}

@Injectable()
export class AuthService {
  private challenges = new Map<string, PendingChallenge>();
  private deviceCodes = new Map<string, PendingDeviceCode>();

  constructor(private configService: ConfigService) {}

  /**
   * 1. Gera um desafio de Proof-of-Work (PoW) para proteger contra ataques de força bruta
   */
  createChallenge(): { challengeId: string; prefix: string; difficulty: number } {
    const challengeId = randomBytes(16).toString("hex");
    const prefix = randomBytes(8).toString("hex");
    const difficulty = 3; // 3 zeros no início do hash (rápido para desktop, custoso para bots)

    this.challenges.set(challengeId, {
      challengeId,
      prefix,
      difficulty,
      createdAt: Date.now(),
    });

    // Limpa desafios antigos (> 5 minutos)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    for (const [id, c] of this.challenges.entries()) {
      if (c.createdAt < fiveMinutesAgo) {
        this.challenges.delete(id);
      }
    }

    return { challengeId, prefix, difficulty };
  }

  /**
   * 2. Cria um código de dispositivo quando o usuário clica em "Vincular Dispositivo" no site web
   */
  createDeviceCode(userId: string, email: string, plan = "pro"): { code: string; expiresInSeconds: number } {
    // Código de 8 caracteres legível (ex: FURY-9A2B)
    const raw = randomBytes(4).toString("hex").toUpperCase();
    const code = `FURY-${raw}`;

    this.deviceCodes.set(code, {
      code,
      userId,
      email,
      plan,
      createdAt: Date.now(),
      consumed: false,
    });

    return { code, expiresInSeconds: 600 };
  }

  /**
   * 3. Troca o código do dispositivo + solução do desafio PoW por tokens JWT reais
   */
  exchangeDeviceCode(
    code: string,
    challengeId: string,
    nonce: number,
  ): { accessToken: string; refreshToken: string; user: Record<string, unknown> } {
    // Valida o desafio PoW
    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      throw new BadRequestException("Desafio PoW expirado ou inválido");
    }

    // Verifica a solução do PoW: SHA256(prefix + nonce) deve começar com '0' * difficulty
    const hash = createHash("sha256")
      .update(`${challenge.prefix}${nonce}`)
      .digest("hex");

    const targetPrefix = "0".repeat(challenge.difficulty);
    if (!hash.startsWith(targetPrefix)) {
      throw new BadRequestException("Solução de Proof-of-Work incorreta");
    }

    // Consome o desafio para não ser reutilizado
    this.challenges.delete(challengeId);

    // Valida o código do dispositivo
    const deviceCode = this.deviceCodes.get(code);
    if (!deviceCode || deviceCode.consumed) {
      throw new UnauthorizedException("Código de vinculação inválido ou já utilizado");
    }

    // Expira em 10 minutos
    if (Date.now() - deviceCode.createdAt > 10 * 60 * 1000) {
      this.deviceCodes.delete(code);
      throw new UnauthorizedException("Código de vinculação expirado");
    }

    deviceCode.consumed = true;

    // Gera os tokens JWT
    const jwtSecret = this.configService.get<string>("JWT_SECRET", "fury_default_jwt_secret_dev_key");

    const payload = {
      sub: deviceCode.userId,
      email: deviceCode.email,
      plan: deviceCode.plan,
      profileLimit: 100, // Cota de perfis
    };

    const accessToken = jwt.sign(payload, jwtSecret, { expiresIn: "7d" });
    const refreshToken = jwt.sign({ sub: deviceCode.userId, tokenType: "refresh" }, jwtSecret, {
      expiresIn: "30d",
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: deviceCode.userId,
        email: deviceCode.email,
        plan: deviceCode.plan,
        profileLimit: 100,
      },
    };
  }
}

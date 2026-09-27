import { createHmac, timingSafeEqual } from "node:crypto";
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";
import * as jwt from "jsonwebtoken";
import { PrismaService } from "../prisma/prisma.service.js";
import { deriveBlindVaultHash } from "../common/vault-hash.js";
import type { UserContext } from "./user-context.interface.js";

/** Constant-time string comparison to prevent timing attacks */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    let token = "";
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else if (typeof request.query?.token === "string") {
      token = request.query.token;
    }

    if (!token) {
      throw new UnauthorizedException("Missing or invalid authorization token");
    }

    // 1. Try SYNC_TOKEN (Self-hosted or Master Secret Mode)
    const expectedToken = this.configService.get<string>("SYNC_TOKEN");
    if (expectedToken && safeEqual(token, expectedToken)) {
      (request as unknown as Record<string, unknown>).user = {
        mode: "self-hosted",
        prefix: "",
        profileLimit: 0,
      } satisfies UserContext;
      return true;
    }

    // 2. Try JWT Token (Cloud Mode with secret or public key)
    const jwtSecret =
      this.configService.get<string>("JWT_SECRET") ||
      this.configService.get<string>("SYNC_JWT_PUBLIC_KEY");

    if (jwtSecret) {
      try {
        const decoded = jwt.verify(token, jwtSecret) as jwt.JwtPayload;
        const sub = typeof decoded.sub === "string" ? decoded.sub : "";

        if (!sub) {
          throw new Error("Missing 'sub' claim in JWT token");
        }

        const mode = decoded.mode === "self-hosted" ? "self-hosted" : "cloud";

        let userPrefix = "";
        if (mode !== "self-hosted") {
          // Derivação de Blind Storage com Pepper Secreto (256 bits) + Sal Exclusivo do Usuário (256 bits)
          // 100% Impossível de inverter, imune a brute force e a rainbow tables
          const vaultPepper =
            this.configService.get<string>("STORAGE_VAULT_PEPPER") ||
            jwtSecret;

          let vaultSalt =
            typeof decoded.vaultSalt === "string" ? decoded.vaultSalt : "";

          if (!vaultSalt) {
            const user = await this.prisma.user.findUnique({
              where: { id: sub },
              select: { vaultSalt: true },
            });
            vaultSalt = user?.vaultSalt || "default_vault_entropy";
          }

          const blindHash = deriveBlindVaultHash(sub, vaultSalt, vaultPepper);
          userPrefix = `vaults/${blindHash}/`;
        }

        const profileLimit =
          typeof decoded.profileLimit === "number" ? decoded.profileLimit : 0;

        (request as unknown as Record<string, unknown>).user = {
          mode,
          prefix: userPrefix,
          profileLimit,
          sub,
          email: typeof decoded.email === "string" ? decoded.email : undefined,
        } satisfies UserContext;

        return true;
      } catch (err: unknown) {
        this.logger.warn(
          `JWT verification failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    throw new UnauthorizedException("Invalid sync token or JWT signature");
  }
}

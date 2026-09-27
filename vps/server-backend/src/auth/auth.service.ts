import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as jwt from "jsonwebtoken";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service.js";
import { generateUserId } from "../common/id-generator.js";
import { generateVaultSalt } from "../common/vault-hash.js";

export interface DecodedChallenge {
  action: "login" | "register";
  state: string;
  exp: number;
}

export interface WebRegisterDto {
  name?: string;
  email: string;
  password: string;
  token: string;
  redirectUri?: string;
}

export interface WebLoginDto {
  email: string;
  password: string;
  token: string;
  redirectUri?: string;
}

export interface ExchangeCodeDto {
  code: string;
  state: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  private getOauthSecret(): string {
    return this.configService.get<string>(
      "OAUTH_SECRET",
      "fury_oauth_secret_shared_with_rust_daemon",
    );
  }

  private getJwtSecret(): string {
    return this.configService.get<string>(
      "JWT_SECRET",
      "fury_super_jwt_secret_dev_key_12345",
    );
  }

  /**
   * Valida o token assinado gerado pelo backend Rust (action, state, exp)
   */
  validateChallengeToken(tokenString: string): DecodedChallenge {
    if (!tokenString || !tokenString.includes(".")) {
      throw new BadRequestException("Token de desafio com formato inválido");
    }

    const [payloadB64, signature] = tokenString.split(".");
    if (!payloadB64 || !signature) {
      throw new BadRequestException("Partes do token ausentes");
    }

    const secret = this.getOauthSecret();
    const expectedSignature = createHmac("sha256", secret)
      .update(payloadB64)
      .digest("hex");

    const expectedBuf = Buffer.from(expectedSignature, "utf8");
    const sigBuf = Buffer.from(signature, "utf8");

    if (
      expectedBuf.length !== sigBuf.length ||
      !timingSafeEqual(expectedBuf, sigBuf)
    ) {
      throw new UnauthorizedException("Assinatura do token de autenticação inválida");
    }

    let payload: DecodedChallenge;
    try {
      const jsonStr = Buffer.from(payloadB64, "base64url").toString("utf8");
      payload = JSON.parse(jsonStr);
    } catch {
      throw new BadRequestException("Carga do token corrompida");
    }

    if (!payload.action || !["login", "register"].includes(payload.action)) {
      throw new BadRequestException("Ação de autenticação desconhecida");
    }

    if (!payload.state) {
      throw new BadRequestException("Parâmetro de estado ausente no token");
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < nowSeconds) {
      throw new UnauthorizedException("Token de autenticação expirado. Solicite novo link no aplicativo.");
    }

    return payload;
  }

  /**
   * Registro Web com persistência no SQLite via Prisma
   */
  async webRegister(dto: WebRegisterDto) {
    const challenge = this.validateChallengeToken(dto.token);
    if (challenge.action !== "register") {
      throw new BadRequestException(
        "Este link de acesso foi gerado para Entrar (Login), não para Criar Conta.",
      );
    }

    if (!dto.email || !dto.password) {
      throw new BadRequestException("Email e senha são obrigatórios");
    }

    if (dto.password.length < 6) {
      throw new BadRequestException("A senha deve ter no mínimo 6 caracteres");
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException("Já existe uma conta cadastrada com este email.");
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const userId = generateUserId();
    const vaultSalt = generateVaultSalt();
    const user = await this.prisma.user.create({
      data: {
        id: userId,
        email: dto.email.toLowerCase().trim(),
        passwordHash,
        name: dto.name?.trim() || dto.email.split("@")[0],
        plan: "free",
        maxProfiles: 10,
        profileCount: 0,
        vaultSalt,
      },
    });

    const code = randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos

    await this.prisma.authCode.create({
      data: {
        code,
        action: "register",
        state: challenge.state,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      success: true,
      code,
      state: challenge.state,
      redirectUri: dto.redirectUri || "http://127.0.0.1:8000/api/auth/callback",
    };
  }

  /**
   * Login Web com validação de senha no SQLite via Prisma
   */
  async webLogin(dto: WebLoginDto) {
    const challenge = this.validateChallengeToken(dto.token);
    if (challenge.action !== "login") {
      throw new BadRequestException(
        "Este link de acesso foi gerado para Criar Conta, não para Entrar.",
      );
    }

    if (!dto.email || !dto.password) {
      throw new BadRequestException("Email e senha são obrigatórios");
    }

    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user) {
      throw new UnauthorizedException("Email ou senha incorretos");
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException("Email ou senha incorretos");
    }

    const code = randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos

    await this.prisma.authCode.create({
      data: {
        code,
        action: "login",
        state: challenge.state,
        userId: user.id,
        expiresAt,
      },
    });

    return {
      success: true,
      code,
      state: challenge.state,
      redirectUri: dto.redirectUri || "http://127.0.0.1:8000/api/auth/callback",
    };
  }

  /**
   * Troca o AuthCode pelo JWT definitivo no loopback (RFC 8252)
   */
  async exchangeCode(dto: ExchangeCodeDto) {
    if (!dto.code || !dto.state) {
      throw new BadRequestException("Código de autorização e estado são obrigatórios");
    }

    const authCode = await this.prisma.authCode.findUnique({
      where: { code: dto.code },
      include: { user: true },
    });

    if (!authCode) {
      throw new UnauthorizedException("Código de autorização inexistente ou inválido");
    }

    if (authCode.state !== dto.state) {
      throw new UnauthorizedException("Parâmetro de estado não corresponde (possível ataque CSRF)");
    }

    if (authCode.expiresAt < new Date()) {
      throw new UnauthorizedException("Código de autorização expirado");
    }

    // Marca como consumido caso ainda não tenha sido
    if (!authCode.consumed) {
      await this.prisma.authCode.update({
        where: { id: authCode.id },
        data: { consumed: true },
      });
    }

    const user = authCode.user;
    let vaultSalt = user.vaultSalt;
    if (!vaultSalt) {
      vaultSalt = generateVaultSalt();
      await this.prisma.user.update({
        where: { id: user.id },
        data: { vaultSalt },
      });
    }

    const jwtSecret = this.getJwtSecret();

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      maxProfiles: user.maxProfiles,
      vaultSalt,
    };

    const accessToken = jwt.sign(payload, jwtSecret, { expiresIn: "5m" });
    const refreshToken = jwt.sign({ sub: user.id, tokenType: "refresh" }, jwtSecret, {
      expiresIn: "30d",
    });

    return {
      success: true,
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        max_profiles: user.maxProfiles,
        profile_count: user.profileCount,
      },
    };
  }

  /**
   * Renova o Access Token (5 minutos) utilizando o Refresh Token (30 dias)
   */
  async refreshAccessToken(dto: RefreshTokenDto) {
    if (!dto.refreshToken) {
      throw new BadRequestException("Refresh token é obrigatório");
    }

    const jwtSecret = this.getJwtSecret();
    let decoded: any;
    try {
      decoded = jwt.verify(dto.refreshToken, jwtSecret);
    } catch {
      throw new UnauthorizedException("Refresh token inválido ou expirado");
    }

    if (decoded.tokenType !== "refresh" || !decoded.sub) {
      throw new UnauthorizedException("Tipo de token inválido para renovação");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: decoded.sub },
    });

    if (!user) {
      throw new UnauthorizedException("Usuário não encontrado");
    }

    let vaultSalt = user.vaultSalt;
    if (!vaultSalt) {
      vaultSalt = generateVaultSalt();
      await this.prisma.user.update({
        where: { id: user.id },
        data: { vaultSalt },
      });
    }

    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      maxProfiles: user.maxProfiles,
      vaultSalt,
    };

    const newAccessToken = jwt.sign(payload, jwtSecret, { expiresIn: "5m" });

    return {
      success: true,
      accessToken: newAccessToken,
      expiresIn: 300, // 5 minutos em segundos
    };
  }
}

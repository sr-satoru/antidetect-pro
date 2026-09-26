import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { AuthService } from "./auth.service.js";

class ChallengeExchangeDto {
  code: string;
  challengeId: string;
  nonce: number;
}

class CreateDeviceCodeDto {
  userId: string;
  email: string;
  plan?: string;
}

@Controller("api/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Endpoint chamado pelo Desktop para solicitar o desafio de Proof-of-Work
   * POST /api/auth/device-code/challenge
   */
  @Post("device-code/challenge")
  @HttpCode(200)
  getChallenge() {
    return this.authService.createChallenge();
  }

  /**
   * Endpoint chamado pelo painel Web / Dashboard para gerar o código que o usuário digita no app
   * POST /api/auth/device-code/create
   */
  @Post("device-code/create")
  @HttpCode(200)
  createDeviceCode(@Body() dto: CreateDeviceCodeDto) {
    return this.authService.createDeviceCode(
      dto.userId || "user-1",
      dto.email || "user@fury.local",
      dto.plan || "pro",
    );
  }

  /**
   * Endpoint chamado pelo Desktop com o código digitado + solução do PoW para obter JWT
   * POST /api/auth/device-code/exchange
   */
  @Post("device-code/exchange")
  @HttpCode(200)
  exchangeCode(@Body() dto: ChallengeExchangeDto) {
    return this.authService.exchangeDeviceCode(dto.code, dto.challengeId, dto.nonce);
  }
}

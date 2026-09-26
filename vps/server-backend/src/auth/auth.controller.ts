import { Body, Controller, Get, HttpCode, Post, Query } from "@nestjs/common";
import {
  AuthService,
  WebRegisterDto,
  WebLoginDto,
  ExchangeCodeDto,
  RefreshTokenDto,
} from "./auth.service.js";

@Controller("api/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Valida se o token emitido pelo app desktop é autêntico e recupera a ação (login ou register)
   * GET /api/auth/validate-token?token=...
   */
  @Get("validate-token")
  validateToken(@Query("token") token: string) {
    const challenge = this.authService.validateChallengeToken(token);
    return {
      valid: true,
      action: challenge.action,
      state: challenge.state,
    };
  }

  /**
   * Registro via portal Web (salva usuário no SQLite e emite AuthCode)
   * POST /api/auth/web-register
   */
  @Post("web-register")
  @HttpCode(200)
  webRegister(@Body() dto: WebRegisterDto) {
    return this.authService.webRegister(dto);
  }

  /**
   * Login via portal Web (autentica contra SQLite e emite AuthCode)
   * POST /api/auth/web-login
   */
  @Post("web-login")
  @HttpCode(200)
  webLogin(@Body() dto: WebLoginDto) {
    return this.authService.webLogin(dto);
  }

  /**
   * Troca o AuthCode pelo JWT e perfil completo no loopback do Desktop
   * POST /api/auth/exchange-code
   */
  @Post("exchange-code")
  @HttpCode(200)
  exchangeCode(@Body() dto: ExchangeCodeDto) {
    return this.authService.exchangeCode(dto);
  }

  /**
   * Renova o accessToken de 5 minutos utilizando o refreshToken de 30 dias
   * POST /api/auth/refresh
   */
  @Post("refresh")
  @HttpCode(200)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshAccessToken(dto);
  }
}

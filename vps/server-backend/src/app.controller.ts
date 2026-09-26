import { Controller, Get, HttpException, HttpStatus } from "@nestjs/common";
import { SyncService } from "./sync/sync.service.js";

@Controller()
export class AppController {
  constructor(private readonly syncService: SyncService) {}

  @Get("health")
  health() {
    return {
      status: "ok",
      server: "fury-sync-nest",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    };
  }

  @Get("readyz")
  async readyz() {
    const storageReady = await this.syncService.checkStorage();
    const storageEndpoint = this.syncService.getPublicEndpoint();

    if (!storageReady) {
      throw new HttpException(
        {
          status: "not ready",
          storage: false,
          storageEndpoint,
          error: "Não foi possível acessar o diretório de armazenamento",
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return {
      status: "ready",
      storage: true,
      storageEndpoint,
    };
  }
}

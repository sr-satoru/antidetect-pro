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
    const s3Ready = await this.syncService.checkS3();
    const storageEndpoint = this.syncService.getPublicEndpoint();

    if (!s3Ready) {
      throw new HttpException(
        {
          status: "not ready",
          s3: false,
          storageEndpoint,
          error: "Não foi possível conectar ao bucket S3",
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return {
      status: "ready",
      s3: true,
      storageEndpoint,
    };
  }
}

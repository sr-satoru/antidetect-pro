import { Module, type OnModuleInit, Inject } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { LocalStorageService } from "./local-storage.service.js";
import { S3StorageService } from "./s3-storage.service.js";
import { STORAGE_DRIVER, type StorageDriver } from "./storage.interface.js";

@Module({
  imports: [ConfigModule],
  providers: [
    LocalStorageService,
    S3StorageService,
    {
      provide: STORAGE_DRIVER,
      useFactory: (
        configService: ConfigService,
        localService: LocalStorageService,
        s3Service: S3StorageService,
      ): StorageDriver => {
        const driver = configService.get<string>("STORAGE_DRIVER");
        if (driver === "s3") {
          return s3Service;
        }
        return localService;
      },
      inject: [ConfigService, LocalStorageService, S3StorageService],
    },
  ],
  exports: [STORAGE_DRIVER, LocalStorageService, S3StorageService],
})
export class StorageModule implements OnModuleInit {
  constructor(
    @Inject(STORAGE_DRIVER) private readonly activeDriver: StorageDriver,
  ) {}

  async onModuleInit() {
    await this.activeDriver.init();
  }
}

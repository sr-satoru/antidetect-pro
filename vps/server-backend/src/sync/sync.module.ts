import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "../auth/auth.module.js";
import { StorageModule } from "../storage/storage.module.js";
import { SyncController } from "./sync.controller.js";
import { SyncService } from "./sync.service.js";

@Module({
  imports: [ConfigModule, AuthModule, StorageModule],
  controllers: [SyncController],
  providers: [SyncService],
  exports: [SyncService],
})
export class SyncModule {}

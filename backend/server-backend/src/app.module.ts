import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller.js";
import { AuthModule } from "./auth/auth.module.js";
import { SyncModule } from "./sync/sync.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../.env"],
    }),
    PrismaModule,
    AuthModule,
    SyncModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

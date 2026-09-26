import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module.js";

const INSECURE_DEFAULT_TOKENS = new Set([
  "secret-sync-token",
  "CHANGE_ME_generate_a_long_random_secret",
  "CHANGE_ME",
  "12345678",
]);

function validateEnv() {
  const token = process.env.SYNC_TOKEN;
  const jwtSecret = process.env.JWT_SECRET;

  if (!token && !jwtSecret) {
    console.error("ERRO: É necessário definir SYNC_TOKEN ou JWT_SECRET no arquivo .env");
    process.exit(1);
  }

  if (token && (INSECURE_DEFAULT_TOKENS.has(token) || token.length < 16)) {
    console.warn(
      "AVISO DE SEGURANÇA: SYNC_TOKEN é fraco ou muito curto. Recomenda-se gerar com `openssl rand -hex 32`.",
    );
  }
}

async function bootstrap() {
  validateEnv();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Limite de corpo para envio de listas ou manifestos
  app.useBodyParser("json", { limit: "50mb" });

  // Habilitar CORS para clientes Web e Electron/Tauri
  app.enableCors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  const port = process.env.PORT ?? 12342;
  await app.listen(port, "0.0.0.0");
  console.log(`🚀 Fury Cloud Sync Server rodando em http://0.0.0.0:${port}`);
}

void bootstrap();

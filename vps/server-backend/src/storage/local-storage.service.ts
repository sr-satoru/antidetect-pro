import * as fs from "node:fs";
import * as path from "node:path";
import { pipeline } from "node:stream/promises";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as jwt from "jsonwebtoken";
import type {
  StorageDriver,
  StorageListResult,
  StorageStatResult,
} from "./storage.interface.js";

@Injectable()
export class LocalStorageService implements StorageDriver {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly storageDir: string;
  private readonly publicEndpoint: string;
  private readonly jwtSecret: string;

  constructor(private readonly configService: ConfigService) {
    const rawDir =
      this.configService.get<string>("STORAGE_DIR") ||
      "/home/vanir/fury/frontend/vps/ramos";
    this.storageDir = path.resolve(rawDir);

    const port = this.configService.get<number>("PORT", 12342);
    this.publicEndpoint = this.configService.get<string>(
      "PUBLIC_ENDPOINT",
      `http://localhost:${port}`,
    );

    this.jwtSecret = this.configService.get<string>(
      "JWT_SECRET",
      "fury_super_jwt_secret_dev_key_12345",
    );
  }

  async init(): Promise<void> {
    await fs.promises.mkdir(this.storageDir, { recursive: true });
    this.logger.log(`📁 LocalStorageService inicializado na pasta: ${this.storageDir}`);
  }

  async checkHealth(): Promise<boolean> {
    try {
      await fs.promises.access(this.storageDir, fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  private getFilePath(key: string): string {
    return path.join(this.storageDir, key);
  }

  private generateToken(key: string, expiresIn: number): string {
    const payload: Record<string, unknown> = {
      sub: "usr_storage_direct",
      mode: "self-hosted",
      prefix: "",
      targetKey: key,
      exp: Math.floor(Date.now() / 1000) + expiresIn,
    };
    return jwt.sign(payload, this.jwtSecret);
  }

  async stat(key: string): Promise<StorageStatResult> {
    const filePath = this.getFilePath(key);
    try {
      const s = await fs.promises.stat(filePath);
      return {
        exists: true,
        lastModified: s.mtime.toISOString(),
        size: s.size,
      };
    } catch {
      return { exists: false };
    }
  }

  async getUploadUrl(
    key: string,
    expiresIn: number,
    _contentType?: string,
    _metadata?: Record<string, string>,
  ): Promise<string> {
    const token = this.generateToken(key, expiresIn);
    return `${this.publicEndpoint}/v1/objects/raw?key=${encodeURIComponent(key)}&token=${encodeURIComponent(token)}`;
  }

  async getDownloadUrl(key: string, expiresIn: number): Promise<string> {
    const token = this.generateToken(key, expiresIn);
    return `${this.publicEndpoint}/v1/objects/raw?key=${encodeURIComponent(key)}&token=${encodeURIComponent(token)}`;
  }

  async saveStream(key: string, stream: NodeJS.ReadableStream): Promise<void> {
    const fullPath = this.getFilePath(key);
    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
    const writeStream = fs.createWriteStream(fullPath);
    await pipeline(stream, writeStream);
    this.logger.log(`💾 Arquivo salvo com sucesso no disco: ${fullPath}`);
  }

  async getStream(key: string): Promise<{ stream: NodeJS.ReadableStream; size: number }> {
    const fullPath = this.getFilePath(key);
    try {
      const s = await fs.promises.stat(fullPath);
      return {
        stream: fs.createReadStream(fullPath),
        size: s.size,
      };
    } catch {
      throw new NotFoundException(`Arquivo '${key}' não encontrado no armazenamento local`);
    }
  }

  async delete(key: string): Promise<boolean> {
    const filePath = this.getFilePath(key);
    try {
      await fs.promises.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async deletePrefix(prefix: string): Promise<number> {
    const targetPath = this.getFilePath(prefix);
    try {
      await fs.promises.rm(targetPath, { recursive: true, force: true });
      return 1;
    } catch {
      return 0;
    }
  }

  async list(
    prefix: string,
    maxKeys = 1000,
  ): Promise<StorageListResult> {
    const targetDir = this.getFilePath(prefix);
    const results: { key: string; lastModified: string; size: number }[] = [];

    const walk = async (dir: string, base: string) => {
      try {
        const entries = await fs.promises.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativeKey = path.join(base, entry.name);
          if (entry.isDirectory()) {
            await walk(fullPath, relativeKey);
          } else if (entry.isFile()) {
            const fileStat = await fs.promises.stat(fullPath);
            results.push({
              key: relativeKey,
              lastModified: fileStat.mtime.toISOString(),
              size: fileStat.size,
            });
          }
        }
      } catch {
        // Diretório ainda não existe
      }
    };

    await walk(targetDir, prefix);
    return {
      objects: results.slice(0, maxKeys),
      isTruncated: false,
    };
  }
}

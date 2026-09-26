import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
} from "@nestjs/common";
import type { UserContext } from "../auth/user-context.interface.js";
import {
  STORAGE_DRIVER,
  type StorageDriver,
} from "../storage/storage.interface.js";
import type {
  DeletePrefixRequestDto,
  DeletePrefixResponseDto,
  DeleteRequestDto,
  DeleteResponseDto,
  ListRequestDto,
  ListResponseDto,
  PresignDownloadBatchRequestDto,
  PresignDownloadBatchResponseDto,
  PresignDownloadRequestDto,
  PresignDownloadResponseDto,
  PresignUploadBatchRequestDto,
  PresignUploadBatchResponseDto,
  PresignUploadRequestDto,
  PresignUploadResponseDto,
  StatRequestDto,
  StatResponseDto,
} from "./dto/sync.dto.js";

const MAX_PRESIGN_EXPIRES_IN = 3600; // 1 hour max
const MAX_BATCH_ITEMS = 1000; // DoS guard

/** Whitelist only safe metadata keys for LWW conflict resolution */
function sanitizeMetadata(
  metadata: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (!metadata) return undefined;
  const out: Record<string, string> = {};
  if (typeof metadata["updated-at"] === "string") {
    out["updated-at"] = metadata["updated-at"];
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function clampExpiresIn(requested: number | undefined): number {
  const v = typeof requested === "number" && requested > 0 ? requested : 3600;
  return Math.min(v, MAX_PRESIGN_EXPIRES_IN);
}

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    @Inject(STORAGE_DRIVER) private readonly storage: StorageDriver,
  ) {}

  /** Verifica se o armazenamento ativo está saudável */
  async checkStorage(): Promise<boolean> {
    return this.storage.checkHealth();
  }

  /** Alias para manter compatibilidade com verificadores de saúde */
  async checkS3(): Promise<boolean> {
    return this.storage.checkHealth();
  }

  getPublicEndpoint(): string {
    return "active_storage_driver";
  }

  /** Scope key according to user prefix (cloud mode) or leave as is (self-hosted) */
  private scopeKey(ctx: UserContext, key: string): string {
    if (ctx.mode === "self-hosted") return key;
    return `${ctx.prefix}${key}`;
  }

  /** Path traversal and key isolation security check */
  validateKeyAccess(ctx: UserContext, scopedKey: string): void {
    if (scopedKey.includes("..")) {
      throw new BadRequestException("Key contains invalid traversal components");
    }
    if (ctx.mode === "self-hosted") return;
    if (!scopedKey.startsWith(ctx.prefix)) {
      throw new ForbiddenException("Acesso negado para a chave solicitada");
    }
  }

  // 1. STAT: Checar existência e metadados de Last-Write-Wins (LWW)
  async stat(dto: StatRequestDto, ctx: UserContext): Promise<StatResponseDto> {
    const key = this.scopeKey(ctx, dto.key);
    this.validateKeyAccess(ctx, key);
    return this.storage.stat(key);
  }

  // 2. PRESIGN UPLOAD SINGLE
  async presignUpload(
    dto: PresignUploadRequestDto,
    ctx: UserContext,
  ): Promise<PresignUploadResponseDto> {
    const key = this.scopeKey(ctx, dto.key);
    this.validateKeyAccess(ctx, key);

    const expiresIn = clampExpiresIn(dto.expiresIn);
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    const cleanMeta = sanitizeMetadata(dto.metadata);

    const url = await this.storage.getUploadUrl(
      key,
      expiresIn,
      dto.contentType,
      cleanMeta,
    );

    return { url, expiresAt, metadata: cleanMeta };
  }

  // 3. PRESIGN UPLOAD BATCH
  async presignUploadBatch(
    dto: PresignUploadBatchRequestDto,
    ctx: UserContext,
  ): Promise<PresignUploadBatchResponseDto> {
    if (dto.items.length > MAX_BATCH_ITEMS) {
      throw new BadRequestException(`Batch excede o limite máximo de ${MAX_BATCH_ITEMS} itens`);
    }

    const expiresIn = clampExpiresIn(dto.expiresIn);
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const items = await Promise.all(
      dto.items.map(async (item) => {
        const key = this.scopeKey(ctx, item.key);
        this.validateKeyAccess(ctx, key);
        const url = await this.storage.getUploadUrl(
          key,
          expiresIn,
          item.contentType,
        );
        return { key: item.key, url, expiresAt };
      }),
    );

    return { items };
  }

  // 4. PRESIGN DOWNLOAD SINGLE
  async presignDownload(
    dto: PresignDownloadRequestDto,
    ctx: UserContext,
  ): Promise<PresignDownloadResponseDto> {
    const key = this.scopeKey(ctx, dto.key);
    this.validateKeyAccess(ctx, key);

    const expiresIn = clampExpiresIn(dto.expiresIn);
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const url = await this.storage.getDownloadUrl(key, expiresIn);
    return { url, expiresAt };
  }

  // 5. PRESIGN DOWNLOAD BATCH
  async presignDownloadBatch(
    dto: PresignDownloadBatchRequestDto,
    ctx: UserContext,
  ): Promise<PresignDownloadBatchResponseDto> {
    if (dto.keys.length > MAX_BATCH_ITEMS) {
      throw new BadRequestException(`Batch excede o limite máximo de ${MAX_BATCH_ITEMS} itens`);
    }

    const expiresIn = clampExpiresIn(dto.expiresIn);
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const items = await Promise.all(
      dto.keys.map(async (rawKey) => {
        const key = this.scopeKey(ctx, rawKey);
        this.validateKeyAccess(ctx, key);
        const url = await this.storage.getDownloadUrl(key, expiresIn);
        return { key: rawKey, url, expiresAt };
      }),
    );

    return { items };
  }

  // 6. LIST OBJECTS
  async list(dto: ListRequestDto, ctx: UserContext): Promise<ListResponseDto> {
    const prefix = this.scopeKey(ctx, dto.prefix);
    this.validateKeyAccess(ctx, prefix);

    const res = await this.storage.list(
      prefix,
      dto.maxKeys ?? 1000,
      dto.continuationToken,
    );

    const objects = res.objects.map((o) => {
      let key = o.key;
      if (ctx.mode === "cloud" && key.startsWith(ctx.prefix)) {
        key = key.substring(ctx.prefix.length);
      }
      return {
        key,
        lastModified: o.lastModified,
        size: o.size,
      };
    });

    return {
      objects,
      isTruncated: res.isTruncated,
      nextContinuationToken: res.nextContinuationToken,
    };
  }

  // 7. DELETE SINGLE
  async delete(dto: DeleteRequestDto, ctx: UserContext): Promise<DeleteResponseDto> {
    const key = this.scopeKey(ctx, dto.key);
    this.validateKeyAccess(ctx, key);
    const deleted = await this.storage.delete(key);
    return { deleted };
  }

  // 8. DELETE PREFIX
  async deletePrefix(
    dto: DeletePrefixRequestDto,
    ctx: UserContext,
  ): Promise<DeletePrefixResponseDto> {
    const prefix = this.scopeKey(ctx, dto.prefix);
    this.validateKeyAccess(ctx, prefix);
    const deletedCount = await this.storage.deletePrefix(prefix);
    return { deletedCount };
  }

  // 9. SALVAR STREAM DIRETO
  async saveStream(rawKey: string, ctx: UserContext, stream: NodeJS.ReadableStream): Promise<void> {
    this.validateKeyAccess(ctx, rawKey);
    await this.storage.saveStream(rawKey, stream);
  }

  // 10. LER STREAM DIRETO
  async getFileStream(rawKey: string, ctx: UserContext): Promise<{ stream: NodeJS.ReadableStream; size: number }> {
    this.validateKeyAccess(ctx, rawKey);
    return this.storage.getStream(rawKey);
  }
}

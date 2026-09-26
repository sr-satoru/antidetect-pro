import {
  CreateBucketCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  type OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { UserContext } from "../auth/user-context.interface.js";
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
export class SyncService implements OnModuleInit {
  private readonly logger = new Logger(SyncService.name);
  private s3Client: S3Client;
  private presignClient: S3Client;
  private publicEndpoint: string;
  private bucket: string;

  constructor(private configService: ConfigService) {
    const endpoint = this.configService.get<string>("S3_ENDPOINT", "http://minio:9000");
    const publicEndpoint = this.configService.get<string>(
      "S3_PUBLIC_ENDPOINT",
      endpoint,
    );
    const region = this.configService.get<string>("S3_REGION", "us-east-1");
    const accessKeyId = this.configService.get<string>(
      "S3_ACCESS_KEY_ID",
      "furyadmin",
    );
    const secretAccessKey = this.configService.get<string>(
      "S3_SECRET_ACCESS_KEY",
      "furypassword123",
    );
    this.bucket = this.configService.get<string>("S3_BUCKET", "fury-sync");
    this.publicEndpoint = publicEndpoint;

    const credentials = { accessKeyId, secretAccessKey };

    // S3 client for server-side direct calls
    this.s3Client = new S3Client({
      endpoint,
      region,
      credentials,
      forcePathStyle: true,
    });

    // S3 client for signing URLs handed to desktop clients
    this.presignClient = new S3Client({
      endpoint: publicEndpoint,
      region,
      credentials,
      forcePathStyle: true,
    });
  }

  async onModuleInit() {
    await this.ensureBucketExists();
  }

  private async ensureBucketExists(): Promise<void> {
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Bucket S3 '${this.bucket}' pronto.`);
    } catch {
      try {
        await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Bucket S3 '${this.bucket}' criado com sucesso.`);
      } catch (err: unknown) {
        this.logger.warn(`Aviso de criação de bucket: ${err}`);
      }
    }
  }

  async checkS3(): Promise<boolean> {
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return true;
    } catch {
      return false;
    }
  }

  getPublicEndpoint(): string {
    return this.publicEndpoint;
  }

  /** Scope key according to user prefix (cloud mode) or leave as is (self-hosted) */
  private scopeKey(ctx: UserContext, key: string): string {
    if (ctx.mode === "self-hosted") return key;
    return `${ctx.prefix}${key}`;
  }

  /** Path traversal and key isolation security check */
  private validateKeyAccess(ctx: UserContext, scopedKey: string): void {
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

    try {
      const res = await this.s3Client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return {
        exists: true,
        lastModified: res.LastModified?.toISOString(),
        size: res.ContentLength,
        metadata: res.Metadata,
      };
    } catch {
      return { exists: false };
    }
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

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: dto.contentType,
      Metadata: cleanMeta,
    });

    const url = await getSignedUrl(this.presignClient, command, { expiresIn });
    return { url, expiresAt, metadata: cleanMeta };
  }

  // 3. PRESIGN UPLOAD BATCH (Upload em lote de arquivos do perfil)
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

        const command = new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          ContentType: item.contentType,
        });

        const url = await getSignedUrl(this.presignClient, command, { expiresIn });
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

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const url = await getSignedUrl(this.presignClient, command, { expiresIn });
    return { url, expiresAt };
  }

  // 5. PRESIGN DOWNLOAD BATCH (Download em lote)
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

        const command = new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        });

        const url = await getSignedUrl(this.presignClient, command, { expiresIn });
        return { key: rawKey, url, expiresAt };
      }),
    );

    return { items };
  }

  // 6. LIST OBJECTS
  async list(dto: ListRequestDto, ctx: UserContext): Promise<ListResponseDto> {
    const prefix = this.scopeKey(ctx, dto.prefix);
    this.validateKeyAccess(ctx, prefix);

    const res = await this.s3Client.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: dto.maxKeys ?? 1000,
        ContinuationToken: dto.continuationToken,
      }),
    );

    const objects = (res.Contents ?? []).map((o) => {
      let key = o.Key ?? "";
      if (ctx.mode === "cloud" && key.startsWith(ctx.prefix)) {
        key = key.substring(ctx.prefix.length);
      }
      return {
        key,
        lastModified: o.LastModified?.toISOString() ?? "",
        size: o.Size ?? 0,
      };
    });

    return {
      objects,
      isTruncated: res.IsTruncated ?? false,
      nextContinuationToken: res.NextContinuationToken,
    };
  }

  // 7. DELETE SINGLE
  async delete(dto: DeleteRequestDto, ctx: UserContext): Promise<DeleteResponseDto> {
    const key = this.scopeKey(ctx, dto.key);
    this.validateKeyAccess(ctx, key);

    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
    return { deleted: true };
  }

  // 8. DELETE PREFIX (Ex: Deletar todo o diretório de um perfil)
  async deletePrefix(
    dto: DeletePrefixRequestDto,
    ctx: UserContext,
  ): Promise<DeletePrefixResponseDto> {
    const prefix = this.scopeKey(ctx, dto.prefix);
    this.validateKeyAccess(ctx, prefix);

    let deletedCount = 0;
    let continuationToken: string | undefined;

    do {
      const list = await this.s3Client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );

      const toDelete = (list.Contents ?? []).map((c) => ({ Key: c.Key }));
      if (toDelete.length > 0) {
        await this.s3Client.send(
          new DeleteObjectsCommand({
            Bucket: this.bucket,
            Delete: { Objects: toDelete, Quiet: true },
          }),
        );
        deletedCount += toDelete.length;
      }

      continuationToken = list.NextContinuationToken;
    } while (continuationToken);

    return { deletedCount };
  }
}

import {
  CreateBucketCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type {
  StorageDriver,
  StorageListResult,
  StorageStatResult,
} from "./storage.interface.js";

@Injectable()
export class S3StorageService implements StorageDriver {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly s3Client: S3Client;
  private readonly presignClient: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>("S3_ENDPOINT", "http://localhost:8987");
    const port = this.configService.get<number>("PORT", 12342);
    const publicEndpoint = this.configService.get<string>(
      "S3_PUBLIC_ENDPOINT",
      this.configService.get<string>("PUBLIC_ENDPOINT", `http://localhost:${port}`),
    );
    const region = this.configService.get<string>("S3_REGION", "us-east-1");
    const accessKeyId = this.configService.get<string>("S3_ACCESS_KEY_ID", "furyadmin");
    const secretAccessKey = this.configService.get<string>("S3_SECRET_ACCESS_KEY", "furypassword123");
    this.bucket = this.configService.get<string>("S3_BUCKET", "fury-sync");

    const credentials = { accessKeyId, secretAccessKey };

    this.s3Client = new S3Client({
      endpoint,
      region,
      credentials,
      forcePathStyle: true,
    });

    this.presignClient = new S3Client({
      endpoint: publicEndpoint,
      region,
      credentials,
      forcePathStyle: true,
    });
  }

  async init(): Promise<void> {
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      this.logger.log(`Bucket S3 '${this.bucket}' pronto.`);
    } catch {
      try {
        await this.s3Client.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Bucket S3 '${this.bucket}' criado com sucesso.`);
      } catch (err: unknown) {
        this.logger.warn(`Aviso de inicialização de bucket S3: ${err}`);
      }
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      await this.s3Client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return true;
    } catch {
      return false;
    }
  }

  async stat(key: string): Promise<StorageStatResult> {
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

  async getUploadUrl(
    key: string,
    expiresIn: number,
    contentType?: string,
    metadata?: Record<string, string>,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
      Metadata: metadata,
    });
    return getSignedUrl(this.presignClient, command, { expiresIn });
  }

  async getDownloadUrl(key: string, expiresIn: number): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.presignClient, command, { expiresIn });
  }

  async saveStream(_key: string, _stream: NodeJS.ReadableStream): Promise<void> {
    throw new Error("Direct stream upload is handled via S3 Presigned URLs");
  }

  async getStream(key: string): Promise<{ stream: NodeJS.ReadableStream; size: number }> {
    const res = await this.s3Client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    return {
      stream: res.Body as unknown as NodeJS.ReadableStream,
      size: res.ContentLength ?? 0,
    };
  }

  async delete(key: string): Promise<boolean> {
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
    return true;
  }

  async deletePrefix(prefix: string): Promise<number> {
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

    return deletedCount;
  }

  async list(
    prefix: string,
    maxKeys = 1000,
    continuationToken?: string,
  ): Promise<StorageListResult> {
    const res = await this.s3Client.send(
      new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: maxKeys,
        ContinuationToken: continuationToken,
      }),
    );

    const objects = (res.Contents ?? []).map((o) => ({
      key: o.Key ?? "",
      lastModified: o.LastModified?.toISOString() ?? "",
      size: o.Size ?? 0,
    }));

    return {
      objects,
      isTruncated: res.IsTruncated ?? false,
      nextContinuationToken: res.NextContinuationToken,
    };
  }
}

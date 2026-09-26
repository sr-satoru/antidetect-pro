export class StatRequestDto {
  key: string;
}

export class StatResponseDto {
  exists: boolean;
  lastModified?: string;
  size?: number;
  metadata?: Record<string, string>;
}

export class PresignUploadRequestDto {
  key: string;
  contentType?: string;
  expiresIn?: number;
  metadata?: Record<string, string>;
}

export class PresignUploadResponseDto {
  url: string;
  expiresAt: string;
  metadata?: Record<string, string>;
}

export class PresignUploadBatchItemDto {
  key: string;
  contentType?: string;
}

export class PresignUploadBatchRequestDto {
  items: PresignUploadBatchItemDto[];
  expiresIn?: number;
}

export class PresignUploadBatchItemResponseDto {
  key: string;
  url: string;
  expiresAt: string;
}

export class PresignUploadBatchResponseDto {
  items: PresignUploadBatchItemResponseDto[];
}

export class PresignDownloadRequestDto {
  key: string;
  expiresIn?: number;
}

export class PresignDownloadResponseDto {
  url: string;
  expiresAt: string;
}

export class PresignDownloadBatchRequestDto {
  keys: string[];
  expiresIn?: number;
}

export class PresignDownloadBatchItemResponseDto {
  key: string;
  url: string;
  expiresAt: string;
}

export class PresignDownloadBatchResponseDto {
  items: PresignDownloadBatchItemResponseDto[];
}

export class DeleteRequestDto {
  key: string;
}

export class DeleteResponseDto {
  deleted: boolean;
}

export class DeletePrefixRequestDto {
  prefix: string;
}

export class DeletePrefixResponseDto {
  deletedCount: number;
}

export class ListRequestDto {
  prefix: string;
  maxKeys?: number;
  continuationToken?: string;
}

export class ListObjectDto {
  key: string;
  lastModified: string;
  size: number;
}

export class ListResponseDto {
  objects: ListObjectDto[];
  isTruncated: boolean;
  nextContinuationToken?: string;
}

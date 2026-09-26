export const STORAGE_DRIVER = "STORAGE_DRIVER";

export interface StorageStatResult {
  exists: boolean;
  lastModified?: string;
  size?: number;
  metadata?: Record<string, string>;
}

export interface StorageListObject {
  key: string;
  lastModified: string;
  size: number;
}

export interface StorageListResult {
  objects: StorageListObject[];
  isTruncated: boolean;
  nextContinuationToken?: string;
}

export interface StorageDriver {
  /** Inicializa o driver (criação de diretórios locais ou verificação de bucket S3) */
  init(): Promise<void>;

  /** Checa a disponibilidade/saúde do armazenamento */
  checkHealth(): Promise<boolean>;

  /** Consulta existência e metadados de um objeto */
  stat(key: string): Promise<StorageStatResult>;

  /** Gera URL para upload do arquivo */
  getUploadUrl(
    key: string,
    expiresIn: number,
    contentType?: string,
    metadata?: Record<string, string>,
  ): Promise<string>;

  /** Gera URL para download do arquivo */
  getDownloadUrl(key: string, expiresIn: number): Promise<string>;

  /** Salva o fluxo binário diretamente no armazenamento */
  saveStream(key: string, stream: NodeJS.ReadableStream): Promise<void>;

  /** Lê o fluxo binário diretamente do armazenamento */
  getStream(key: string): Promise<{ stream: NodeJS.ReadableStream; size: number }>;

  /** Deleta um único objeto */
  delete(key: string): Promise<boolean>;

  /** Deleta todos os objetos com determinado prefixo */
  deletePrefix(prefix: string): Promise<number>;

  /** Lista objetos com determinado prefixo */
  list(
    prefix: string,
    maxKeys?: number,
    continuationToken?: string,
  ): Promise<StorageListResult>;
}

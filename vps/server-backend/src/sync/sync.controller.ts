import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { AuthGuard } from "../auth/auth.guard.js";
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
import { SyncService } from "./sync.service.js";

@Controller("v1/objects")
@UseGuards(AuthGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  private getUserContext(req: Request): UserContext {
    return (req as unknown as Record<string, unknown>).user as UserContext;
  }

  @Post("stat")
  @HttpCode(200)
  async stat(
    @Body() dto: StatRequestDto,
    @Req() req: Request,
  ): Promise<StatResponseDto> {
    return this.syncService.stat(dto, this.getUserContext(req));
  }

  @Post("presign-upload")
  @HttpCode(200)
  async presignUpload(
    @Body() dto: PresignUploadRequestDto,
    @Req() req: Request,
  ): Promise<PresignUploadResponseDto> {
    return this.syncService.presignUpload(dto, this.getUserContext(req));
  }

  @Post("presign-upload-batch")
  @HttpCode(200)
  async presignUploadBatch(
    @Body() dto: PresignUploadBatchRequestDto,
    @Req() req: Request,
  ): Promise<PresignUploadBatchResponseDto> {
    return this.syncService.presignUploadBatch(dto, this.getUserContext(req));
  }

  @Post("presign-download")
  @HttpCode(200)
  async presignDownload(
    @Body() dto: PresignDownloadRequestDto,
    @Req() req: Request,
  ): Promise<PresignDownloadResponseDto> {
    return this.syncService.presignDownload(dto, this.getUserContext(req));
  }

  @Post("presign-download-batch")
  @HttpCode(200)
  async presignDownloadBatch(
    @Body() dto: PresignDownloadBatchRequestDto,
    @Req() req: Request,
  ): Promise<PresignDownloadBatchResponseDto> {
    return this.syncService.presignDownloadBatch(dto, this.getUserContext(req));
  }

  @Post("list")
  @HttpCode(200)
  async list(
    @Body() dto: ListRequestDto,
    @Req() req: Request,
  ): Promise<ListResponseDto> {
    return this.syncService.list(dto, this.getUserContext(req));
  }

  @Post("delete")
  @HttpCode(200)
  async delete(
    @Body() dto: DeleteRequestDto,
    @Req() req: Request,
  ): Promise<DeleteResponseDto> {
    return this.syncService.delete(dto, this.getUserContext(req));
  }

  @Post("delete-prefix")
  @HttpCode(200)
  async deletePrefix(
    @Body() dto: DeletePrefixRequestDto,
    @Req() req: Request,
  ): Promise<DeletePrefixResponseDto> {
    return this.syncService.deletePrefix(dto, this.getUserContext(req));
  }

  // ROTA DE UPLOAD DIRETO PARA PERFIS (SEM S3/DOCKER)
  @Put("raw")
  @HttpCode(200)
  async uploadRaw(
    @Query("key") key: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const rawKey = key || (req.query?.key as string);
    if (!rawKey) {
      throw new BadRequestException("Missing 'key' parameter");
    }
    await this.syncService.saveStream(rawKey, this.getUserContext(req), req);
    return res.status(200).json({ ok: true });
  }

  // ROTA DE DOWNLOAD DIRETO PARA PERFIS (SEM S3/DOCKER)
  @Get("raw")
  async downloadRaw(
    @Query("key") key: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const rawKey = key || (req.query?.key as string);
    if (!rawKey) {
      throw new BadRequestException("Missing 'key' parameter");
    }
    const { stream, size } = await this.syncService.getFileStream(rawKey, this.getUserContext(req));
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Length", size);
    stream.pipe(res);
  }
}

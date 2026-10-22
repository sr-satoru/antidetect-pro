import { http } from '../http';
import type { BatchImportPayload, BatchImportResponse } from './service.types';

export const serviceImportarPerfil = {
  importBatch: (payload: BatchImportPayload) =>
    http.post<BatchImportResponse>('/api/profiles/import', payload),
};

export default serviceImportarPerfil;

import api from './api';
import type { ApiResponse, DatasetStatusDTO } from '../types';

export const datasetService = {
  upload: (file: File, type: string) => {
    const form = new FormData();
    form.append('file', file);
    form.append('type', type);
    return api.post<ApiResponse<DatasetStatusDTO>>('/datasets/upload', form);
  },

  simulate: (count = 10) =>
    api.post<ApiResponse<number>>('/datasets/simulate', null, {
      params: { count },
    }),

  getStatus: () =>
    api.get<ApiResponse<DatasetStatusDTO>>('/datasets/status'),

  getTemplates: () =>
    api.get<ApiResponse<Record<string, string>>>('/datasets/templates'),
};

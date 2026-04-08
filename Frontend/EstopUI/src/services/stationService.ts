import api from './api';
import type { ApiResponse, StationStatusDTO } from '../types';

export const stationService = {
  getAll: () =>
    api.get<ApiResponse<StationStatusDTO[]>>('/stations'),

  getById: (id: number) =>
    api.get<ApiResponse<StationStatusDTO>>(`/stations/${id}`),

  getHmiStatus: (id: number) =>
    api.get<ApiResponse<string>>(`/stations/${id}/status`),

  getByFactory: (factoryId: string) =>
    api.get<ApiResponse<StationStatusDTO[]>>(`/stations/factory/${factoryId}`),
};

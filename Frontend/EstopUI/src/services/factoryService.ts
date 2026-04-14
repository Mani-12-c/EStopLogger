import api from './api';
import type { ApiResponse, FactoryDTO, FactoryStationDTO } from '../types';

export const factoryService = {
  getAll: () =>
    api.get<ApiResponse<FactoryDTO[]>>('/factories'),

  getStations: (factoryId: string) =>
    api.get<ApiResponse<FactoryStationDTO[]>>(`/factories/${factoryId}/stations`),

  getBlocks: (factoryId: string) =>
    api.get<ApiResponse<string[]>>(`/factories/${factoryId}/blocks`),
};

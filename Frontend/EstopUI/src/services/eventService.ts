import api from './api';
import type { ApiResponse, EStopEventDTO, DispatchDTO, Page } from '../types';

interface EventFilters {
  status?: string;
  severity?: string;
  stationId?: number;
  factoryId?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export const eventService = {
  create: (data: EStopEventDTO) =>
    api.post<ApiResponse<EStopEventDTO>>('/events', data),

  getAll: (filters: EventFilters = {}) =>
    api.get<ApiResponse<Page<EStopEventDTO>>>('/events', { params: filters }),

  getById: (id: number) =>
    api.get<ApiResponse<EStopEventDTO>>(`/events/${id}`),

  getOpen: () =>
    api.get<ApiResponse<EStopEventDTO[]>>('/events/open'),

  getByStation: (stationId: number) =>
    api.get<ApiResponse<EStopEventDTO[]>>(`/events/station/${stationId}`),

  getDispatches: (eventId: number) =>
    api.get<ApiResponse<DispatchDTO[]>>(`/events/${eventId}/dispatches`),

  release: (eventId: number) =>
    api.post<ApiResponse<EStopEventDTO>>(`/events/${eventId}/release`),
};

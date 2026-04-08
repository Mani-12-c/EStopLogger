import api from './api';
import type {
  ApiResponse,
  AuditLogDTO,
  EventTimelineDTO,
  Page,
} from '../types';

interface AuditFilters {
  eventId?: number;
  action?: string;
  performedBy?: number;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

export const auditService = {
  getLogs: (filters: AuditFilters = {}) =>
    api.get<ApiResponse<Page<AuditLogDTO>>>('/audit/logs', {
      params: filters,
    }),

  exportCsv: (from: string, to: string) =>
    api.get('/audit/export', {
      params: { from, to },
      responseType: 'blob',
    }),

  getTimeline: (eventId: number) =>
    api.get<ApiResponse<EventTimelineDTO>>(`/audit/timeline/${eventId}`),
};

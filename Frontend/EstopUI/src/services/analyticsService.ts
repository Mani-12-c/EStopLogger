import api from './api';
import type {
  ApiResponse,
  DashboardSummary,
  FrequencyDTO,
  ShiftReportDTO,
  StationRiskDTO,
} from '../types';

export const analyticsService = {
  getSummary: (factoryId?: string) =>
    api.get<ApiResponse<DashboardSummary>>('/analytics/summary', {
      params: factoryId ? { factoryId } : {},
    }),

  getPressFrequency: (from: string, to: string, groupBy = 'day') =>
    api.get<ApiResponse<FrequencyDTO[]>>('/analytics/press-frequency', {
      params: { from, to, groupBy },
    }),

  getMeanAckTime: (from: string, to: string, stationId?: number) =>
    api.get<ApiResponse<number>>('/analytics/mean-ack-time', {
      params: { from, to, ...(stationId ? { stationId } : {}) },
    }),

  getHighRiskStations: (factoryId?: string, limit = 10) =>
    api.get<ApiResponse<StationRiskDTO[]>>('/analytics/high-risk-stations', {
      params: { ...(factoryId ? { factoryId } : {}), limit },
    }),

  getShiftReport: (date: string, factoryId?: string) =>
    api.get<ApiResponse<ShiftReportDTO>>('/analytics/shift-report', {
      params: { date, ...(factoryId ? { factoryId } : {}) },
    }),

  getRiskTrend: (stationId: number, weeks = 12) =>
    api.get<ApiResponse<FrequencyDTO[]>>('/analytics/trend', {
      params: { stationId, weeks },
    }),
};

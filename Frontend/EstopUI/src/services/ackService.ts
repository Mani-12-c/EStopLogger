import api from './api';
import type { ApiResponse, AckRequest, AckResponse } from '../types';

export const ackService = {
  acknowledge: (eventId: number, data: AckRequest) =>
    api.post<ApiResponse<AckResponse>>(
      `/acknowledgements/${eventId}/acknowledge`,
      data
    ),

  resolve: (eventId: number) =>
    api.post<ApiResponse<string>>(
      `/acknowledgements/${eventId}/resolve`
    ),

  getByEvent: (eventId: number) =>
    api.get<ApiResponse<AckResponse>>(
      `/acknowledgements/${eventId}`
    ),
};

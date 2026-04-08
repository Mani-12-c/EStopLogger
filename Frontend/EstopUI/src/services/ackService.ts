import api from './api';
import type { ApiResponse, AckRequest, AckResponse } from '../types';

export const ackService = {
  acknowledge: (eventId: number, data: AckRequest) =>
    api.post<ApiResponse<AckResponse>>(
      `/acknowledgements/${eventId}/acknowledge`,
      data
    ),
};

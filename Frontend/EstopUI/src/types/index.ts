/* ───────────────────── Enums ───────────────────── */

export type UserRole = 'OPERATOR' | 'SUPERVISOR' | 'AUDITOR';
export type EventStatus = 'OPEN' | 'ACKNOWLEDGED' | 'ESCALATED' | 'CRITICAL' | 'RESOLVED' | 'CLOSED' | 'RELEASED' | 'AUTO_DISPATCHED';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type StationStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
export type HmiState = 'GREEN' | 'AMBER' | 'RED';
export type ShiftType = 'MORNING' | 'AFTERNOON' | 'NIGHT';
export type ResolutionCategory =
  | 'FALSE_ALARM'
  | 'REAL_EMERGENCY'
  | 'TESTING_MAINTENANCE'
  | 'MACHINE_FAULT'
  | 'CUSTOM_RESOLUTION';

/* ───────────────────── API Wrapper ───────────────────── */

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

/* ───────────────────── Auth ───────────────────── */

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  fullName: string;
  role: UserRole;
  assignedStationId?: number | null;
  shift?: ShiftType | null;
}

export interface LoginResponse {
  token: string;
  role: string;
  userId: number;
  username: string;
  fullName: string;
  assignedStationId: number;
  shift: string;
}

/* ───────────────────── Station ───────────────────── */

export interface StationStatusDTO {
  stationId: number;
  stationName: string;
  factoryId: string;
  factoryName: string;
  blockId: string;
  status: string;
  currentHmiState: string;
  openEventCount: number;
}

export interface StationRiskDTO {
  stationId: number;
  stationName: string;
  factoryId: string;
  blockId: string;
  riskScore: number;
  eventCount: number;
  riskLevel: string;
}

/* ───────────────────── Events ───────────────────── */

export interface EStopEventDTO {
  eventId?: number;
  stationId: number;
  factoryId: string;
  blockId: string;
  pressedAt?: string;
  eventStatus?: string;
  severity?: string;
  isRapidSequence?: boolean;
  correlatedWorkId?: number;
  riskScore?: number;
  stationName?: string;
  factoryName?: string;
  workType?: string;
  probableEmergency?: string;
  instantHelp?: string;
  createdAt?: string;
}

/* ───────────────────── Acknowledgement ───────────────────── */

export interface AckRequest {
  resolutionCategory: ResolutionCategory;
  customResolutionText?: string;
}

export interface AckResponse {
  ackId: number;
  eventId: number;
  username: string;
  role: string;
  acknowledgedAt: string;
  resolutionCategory: string;
  customResolutionText?: string;
  ackWithinThreshold: boolean;
}

/* ───────────────────── Analytics ───────────────────── */

export interface DashboardSummary {
  totalEventsToday: number;
  totalEventsThisWeek: number;
  openEvents: number;
  escalatedEvents: number;
  autoDispatchedEvents: number;
  resolvedEvents: number;
  meanAckTimeSeconds: number;
  eventsBySeverity: Record<string, number>;
  eventsByShift: Record<string, number>;
  eventsByStatus: Record<string, number>;
  highRiskStations: StationRiskDTO[];
}

export interface FrequencyDTO {
  label: string;
  count: number;
}

export interface ShiftReportDTO {
  date: string;
  eventsByShift: Record<string, number>;
  avgAckTimeByShift: Record<string, number>;
  escalationsByShift: Record<string, number>;
}

/* ───────────────────── Audit ───────────────────── */

export interface AuditLogDTO {
  auditId: number;
  eventId: number;
  action: string;
  performedBy: number;
  performedByName: string;
  timestamp: string;
  details: string;
  ipAddress: string;
}

export interface EventTimelineDTO {
  eventId: number;
  timeline: TimelineEntry[];
}

export interface TimelineEntry {
  time: string;
  action: string;
  by: string;
  details: string;
}

/* ───────────────────── Dataset ───────────────────── */

export interface DatasetStatusDTO {
  status: string;
  message: string;
  totalRows: number;
  successRows: number;
  failedRows: number;
  errors: string[];
}

/* ───────────────────── Dispatch ───────────────────── */

export interface DispatchDTO {
  dispatchId: number;
  eventId: number;
  dispatchType: string;
  dispatchedAt: string;
  triggerReason: string;
  responseStatus: string;
  notes: string;
}

/* ───────────────────── Factory Dropdowns ───────────────────── */

export interface FactoryDTO {
  factoryId: string;
  factoryName: string;
  location: string;
}

export interface FactoryStationDTO {
  stationId: number;
  stationName: string;
  blockId: string;
}

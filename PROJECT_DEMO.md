E-Stop Logger — Demo Guide
==========================

Purpose
-------
This document is a concise demo guide for the E-Stop Logger project. It summarizes the architecture, important components, how to run the system locally, key REST endpoints, and a guided demo script you can follow to show the app's core capabilities.

High-level Summary
------------------
- Purpose: Record emergency-stop button presses, correlate with scheduled work, compute risk scores, auto-dispatch/escalate, and provide dashboards/analytics + audit.
- Stack: Spring Boot (Java 21) backend, MySQL, React + Vite + TypeScript + MUI frontend.
- Roles: OPERATOR, SUPERVISOR, AUDITOR (RBAC enforced).

Project Structure (quick)
-------------------------
- eStopLogger/ (backend)
  - src/main/java/com/example/demo/
    - controller/ -> REST controllers (EStopEventController, AnalyticsController, DatasetController, AuthController)
    - service/ -> core business logic (SafetyService, CorrelationService, RiskScoringService, NotificationService, EscalationService, SimulationService)
    - repository/ -> JPA repositories (EStopEventRepository, ScheduledWorkRepository, RiskScoreHistoryRepository)
    - model/entity/ -> JPA entities (EStopEvent, Station, ScheduledWork, Acknowledgement, RiskScoreHistory)
    - security/ -> JWT utilities and filter (JwtUtil, JwtFilter), SecurityConfig
    - scheduler/ -> scheduled jobs (RiskRecalculationJob)
    - config/ -> DataInitializer (dev seeding)
  - src/main/resources/data.sql -> optional SQL seed (uses CURDATE() to be relative)
  - mvnw, pom.xml

- Frontend/EstopUI/ (frontend)
  - src/pages/ -> pages (Dashboard, Events, Analytics, Audit, Datasets)
  - src/components/ -> UI components, ProtectedRoute
  - src/services/ -> api, authService, eventService, analyticsService
  - src/hooks/ -> useAccount, useToast
  - Vite dev server + proxy configured (api -> backend)

Key Concepts & Components
-------------------------
- SafetyService.processNewEvent(dto): Full event pipeline — create event, detect rapid sequence, correlate scheduled work, calculate risk score, set severity, update HMI state, send notifications, log audit.
- RiskScoreUtil: Calculates numeric risk and maps to RiskLevel/Severity.
- CorrelationService: Finds scheduled work that overlaps (by station OR factory+block within time window); fallback to same-day work.
- NotificationService: Builds dispatch notes (includes "Work Type" in notes) and triggers auto-dispatch to services.
- EscalationService: Periodic check for unacknowledged events, auto-dispatches and bumps severity (now uses risk-aware logic).
- RiskRecalculationJob: Weekly job that writes summarized risk into RiskScoreHistory (used by analytics if precomputed data exists).
- DataInitializer: Seeds scheduled work with rolling (today-based) windows to ensure correlation works in dev.
- Frontend: `useAccount` decodes JWT, auto-redirects on expiry; `api.ts` has interceptor that will attempt token refresh on 401 and retry queued requests.

How to Run Locally (quick)
--------------------------
1. Start the database (MySQL) and create schema `project` (user root/root recommended for dev).
2. Backend (from eStopLogger folder):

```powershell
cd c:\Users\2482837\Springboot\EStopLogger\eStopLogger
.\mvnw spring-boot:run
```

- The app seeds data if DB empty (DataInitializer). Defaults: port 9090.
- Config in `src/main/resources/application-dev.yml` (DB URL, JWT secret via `app.jwt.secret` can be set in env or properties).

3. Frontend (from Frontend/EstopUI):

```powershell
cd C:\Users\2482837\Springboot\EStopLogger\Frontend\EstopUI
npm install
npm run dev
```

- Vite runs (default 5173/5174). The frontend uses `/api` as baseURL and relies on Vite proxy to forward to `http://localhost:9090`.

Important REST Endpoints (examples)
-----------------------------------
- POST /api/auth/login — body: {username, password} → returns token & refreshToken
- POST /api/auth/refresh — body: {refreshToken} → returns new tokens
- GET /api/events/open — list open events
- GET /api/events/{id} — event detail (includes `workType` if correlated)
- POST /api/datasets/upload?type=scheduled_work — upload CSV to seed scheduled work
- POST /api/datasets/upload?type=estop_events — upload CSV of events (each goes through SafetyService)
- GET /api/analytics/trend?stationId=3&weeks=12 — station risk trend (aggregates from events)

Demo Script (step-by-step)
--------------------------
Prereq: backend running, frontend running, use seeded dev users (passwords usually "password123" unless changed).

1. Login as OPERATOR (e.g. `op_ravi`) on the frontend.
2. Dashboard: show KPI cards, high-risk stations. (If empty, run simulation)
3. Seed scheduled work (optional): Upload `scheduled_work.csv` via Datasets page or ensure `DataInitializer` seeded work.
4. Simulate events: On the backend call `/api/datasets/simulate?count=20` or use Simulation button on Datasets page.
5. Events page: view list, open Event Detail for an event — see severity, risk score, correlated work (fallback parses dispatch notes if workType missing).
6. Acknowledge: Click Acknowledge, choose resolution, submit — observe audit and HMI state update.
7. Escalation: To demo escalation, create an open event and wait >2 minutes (or adjust threshold in EscalationService for demo) to trigger auto-dispatch/escalation.
8. Analytics: Select a station and view Risk Trend chart (weekly avg risk). If empty, generate events and/or run `RiskRecalculationJob` manually.
9. Supervisor/Auditor flows: Login as `sup_anand`/`aud_meena` to view respective RBAC pages (analytics, audit).

Quick Commands for Testing
--------------------------
- Simulate 50 events:
  - POST /api/datasets/simulate?count=50 (via controller's simulate endpoint)
- Manually trigger weekly recalculation (for demo) — call scheduler method or run job from code (or change cron to run now).

Troubleshooting (common issues & fixes)
--------------------------------------
- CORS / Dev Proxy: Use Vite proxy — frontend `api.ts` uses baseURL `/api`. If CORS errors occur, ensure backend allows origin or use Vite proxy in `vite.config.ts`.
- `ONLY_FULL_GROUP_BY` SQL error: Aggregation queries must use GROUP BY-compatible expressions; code uses a subquery to avoid the MySQL mode issue. If you see errors, recompile after pulling latest changes.
- Severity vs risk mismatch: Fixed — SafetyService now sets severity from calculated risk, and EscalationService only escalates to at least HIGH (keeps CRITICAL if warranted).
- Correlated work missing: Ensure `ScheduledWork` exists for the station and time window (DataInitializer now seeds rolling windows); or upload scheduled_work CSV.
- Token expiry / auto logout: Frontend `useAccount` auto-redirects on expiry and `api.ts` attempts refresh with `refreshToken`. If refresh fails, user is logged out.

Developer Notes & Key Files (map)
---------------------------------
- Event pipeline: `SafetyService.java` (src/main/java/.../service)
- Risk scoring: `RiskScoreUtil.java`, `RiskScoringService.java`
- Correlation: `CorrelationService.java`, `ScheduledWorkRepository.java`
- Escalation: `EscalationService.java`, scheduled job configuration
- Notifications: `NotificationService.java` (buildDispatchNotes includes "Work Type")
- Analytics/trend: `EStopEventRepository.findWeeklyRiskTrendByStation(...)`, `AnalyticsController.java`
- CSV ingestion & simulation: `DatasetIngestionService.java`, `DatasetController.java`, `SimulationService.java`
- Security: `JwtUtil.java`, `JwtFilter.java`, `SecurityConfig.java` — auth + refresh flow
- Frontend: `src/pages/*` (Dashboard, Events, Analytics, Audit), `src/components/ProtectedRoute.tsx`, `src/hooks/useAccount.ts`

Demo Checklist (quick verification)
----------------------------------
- [ ] Backend running on :9090
- [ ] Frontend running via Vite and proxy working (`/api` calls succeed)
- [ ] Login as OPERATOR, SUPERVISOR, AUDITOR works
- [ ] Events can be created (simulation or CSV) and appear in Events page
- [ ] Correlated work appears on event detail (or fallback parsed from dispatch notes)
- [ ] Acknowledge flow logs audit and updates status
- [ ] Escalation auto-dispatch triggers (or simulate by adjusting time threshold)
- [ ] Analytics Trend shows data after simulating events

Next Steps (optional)
---------------------
- I can generate a one-page slide (Markdown → PDF) that summarizes the demo script with screenshots.
- I can produce a short curl script that runs the entire demo programmatically (seed data, simulate events, query APIs).

Contact / Notes
---------------
If you want the demo tailored (short 5-minute vs full 20-minute walkthrough), tell me which flows to prioritize and I will produce a timed script with exact commands and UI clicks.

# E-Stop Logger — Complete Backend Debug Guide

> Every file, every class, every DTO, every flow — explained in order of execution.

---

## TABLE OF CONTENTS

1. [How the Application Starts](#1-how-the-application-starts)
2. [Configuration Files — What Runs Before Any Request](#2-configuration-files)
3. [Database — Schema & Tables](#3-database-schema)
4. [Enums — All Constants Used Across the App](#4-enums)
5. [Entities — Java Classes That Map to DB Tables](#5-entities)
6. [DTOs — Why We Use Them and What Each One Does](#6-dtos)
7. [Security Layer — Full Request Chain](#7-security-layer)
8. [Auth Flow — Login & Register (End to End)](#8-auth-flow)
9. [E-Stop Event Flow — Creating an Event (End to End)](#9-estop-event-flow)
10. [Escalation Flow — What Happens After 2 Minutes](#10-escalation-flow)
11. [Acknowledgement Flow — Two-Step Workflow](#11-acknowledgement-flow)
12. [Supporting Services — Correlation, Risk, HMI, Notification, Audit](#12-supporting-services)
13. [Analytics, Datasets, Stations, Factories](#13-other-controllers)
14. [Scheduled Jobs — Background Tasks](#14-scheduled-jobs)
15. [Utility Classes](#15-utility-classes)
16. [Exception Handling](#16-exception-handling)
17. [Complete File Execution Order — One E-Stop Press](#17-complete-file-execution-order)
18. [API Endpoints Summary](#18-api-endpoints)
19. [Why We Use Each DTO — Quick Reference](#19-dto-quick-reference)

---

## 1. HOW THE APPLICATION STARTS

### `EStopLoggerApplication.java`
```
Location: com.example.demo
Annotations: @SpringBootApplication, @EnableScheduling
```

This is the **entry point**. When you run this class:

1. `SpringApplication.run()` starts the embedded Tomcat server on port **9090** (from `application.yml`).
2. `@SpringBootApplication` = `@Configuration` + `@EnableAutoConfiguration` + `@ComponentScan`.
   - **@ComponentScan** scans all packages under `com.example.demo` and finds every class annotated with `@Service`, `@Repository`, `@Controller`, `@Component`, `@Configuration`.
   - **@EnableAutoConfiguration** auto-configures MySQL connection pool (HikariCP), JPA/Hibernate, Spring Security, etc.
3. `@EnableScheduling` activates the scheduler — without this, `@Scheduled` methods in `EscalationJob` and `RiskRecalculationJob` would never run.

### Boot sequence (what Spring does internally):
```
1. Read application.yml → port 9090, active profile
2. Read application-dev.yml → MySQL connection (localhost:3306/project, root/root)
3. Run schema.sql → CREATE TABLE IF NOT EXISTS for all 8 tables
4. Run data.sql → seed data (factories, stations, etc.)
5. Run DataInitializer.java → seeds scheduled_work for today
6. Create all @Bean objects (SecurityConfig, CorsConfig, etc.)
7. Create all @Service, @Repository, @Controller singletons
8. Start Tomcat → ready to accept requests on port 9090
9. Start scheduler threads → EscalationJob runs every 30s
```

---

## 2. CONFIGURATION FILES

### `application.yml` (always loaded)
```yaml
server.port: 9090                              # Tomcat listens here
spring.jpa.open-in-view: false                 # Prevents lazy-loading bugs
app.jwt.secret: Y29tLmV4YW1wbGUu...           # Base64-encoded HMAC key
app.jwt.expiration-ms: 86400000                # 24 hours in milliseconds
app.cors.allowed-origins: http://localhost:5173 # React dev server
```

### `application-dev.yml` (loaded when profile = dev)
```yaml
spring.datasource.url: jdbc:mysql://localhost:3306/project
spring.datasource.username: root
spring.datasource.password: root
spring.jpa.hibernate.ddl-auto: update    # Auto-create/update tables from entities
spring.jpa.show-sql: true               # Print SQL in console
spring.sql.init.mode: never             # Don't run schema.sql (ddl-auto handles it)
```

### `SecurityConfig.java`
```
Location: com.example.demo.config
Annotations: @Configuration, @EnableWebSecurity, @EnableMethodSecurity
```
**What it does:**
- Disables CSRF (REST API doesn't use browser sessions)
- Sets session management to STATELESS (every request must carry JWT)
- Adds `JwtFilter` BEFORE Spring's default `UsernamePasswordAuthenticationFilter`
- Defines URL access rules:

| URL Pattern | Who Can Access | Why |
|---|---|---|
| `/api/auth/**` | Everyone (permitAll) | Login/register need no token |
| `/swagger-ui/**` | Everyone | API docs |
| `/api/datasets/**` | SUPERVISOR only | Only supervisors upload CSV data |
| `/api/analytics/**` | Any authenticated user | Dashboard needs this |
| `/api/audit/**` | AUDITOR only | Audit logs are sensitive |
| `POST /api/acknowledgements/*/resolve` | SUPERVISOR only | Only supervisors close tickets |
| `/api/acknowledgements/**` | OPERATOR or SUPERVISOR | Both can acknowledge |
| `/api/events/**` | OPERATOR or SUPERVISOR | Both can create/view events |
| `/api/stations/**`, `/api/factories/**` | Any authenticated user | Dropdown data |

- Creates `AuthenticationManager` bean (used by `UserService.login()`)
- Creates `BCryptPasswordEncoder` bean (used for password hashing)

**Why `@EnableMethodSecurity`?** — It enables `@PreAuthorize` on controller methods, so you can do fine-grained role checks like `@PreAuthorize("hasRole('SUPERVISOR')")`.

### `CorsConfig.java`
```
Annotations: @Configuration
```
**What it does:** Allows the React frontend (localhost:5173) to call the backend (localhost:9090). Without this, browsers block cross-origin requests.

Configured:
- Allowed origins: `http://localhost:5173` (from `app.cors.allowed-origins`)
- Allowed methods: GET, POST, PUT, DELETE, PATCH, OPTIONS
- Allow credentials: true (needed for cookies/auth headers)
- Max age: 3600s (browser caches preflight for 1 hour)

### `SchedulerConfig.java`
```
Annotations: @Configuration, @EnableScheduling
Implements: SchedulingConfigurer
```
**What it does:** Creates a thread pool with **3 threads** for background jobs. Without this, all `@Scheduled` methods would share a single thread and could block each other.

### `SwaggerConfig.java`
```
Annotations: @Configuration
```
**What it does:** Sets up OpenAPI 3 / Swagger UI with Bearer JWT security scheme. After starting the backend, you can visit `http://localhost:9090/swagger-ui.html` to see all endpoints.

### `DataInitializer.java`
```
Annotations: @Component
Implements: CommandLineRunner (runs on startup)
```
**What it does:** Seeds 5 `scheduled_work` entries for TODAY (06:00–18:00) across different stations if the table is empty. This ensures the correlation service always has work to match against.

---

## 3. DATABASE SCHEMA

8 tables, created by `schema.sql`:

```
┌──────────────┐     ┌──────────────┐
│   factory    │────<│   station    │
└──────────────┘     └──────┬───────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
┌────────▼───────┐  ┌───────▼────────┐  ┌─────▼──────────┐
│ scheduled_work │  │   app_user     │  │  estop_event   │
└────────────────┘  └────────────────┘  └───────┬────────┘
                                                │
                    ┌───────────────────────────┬┼──────────────┐
                    │                           ││              │
             ┌──────▼──────┐  ┌────────────────▼▼┐  ┌─────────▼────┐
             │ audit_log   │  │ acknowledgement  │  │ dispatch_log │
             └─────────────┘  └──────────────────┘  └──────────────┘

                    ┌───────────────────┐
                    │ risk_score_history │  (standalone tracking)
                    └───────────────────┘
```

### Table details:

| Table | PK | Key columns | Purpose |
|---|---|---|---|
| `factory` | `factory_id` (VARCHAR) | factory_name, location | Factory master data |
| `station` | `station_id` (BIGINT AUTO) | factory_id (FK), block_id, station_name, current_hmi_state | Station with HMI light |
| `app_user` | `user_id` (BIGINT AUTO) | username (UNIQUE), password (BCrypt), role, assigned_station_id (FK), shift | System users |
| `scheduled_work` | `work_id` (BIGINT AUTO) | station_id (FK), factory_id (FK), block_id, work_type, probable_emergency, instant_help, start_time, end_time, risk_level | Work schedules for correlation |
| `estop_event` | `event_id` (BIGINT AUTO) | station_id (FK), factory_id (FK), block_id, pressed_at, event_status, severity, is_rapid_sequence, correlated_work_id (FK), risk_score | Core event table |
| `acknowledgement` | `ack_id` (BIGINT AUTO) | event_id (FK, UNIQUE), user_id (FK), resolution_category, ack_within_threshold | One ack per event |
| `dispatch_log` | `dispatch_id` (BIGINT AUTO) | event_id (FK), dispatch_type, trigger_reason, response_status, notes | Help dispatched log |
| `audit_log` | `audit_id` (BIGINT AUTO) | event_id (FK), action, performed_by (FK), timestamp, details | Immutable action log |
| `risk_score_history` | `id` (BIGINT AUTO) | station_id (FK), work_type, risk_score, week_number, event_count | Weekly risk trends |

---

## 4. ENUMS

Enums are constant values stored as strings in the DB. Here's every enum and what it means:

### `EventStatus` — lifecycle of an E-Stop event
```
OPEN              → Just created, waiting for response
ACKNOWLEDGED      → Someone saw it and responded
ESCALATED         → (reserved for future use)
CRITICAL          → (reserved — severity handles this now)
AUTO_DISPATCHED   → Nobody responded in 2 min → system auto-dispatched help
RELEASED          → Operator pressed E-Stop again (double-press = release)
RESOLVED          → Supervisor closed the ticket — danger is over
```

### `UserRole` — who can do what
```
OPERATOR    → Creates events, acknowledges events
SUPERVISOR  → Acknowledges events + closes tickets + uploads datasets
AUDITOR     → Views audit logs + exports CSV reports
```

### `Severity` — how bad is the event
```
LOW       → risk score 0-25
MEDIUM    → risk score 26-50 (default on creation)
HIGH      → risk score 51-75
CRITICAL  → risk score 76-100
```

### `DispatchType` — what help was sent
```
AMBULANCE         → Mechanical work injuries
FIRE_DEPT         → Welding/fire related
ALL_EMERGENCY     → Electrical/chemical — send everyone
SUPERVISOR_ALERT  → No specific work found — just alert supervisor
SECURITY          → (reserved)
```

### `ResolutionCategory` — why was E-Stop pressed (selected during ack)
```
REAL_EMERGENCY       → Actual danger — triggers additional dispatch
FALSE_ALARM          → Accidentally pressed
TESTING_MAINTENANCE  → Routine test
MACHINE_FAULT        → Equipment malfunction
CUSTOM_RESOLUTION    → Free text explanation
```

### `HmiState` — factory floor light indicator
```
RED    → Active danger (at least one unresolved event at station)
GREEN  → All clear (no active events)
```

### Other enums:
- `RiskLevel`: LOW, MEDIUM, HIGH, CRITICAL (for scheduled_work)
- `ShiftType`: MORNING, AFTERNOON, NIGHT
- `ResponseStatus`: DISPATCHED, RESPONDED, RESOLVED
- `StationStatus`: ACTIVE, INACTIVE, MAINTENANCE

---

## 5. ENTITIES — Java Classes That Map to DB Tables

**Why entities?** Each entity class = one database table. JPA/Hibernate automatically converts between Java objects and SQL rows.

### `AppUser.java` → `app_user` table
```java
@Entity @Table(name = "app_user")
Fields:
  userId         (Long, PK, auto-generated)
  username       (String, unique, max 50)
  password       (String, stores BCrypt hash — NEVER plain text)
  fullName       (String)
  role           (UserRole enum → stored as "OPERATOR"/"SUPERVISOR"/"AUDITOR")
  assignedStation (Station entity, FK → station.station_id)
  shift          (ShiftType enum)
  createdAt      (LocalDateTime, set automatically by @PrePersist)
```

### `EStopEvent.java` → `estop_event` table
```java
@Entity @Table(name = "estop_event")
Fields:
  eventId         (Long, PK)
  station         (Station, FK → eager loaded)
  factory         (Factory, FK → eager loaded)
  blockId         (String)
  pressedAt       (LocalDateTime — when button was physically pressed)
  eventStatus     (EventStatus enum, default OPEN)
  severity        (Severity enum, default MEDIUM)
  isRapidSequence (Boolean, default false — set true on double-press)
  correlatedWork  (ScheduledWork, FK → set during escalation after 2 min)
  riskScore       (Integer, default 0 — calculated during escalation)
  createdAt       (LocalDateTime, @PrePersist)
```

### `Acknowledgement.java` → `acknowledgement` table
```java
@Entity @Table(name = "acknowledgement")
Fields:
  ackId                (Long, PK)
  event                (EStopEvent, @OneToOne, UNIQUE — only ONE ack per event)
  user                 (AppUser, FK — who acknowledged)
  acknowledgedAt       (LocalDateTime)
  resolutionCategory   (ResolutionCategory enum — why E-Stop was pressed)
  customResolutionText (String — free text if category = CUSTOM_RESOLUTION)
  ackWithinThreshold   (Boolean — was it acked within 2 minutes?)
  createdAt            (LocalDateTime, @PrePersist)
```
**Why @OneToOne with unique?** An event can only be acknowledged ONCE. Trying again throws `DuplicateAckException`.

### `DispatchLog.java` → `dispatch_log` table
```java
@Entity @Table(name = "dispatch_log")
Fields:
  dispatchId     (Long, PK)
  event          (EStopEvent, FK — @ManyToOne, one event can have MULTIPLE dispatches)
  dispatchType   (DispatchType enum)    
  dispatchedAt   (LocalDateTime)
  triggerReason  (String — "Unacknowledged E-Stop event for >2 minutes during Electrical")
  responseStatus (ResponseStatus, default DISPATCHED)
  notes          (String — "Station: X, Block: B1, Work Type: Electrical")
```

### `AuditLog.java` → `audit_log` table
```java
@Entity @Table(name = "audit_log")
Fields:
  auditId     (Long, PK)
  event       (EStopEvent, FK — nullable for non-event actions)
  action      (String — "E-STOP_PRESSED", "ACKNOWLEDGED", "AUTO_DISPATCHED", etc.)
  performedBy (Long — userId, nullable for system actions like auto-dispatch)
  timestamp   (LocalDateTime, @PrePersist defaults to now)
  details     (String — human-readable description)
  ipAddress   (String — reserved for future use)
```
**Key rule:** Audit logs are NEVER updated or deleted. They're immutable.

### `Station.java` → `station` table
```java
Fields: stationId, factoryId (FK), blockId, stationName, status (StationStatus), currentHmiState (HmiState), createdAt
```

### `Factory.java` → `factory` table
```java
Fields: factoryId (String PK — like "100091"), factoryName, location, createdAt
```
**Note:** factoryId is a STRING, not a number. This is because factory codes can be alphanumeric.

### `ScheduledWork.java` → `scheduled_work` table
```java
Fields: workId, station (FK), factory (FK), blockId, workType, probableEmergency, instantHelp, startTime, endTime, riskLevel (RiskLevel), createdAt
```
**Key fields:**
- `probableEmergency` = "Health/Fire/Machine" — what could go wrong
- `instantHelp` = "Send Ambulance/Fire Dept" — what help to send
- `workType` = "Electrical" / "Chemical Handling" / "Welding" / "Mechanical Maintenance"

### `RiskScoreHistory.java` → `risk_score_history` table
```java
Fields: id, stationId, workType, riskScore, weekNumber, eventCount, calculatedAt
```
Used for weekly risk score trend charts.

---

## 6. DTOs — WHY WE USE THEM AND WHAT EACH ONE DOES

**Why DTOs?** DTOs (Data Transfer Objects) are the "public face" of your API. You NEVER expose raw entities to the frontend because:
1. Entities have sensitive data (like BCrypt password hashes)
2. Entities have circular references (event → station → events → crash)
3. You want to control exactly what the frontend sees
4. Validation annotations (`@NotBlank`, `@NotNull`) belong on input DTOs, not entities

### Auth DTOs

#### `LoginRequestDTO` — Frontend sends this to `POST /api/auth/login`
```java
Fields:
  username  (@NotBlank — validation fails if empty)
  password  (@NotBlank)
```
**Used by:** `AuthController.login()` → `UserService.login()`

#### `RegisterRequestDTO` — Frontend sends this to `POST /api/auth/register`
```java
Fields:
  username    (@NotBlank)
  password    (@NotBlank)
  fullName    (@NotBlank)
  role        (@NotNull, UserRole enum)
  assignedStationId  (optional Long)
  shift              (optional ShiftType)
```
**Used by:** `AuthController.register()` → `UserService.register()`

#### `LoginResponseDTO` — Backend sends this back after login/register
```java
Fields:
  token             (JWT string — "eyJhbGciOi...")
  role              ("OPERATOR" / "SUPERVISOR" / "AUDITOR")
  userId            (Long)
  username          (String)
  fullName          (String)
  assignedStationId (Long — which station they're assigned to)
  shift             ("MORNING" / "AFTERNOON" / "NIGHT")
```
**Used by:** `UserService.login()` and `UserService.register()` build this and return it.
**Why?** Frontend stores the token in localStorage and sends it with every request. Also shows user's name, role, station in the UI.

### Event DTOs

#### `EStopEventDTO` — Used for BOTH input (creating event) and output (returning event)
```java
Input fields (for POST /api/events):
  stationId   (@NotNull)
  factoryId   (@NotBlank)
  blockId     (@NotBlank)
  pressedAt   (optional — defaults to now)

Output fields (returned by GET /api/events):
  eventId, stationId, factoryId, blockId, pressedAt,
  eventStatus, severity, isRapidSequence, correlatedWorkId,
  riskScore, stationName, factoryName, workType,
  probableEmergency, instantHelp, createdAt
```
**Used by:** `EStopEventController` — the controller has a `toDTO(event)` method that maps entity → DTO.
**Why extra fields like stationName, workType?** So the frontend doesn't need to make additional API calls to get station/work names.

#### `DispatchDTO` — Returned by `GET /api/events/{id}/dispatches`
```java
Fields:
  dispatchId, eventId, dispatchType, dispatchedAt,
  triggerReason, responseStatus, notes
```
**Used by:** `EStopEventController.getDispatches()` maps `DispatchLog` → `DispatchDTO`.

### Acknowledgement DTOs

#### `AckRequestDTO` — Frontend sends this to `POST /api/acknowledgements/{id}/acknowledge`
```java
Fields:
  resolutionCategory  (@NotNull — ResolutionCategory enum)
  customResolutionText (optional String — required if category is CUSTOM_RESOLUTION)
```
**Used by:** `AcknowledgementController.acknowledgeEvent()` → `AcknowledgementService.acknowledgeEvent()`

#### `AckResponseDTO` — Backend returns this after acknowledgement or via `GET /api/acknowledgements/{id}`
```java
Fields:
  ackId, eventId, username (full name of person who acked),
  role (their role), acknowledgedAt, resolutionCategory,
  customResolutionText, ackWithinThreshold
```
**Used by:** `AcknowledgementService` builds this from the `Acknowledgement` entity + `AppUser`.
**Why `username` is full name?** Because the frontend shows "Acknowledged by: John Doe" not "Acknowledged by: jdoe123".

### Audit DTOs

#### `AuditLogDTO` — Returned by `GET /api/audit/logs`
```java
Fields: auditId, eventId, action, performedBy, timestamp, details
```

#### `EventTimelineDTO` — Returned by `GET /api/audit/event/{id}/timeline`
```java
Fields: entries (List of timeline entries with action + timestamp + details)
```
**Used by:** EventDetailPage shows a visual stepper of what happened to the event.

### Analytics DTOs

#### `DashboardSummaryDTO` — Returned by `GET /api/analytics/dashboard`
```java
Fields: totalEventsToday, totalEventsThisWeek, avgResponseTimeSeconds,
        eventsBySeverity (Map), eventsByStatus (Map), eventsByShift (Map),
        highRiskStations (List<StationRiskDTO>)
```

#### `FrequencyDTO` — Returned by `GET /api/analytics/frequency`
```java
Fields: label (e.g. "10 AM", "MORNING", "Monday"), count (Long)
```

#### `StationRiskDTO` — Nested in DashboardSummaryDTO
```java
Fields: stationId, stationName, totalEvents, avgRiskScore, latestRiskScore
```

#### `StationStatusDTO` — Returned by `GET /api/stations`
```java
Fields: stationId, stationName, factoryId, factoryName, blockId,
        status, hmiState, activeEventCount
```

#### `ShiftReportDTO` — Returned by `GET /api/analytics/shift-report`
```java
Fields: shift, eventCount, avgAckTimeSeconds, resolvedCount, unresolvedCount
```

### Other DTOs

#### `DatasetStatusDTO` — Returned by `GET /api/datasets/status`
```java
Fields: datasetName, totalRows, successRows, failedRows, errors (List<String>)
```

#### `ApiResponse<T>` — EVERY response is wrapped in this
```java
Fields:
  success  (boolean)
  message  (String — "Login successful", "Event acknowledged", "Validation failed: ...")
  data     (T — the actual payload, can be null)
```
**Why?** Consistent response format. Frontend always checks `response.data.success` first.

Three factory methods:
- `ApiResponse.success(data)` → `{success: true, message: "Success", data: ...}`
- `ApiResponse.success("msg", data)` → `{success: true, message: "msg", data: ...}`
- `ApiResponse.error("msg")` → `{success: false, message: "msg", data: null}`

---

## 7. SECURITY LAYER — Full Request Chain

Every HTTP request goes through this chain:
```
HTTP Request
    │
    ▼
CorsConfig (allow/block cross-origin)
    │
    ▼
JwtFilter.doFilterInternal()     ← extracts & validates JWT
    │
    ▼
SecurityConfig (URL permission check)
    │
    ▼
@PreAuthorize (method-level role check)
    │
    ▼
Controller method executes
```

### `JwtUtil.java` — Creates and validates JWT tokens
```
Location: com.example.demo.security
Annotation: @Component
```

**Constructor:**
- Reads `app.jwt.secret` from config → Base64 decodes → creates HMAC-SHA SecretKey
- Reads `app.jwt.expiration-ms` → default 86400000ms (24 hours)

**Methods:**
| Method | What it does | Called by |
|---|---|---|
| `generateToken(username, claims)` | Builds JWT with subject=username, custom claims (userId, role, stationId, shift), expiry=24h, signs with HMAC key | `UserService.login()` |
| `validateToken(token)` | Parses JWT, checks signature + expiry. Returns false if invalid/expired | `JwtFilter` |
| `extractUsername(token)` | Returns the "subject" field from JWT payload | `JwtFilter` |
| `extractClaim(token, key)` | Returns any custom claim (e.g., "role", "userId") | Anywhere that needs claims |

### `JwtFilter.java` — Runs on EVERY request
```
Annotation: @Component
Extends: OncePerRequestFilter
```

**`doFilterInternal(request, response, chain)`:**
1. Gets `Authorization` header from request
2. If header starts with `"Bearer "` → extracts token string
3. Calls `jwtUtil.validateToken(token)` → if invalid, skips (request will fail at SecurityConfig)
4. If valid → `jwtUtil.extractUsername(token)` → gets "john_operator"
5. Calls `customUserDetailsService.loadUserByUsername("john_operator")` → gets UserDetails with roles
6. Creates `UsernamePasswordAuthenticationToken(userDetails, null, authorities)`
7. Sets it in `SecurityContextHolder.getContext().setAuthentication(auth)`
8. Calls `chain.doFilter()` → passes to next filter / controller

**Why SecurityContextHolder?** This is Spring Security's per-request storage for "who is the current user". Controllers access it via the `Authentication` parameter. It's automatically cleared after the request.

### `CustomUserDetailsService.java` — Bridges our AppUser to Spring Security
```
Annotation: @Service
Implements: UserDetailsService (Spring Security interface)
```

**`loadUserByUsername(username)`:**
1. Queries `userRepository.findByUsername(username)` → finds AppUser in DB
2. If not found → throws `UsernameNotFoundException` → returns 401
3. If found → wraps into Spring's `User` object with:
   - username
   - password (BCrypt hash)
   - authorities = `["ROLE_OPERATOR"]` or `["ROLE_SUPERVISOR"]` or `["ROLE_AUDITOR"]`

**Why prefix with ROLE_?** Spring Security's `hasRole('SUPERVISOR')` internally looks for authority `"ROLE_SUPERVISOR"`. You must add the prefix here.

---

## 8. AUTH FLOW — Login & Register (End to End)

### Login: `POST /api/auth/login`

```
Frontend sends: { "username": "john", "password": "password123" }

File execution order:
1. JwtFilter        → no token yet, skips authentication (this is a public endpoint)
2. SecurityConfig   → /api/auth/** is permitAll → passes
3. AuthController.login()
   → receives LoginRequestDTO (validated: username & password not blank)
   → calls UserService.login(dto)

4. UserService.login():
   a. authenticationManager.authenticate(
        new UsernamePasswordAuthenticationToken(username, password)
      )
      → This internally calls CustomUserDetailsService.loadUserByUsername()
      → Loads AppUser from DB
      → BCrypt.matches(rawPassword, storedHash) → if wrong → BadCredentialsException → 401
   
   b. userRepository.findByUsername(username) → loads full AppUser
   
   c. Builds claims map:
      { "userId": 1, "role": "OPERATOR", "assignedStationId": 3, "shift": "MORNING" }
   
   d. jwtUtil.generateToken("john", claims) → returns JWT string
   
   e. Builds LoginResponseDTO:
      { token: "eyJ...", role: "OPERATOR", userId: 1, username: "john",
        fullName: "John Doe", assignedStationId: 3, shift: "MORNING" }

5. AuthController wraps in ApiResponse:
   { success: true, message: "Login successful", data: { token: "eyJ...", ... } }

6. Frontend stores token in localStorage, redirects to dashboard
```

### Register: `POST /api/auth/register`

```
Frontend sends: { "username": "jane", "password": "pass", "fullName": "Jane Smith",
                  "role": "SUPERVISOR", "assignedStationId": 2, "shift": "AFTERNOON" }

File execution order:
1. AuthController.register() → UserService.register(dto)

2. UserService.register():
   a. userRepository.existsByUsername("jane") → if true → throw IllegalArgumentException("Username taken")
   b. passwordEncoder.encode("pass") → "$2a$10$xYz..." (BCrypt hash with random salt)
   c. Builds AppUser entity:
      { username: "jane", password: "$2a$10$xYz...", fullName: "Jane Smith",
        role: SUPERVISOR, assignedStation: Station(id=2), shift: AFTERNOON }
   d. userRepository.save(appUser) → INSERT INTO app_user
   e. Calls login() internally → returns JWT immediately (auto-login after register)
```

---

## 9. E-STOP EVENT FLOW — Creating an Event (End to End)

### `POST /api/events` — Operator presses E-Stop button

```
Frontend sends: { "stationId": 3, "factoryId": "100091", "blockId": "B2" }
+ Header: Authorization: Bearer eyJ...

File execution order:

1. JwtFilter.doFilterInternal()
   → Extracts "Bearer eyJ..."
   → jwtUtil.validateToken() → true
   → jwtUtil.extractUsername() → "john"
   → CustomUserDetailsService.loadUserByUsername("john")
   → Sets SecurityContext with ROLE_OPERATOR

2. SecurityConfig
   → /api/events/** requires OPERATOR or SUPERVISOR → passes

3. EStopEventController.createEvent(EStopEventDTO dto)
   → @Valid validates: stationId not null, factoryId not blank, blockId not blank
   → Calls SafetyService.processNewEvent(dto)

4. SafetyService.processNewEvent(dto):
   a. stationRepository.findById(3) → loads Station entity
      → If not found → ResourceNotFoundException → 404
   b. factoryRepository.findById("100091") → loads Factory entity
      → If not found → ResourceNotFoundException → 404
   c. Sets pressedAt = now (if not provided in DTO)
   d. Builds EStopEvent:
      { station: Station(3), factory: Factory("100091"), blockId: "B2",
        pressedAt: now, eventStatus: OPEN, severity: MEDIUM,
        isRapidSequence: false, riskScore: 0 }
   e. eventRepository.save(event) → INSERT INTO estop_event → gets eventId = 42
   
   f. RAPID SEQUENCE CHECK:
      → findRecentOpenEvents(stationId=3, pressedAt=now, currentEventId=42)
      → Queries: SELECT * FROM estop_event
                 WHERE station_id=3
                 AND pressed_at BETWEEN (now - 5 seconds) AND now
      → Filters: status=OPEN AND eventId != 42 (exclude self)
      → If found → this is a DOUBLE-PRESS (release):
         - Original event → RELEASED, isRapidSequence=true
         - This event → RELEASED, severity=LOW
         - hmiService.refreshHmiState() → may turn GREEN
         - Audit: "E-STOP_RELEASED"
         - RETURN immediately (no correlation/risk/dispatch)
      → If NOT found → continue normally
   
   g. eventRepository.save(event) → UPDATE (still OPEN, severity MEDIUM, risk 0)
   
   h. hmiService.updateState(stationId=3, RED)
      → UPDATE station SET current_hmi_state='RED' WHERE station_id=3
   
   i. auditService.logAction(event, "E-STOP_PRESSED", null, "Station X, Block B2, Factory Y")
      → INSERT INTO audit_log
   
   j. Returns EStopEvent entity

5. EStopEventController.toDTO(event)
   → Maps entity to EStopEventDTO:
     { eventId: 42, stationId: 3, factoryId: "100091", blockId: "B2",
       pressedAt: "2026-04-18T10:30:00", eventStatus: "OPEN", severity: "MEDIUM",
       isRapidSequence: false, correlatedWorkId: null, riskScore: 0,
       stationName: "Station C", factoryName: "Main Plant",
       workType: null, probableEmergency: null, instantHelp: null }  

6. Returns HTTP 201:
   { success: true, message: "E-Stop event created", data: { eventId: 42, ... } }
```

**IMPORTANT:** Notice that `correlatedWork`, `riskScore`, and `severity` are all at their defaults (null, 0, MEDIUM). These are NOT set during event creation. They are set by the **EscalationService** after the 2-minute threshold.

### `POST /api/events/{id}/release` — Operator presses E-Stop again (release)

```
File execution order:
1. JwtFilter → SecurityConfig → passes
2. EStopEventController.releaseEvent(id=42)
3. SafetyService.releaseEvent(42):
   a. eventRepository.findById(42) → loads event
   b. Validates: status must be OPEN/ESCALATED/CRITICAL/AUTO_DISPATCHED
      → If ACKNOWLEDGED/RESOLVED → IllegalStateException → 400
   c. event.setIsRapidSequence(true)
   d. event.setEventStatus(RELEASED)
   e. eventRepository.save() → UPDATE estop_event SET event_status='RELEASED'
   f. hmiService.refreshHmiState(stationId) → recalculates → maybe GREEN
   g. auditService.logAction() → INSERT audit_log
4. Returns updated event DTO with status=RELEASED
```

---

## 10. ESCALATION FLOW — What Happens After 2 Minutes

### `EscalationJob.java` — The scheduler
```
Location: com.example.demo.scheduler
Annotations: @Component
```

```java
@Scheduled(fixedRate = 30000) // runs every 30 seconds
public void runEscalationCheck() {
    escalationService.checkAndEscalateAll();
}
```
This runs automatically in a background thread. No HTTP request needed.

### `EscalationService.checkAndEscalateAll()`

```
Execution (runs every 30 seconds):

1. threshold = now - 120 seconds (2 minutes ago)

2. eventRepository.findUnacknowledgedBefore(OPEN, threshold)
   → SQL: SELECT * FROM estop_event
          WHERE event_status = 'OPEN'
          AND pressed_at < (now - 2 minutes)
   → Returns all OPEN events that nobody acknowledged within 2 min

3. For EACH such event, calls escalate(event):

   a. CorrelationService.correlate(event):
      → Try 1: scheduledWorkRepository.findOverlappingWork(stationId, factoryId, blockId, pressedAt)
         SQL: SELECT * FROM scheduled_work
              WHERE (station_id = :stationId OR (factory_id = :factoryId AND block_id = :blockId))
              AND :pressedAt BETWEEN start_time AND end_time
      → Try 2 (if empty): findSameDayWork() — same station, same day
      → Try 3 (if empty): findByStation_StationId() — ANY work at that station
      → Returns highest-risk ScheduledWork, or null
   
   b. event.setCorrelatedWork(work) → UPDATE estop_event SET correlated_work_id = work_id
      (NOW the correlated work shows up on the frontend!)
   
   c. RiskScoringService.calculateRiskScore(event):
      → Gets workType from correlated work (e.g., "Electrical")
      → Counts events at station this week: eventRepository.countByStationSince()
      → Checks TimeUtil.isHistoricallyRiskyHour() → true if 10AM-2PM
      → Calls RiskScoreUtil.calculateRiskScore():
        score = baseScore(workType) + frequencyBonus + timeBonus + rapidBonus
        
        | Component | Calculation |
        |---|---|
        | baseScore | chemical=90, electrical=70, welding=50, mechanical=30, none=10 |
        | frequencyBonus | eventsThisWeek × 5, capped at 25 |
        | timeBonus | +15 if hour is 10AM-2PM |
        | rapidBonus | +25 if rapid sequence |
        | TOTAL | capped at 100 |
      
      → Returns e.g. 85
   
   d. event.setRiskScore(85)
   e. event.setEventStatus(AUTO_DISPATCHED)
   f. Severity = RiskScoreUtil.toSeverity(85) = CRITICAL (since >75)
      → At minimum HIGH (escalation never sets lower than HIGH)
   
   g. NotificationService.autoDispatch(event, work, reason):
      → determineDispatchType(work):
         electrical/chemical → ALL_EMERGENCY
         welding → FIRE_DEPT
         mechanical → AMBULANCE
         null/unknown → SUPERVISOR_ALERT
      → Creates DispatchLog:
        { event, dispatchType: ALL_EMERGENCY, triggerReason: "Unacknowledged >2 min during Electrical",
          notes: "Station: C, Block: B2, Factory: Main Plant, Work Type: Electrical, Probable Emergency: Health/Fire" }
      → dispatchLogRepository.save() → INSERT INTO dispatch_log
   
   h. NotificationService.alertSupervisor(event):
      → Creates SECOND DispatchLog with type=SUPERVISOR_ALERT
      → INSERT INTO dispatch_log
   
   i. auditService.logAction(event, "AUTO_DISPATCHED", null, reason)
      → INSERT INTO audit_log
   
   j. hmiService.updateState(stationId, RED) → stays RED
   
   k. eventRepository.save(event) → UPDATE estop_event:
      SET event_status='AUTO_DISPATCHED', severity='CRITICAL',
          risk_score=85, correlated_work_id=1
```

**This is why correlated work, risk score, severity, and dispatch info only appear AFTER 2 minutes — they're all calculated during escalation, not during event creation.**

---

## 11. ACKNOWLEDGEMENT FLOW — Two-Step Workflow

### Step 1: Acknowledge — `POST /api/acknowledgements/{eventId}/acknowledge`

```
Frontend sends: { "resolutionCategory": "REAL_EMERGENCY", "customResolutionText": "" }
+ Header: Authorization: Bearer eyJ... (OPERATOR or SUPERVISOR)

File execution order:

1. JwtFilter → validates token → sets SecurityContext
2. SecurityConfig → /api/acknowledgements/** requires OPERATOR or SUPERVISOR → passes
3. @PreAuthorize("hasAnyRole('OPERATOR','SUPERVISOR')") on method → passes
4. AcknowledgementController.acknowledgeEvent(eventId, AckRequestDTO, authentication)
   → Gets username from authentication.getName()
   → Calls AcknowledgementService.acknowledgeEvent(eventId, dto, username)

5. AcknowledgementService.acknowledgeEvent():
   a. eventRepository.findById(eventId) → loads event → 404 if not found
   
   b. ackRepository.findByEvent_EventId(eventId) → checks for existing ack
      → If exists → throw DuplicateAckException → 409 Conflict
   
   c. userRepository.findByUsername(username) → loads AppUser
   
   d. Calculates ackWithinThreshold:
      Duration.between(event.getPressedAt(), now).getSeconds() <= 120 (2 min)
      → true if acked within 2 min, false if after
   
   e. Validates CUSTOM_RESOLUTION:
      → If category = CUSTOM_RESOLUTION and customResolutionText is blank
      → throw IllegalArgumentException → 400
   
   f. Builds Acknowledgement entity:
      { event, user, acknowledgedAt: now, resolutionCategory: REAL_EMERGENCY,
        customResolutionText: "", ackWithinThreshold: false }
   g. ackRepository.save() → INSERT INTO acknowledgement
   
   h. event.setEventStatus(ACKNOWLEDGED)
   i. eventRepository.save() → UPDATE estop_event SET event_status='ACKNOWLEDGED'
      NOTE: HMI stays RED! Acknowledged ≠ resolved.
   
   j. auditService.logAction(event, "ACKNOWLEDGED", user, ...)
      → INSERT INTO audit_log
   
   k. IF resolutionCategory == REAL_EMERGENCY:
      → NotificationService.sendDetailedHelp(event, event.getCorrelatedWork())
      → Determines dispatch type based on work type
      → INSERT INTO dispatch_log (additional help dispatched!)
   
   l. Builds AckResponseDTO:
      { ackId: 5, eventId: 42, username: "John Doe" (full name!),
        role: "OPERATOR", acknowledgedAt: "...", resolutionCategory: "REAL_EMERGENCY",
        ackWithinThreshold: false }
   
6. Returns: { success: true, message: "Event acknowledged", data: { ackId: 5, ... } }
```

### Step 2: Close Ticket — `POST /api/acknowledgements/{eventId}/resolve`

```
Only SUPERVISOR can do this!

File execution order:
1. JwtFilter → SecurityConfig → passes
2. SecurityConfig → POST /api/acknowledgements/*/resolve → hasRole('SUPERVISOR')
3. @PreAuthorize("hasRole('SUPERVISOR')") → double-checked at method level
4. AcknowledgementController.resolveEvent(eventId, authentication)
5. AcknowledgementService.resolveEvent(eventId, username):
   a. eventRepository.findById() → loads event
   b. Validates: event.getEventStatus() == ACKNOWLEDGED
      → If not ACKNOWLEDGED → IllegalStateException → 400
      → "Cannot resolve event that hasn't been acknowledged"
   c. event.setEventStatus(RESOLVED)
   d. eventRepository.save() → UPDATE estop_event SET event_status='RESOLVED'
   e. hmiService.refreshHmiState(stationId)
      → Counts active events at station (OPEN/ACKNOWLEDGED/ESCALATED/CRITICAL/AUTO_DISPATCHED)
      → If count == 0 → UPDATE station SET current_hmi_state='GREEN'
      → If count > 0 → stays RED (other active events exist)
   f. auditService.logAction(event, "RESOLVED", user, ...)
6. Returns: { success: true, message: "Event resolved - ticket closed" }
```

### Get Ack Details — `GET /api/acknowledgements/{eventId}`

```
Returns who acknowledged, when, why, and whether it was within 2 minutes.
Used by EventDetailPage to show the "Acknowledgement Details" card.

AcknowledgementService.getAckForEvent(eventId):
  → ackRepository.findByEvent_EventId(eventId) → returns Optional<Acknowledgement>
  → If empty → returns null (no ack yet)
  → If found → maps to AckResponseDTO with full name and role
```

---

## 12. SUPPORTING SERVICES

### `CorrelationService.java` — Links events to scheduled work
```
Method: correlate(event) → returns ScheduledWork or null
```
Three-tier search strategy:
1. **Exact time overlap:** `pressedAt` falls between work's `startTime` and `endTime` at matching station/factory/block
2. **Same-day fallback:** Work at same station on same day (covers slight time mismatches)
3. **Station fallback:** ANY work at that station (covers CSV data with old dates)

Returns the highest-risk match if multiple found.

Also provides:
- `determineSeverityFromWorkType(workType)` → chemical=CRITICAL, electrical=HIGH, welding=MEDIUM, mechanical=LOW
- `getInstantHelpType(work)` → Returns help string from work entity or derives from work type

### `RiskScoringService.java` — Calculates 0-100 risk score
```
Method: calculateRiskScore(event) → returns int
```
1. Gets workType from correlated work
2. Counts events at station this week
3. Checks if risky hour (10AM-2PM)
4. Delegates to `RiskScoreUtil.calculateRiskScore()`

### `HmiService.java` — RED/GREEN light logic
```
Methods:
  updateState(stationId, HmiState)     → directly sets to RED or GREEN
  refreshHmiState(stationId)           → recalculates from scratch
  calculateHmiState(stationId)         → counts active events → RED if any, GREEN if none
```
"Active" statuses = OPEN, ACKNOWLEDGED, ESCALATED, CRITICAL, AUTO_DISPATCHED.
RESOLVED and RELEASED are NOT active — they don't keep the light red.

### `NotificationService.java` — Dispatch help
```
Methods:
  autoDispatch(event, work, reason)    → determines dispatch type, saves DispatchLog
  alertSupervisor(event)               → saves DispatchLog with SUPERVISOR_ALERT
  sendDetailedHelp(event, work)        → saves DispatchLog (called on REAL_EMERGENCY ack)
  getDispatchesForEvent(eventId)       → returns all DispatchLog entries
```

Dispatch type decision:
| Work Type | Dispatch Type |
|---|---|
| Electrical / Chemical | ALL_EMERGENCY |
| Welding | FIRE_DEPT |
| Mechanical | AMBULANCE |
| None / Unknown | SUPERVISOR_ALERT |

### `AuditService.java` — Immutable audit trail
```
Methods:
  logAction(event, action, user, details)  → INSERT into audit_log (never update/delete)
  getLogs(filters, pageable)               → paginated filtered query
  getEventTimeline(eventId)                → all actions for one event, ordered by time
  exportAuditCsv(from, to)                → builds CSV byte array
```

Actions logged:
| Action | When | Who |
|---|---|---|
| E-STOP_PRESSED | Event created | System |
| CORRELATION_DETECTED | Work found at station | System |
| E-STOP_RELEASED | Double-press release | System |
| RELEASED | Manual release via button | System |
| AUTO_DISPATCHED | 2-min escalation | System |
| STATUS_CHANGED | Status transition | System |
| ACKNOWLEDGED | Operator/supervisor acks | User |
| RESOLVED | Supervisor closes ticket | User |

---

## 13. OTHER CONTROLLERS

### `StationController.java` — `/api/stations`
| Endpoint | What | Returns |
|---|---|---|
| `GET /api/stations` | All stations with HMI states | List of StationStatusDTO |
| `GET /api/stations/{id}` | Single station | StationStatusDTO |
| `GET /api/stations/{id}/hmi` | HMI state only | HmiState (RED/GREEN) |
| `GET /api/stations/factory/{factoryId}` | Stations in a factory | List of StationStatusDTO |

### `FactoryController.java` — `/api/factories`
| Endpoint | What | Returns |
|---|---|---|
| `GET /api/factories` | All factories | List of Factory |
| `GET /api/factories/{id}/stations` | Stations in factory | List of Station |
| `GET /api/factories/{id}/blocks` | Distinct blocks in factory | List of String |

These three endpoints power the **cascading dropdowns** on the event creation form:
1. User selects Factory → loads stations for that factory
2. User selects Station → loads blocks for that factory
3. User clicks "Press E-Stop" → creates event

### `AnalyticsController.java` — `/api/analytics`
| Endpoint | What | Returns |
|---|---|---|
| `GET /api/analytics/dashboard` | Dashboard summary | DashboardSummaryDTO |
| `GET /api/analytics/frequency?groupBy=hour` | Event frequency | List of FrequencyDTO |
| `GET /api/analytics/mean-ack-time` | Average ack time | Double (seconds) |
| `GET /api/analytics/high-risk-stations` | Risk-ranked stations | List of StationRiskDTO |
| `GET /api/analytics/shift-report` | Per-shift breakdown | List of ShiftReportDTO |
| `GET /api/analytics/risk-trend?stationId=3` | Weekly risk trend | List (week, score) |

**AnalyticsService** does all the heavy lifting:
- `getDashboardSummary()` → counts today/week events, groups by severity/status/shift, finds top risk stations
- `getFrequency(groupBy)` → groups events by hour/shift/day/station
- `getMeanAckTime()` → AVG(acknowledgedAt - pressedAt) in seconds
- `getHighRiskStations()` → orders by avg risk score desc

### `DatasetController.java` — `/api/datasets`
| Endpoint | What | Returns |
|---|---|---|
| `POST /api/datasets/upload?type=stations` | Upload CSV | DatasetStatusDTO |
| `POST /api/datasets/simulate?count=50` | Generate test events | String |
| `GET /api/datasets/status` | Ingestion status | DatasetStatusDTO |
| `GET /api/datasets/headers?type=stations` | CSV template headers | List of String |

**DatasetIngestionService** parses CSV files for 6 entity types:
- `factories` → creates Factory entities
- `stations` → creates Station entities
- `scheduled_work` → creates ScheduledWork entities
- `estop_events` → creates EStopEvent entities (processes through SafetyService)
- `users` → creates AppUser entities (hashes passwords)
- `acknowledgements` → creates Acknowledgement entities

Uses `CsvParserUtil` to parse CSV rows. Tracks per-row success/failure.

### `AuditController.java` — `/api/audit`
| Endpoint | Auth | Returns |
|---|---|---|
| `GET /api/audit/logs` | AUDITOR | Page of AuditLogDTO |
| `GET /api/audit/event/{id}/timeline` | Authenticated | EventTimelineDTO |
| `GET /api/audit/export?from=...&to=...` | AUDITOR | CSV file download |

---

## 14. SCHEDULED JOBS

### `EscalationJob.java`
```java
@Scheduled(fixedRate = 30000)  // every 30 seconds
public void runEscalationCheck() {
    escalationService.checkAndEscalateAll();
}
```
Runs every 30 seconds, finds OPEN events older than 2 minutes, escalates them.

### `RiskRecalculationJob.java`
```java
@Scheduled(cron = "0 0 * * * *")  // every hour
public void recalculateRiskScores() { ... }
```
Runs every hour, recalculates risk scores for all active events and saves to `risk_score_history` for trend charts.

---

## 15. UTILITY CLASSES

### `RiskScoreUtil.java` — Risk score formula
| Method | Returns |
|---|---|
| `getBaseScore(workType)` | chemical=90, electrical=70, welding=50, mechanical=30, default=10 |
| `getFrequencyBonus(eventsThisWeek)` | eventsThisWeek × 5, capped at 25 |
| `getTimeBonus(isRiskyHour)` | +15 if true |
| `getRapidSequenceBonus(isRapid)` | +25 if true |
| `calculateRiskScore(...)` | sum of all above, capped at 100 |
| `toRiskLevel(score)` | 0-25→LOW, 26-50→MEDIUM, 51-75→HIGH, 76-100→CRITICAL |
| `toSeverity(score)` | Same thresholds but returns Severity enum |

### `TimeUtil.java` — Time constants and checks
| Constant/Method | Value |
|---|---|
| `ESCALATION_THRESHOLD_SECONDS` | 120 (2 minutes) |
| `RAPID_SEQUENCE_THRESHOLD_SECONDS` | 5 |
| `isHistoricallyRiskyHour(dateTime)` | true if hour >= 10 and < 14 (10AM-2PM) |
| `hasExceededEscalationThreshold(pressedAt)` | true if more than 2 min ago |
| `isRapidSequence(time1, time2)` | true if within 5 seconds |

### `ShiftUtil.java` — Maps time to shift
```
06:00 - 13:59 → MORNING
14:00 - 21:59 → AFTERNOON
22:00 - 05:59 → NIGHT
```

### `CsvParserUtil.java` — Parses CSV files
Reads CSV with headers, handles quoted values, returns List of Map<String, String>.

---

## 16. EXCEPTION HANDLING

### `GlobalExceptionHandler.java`
```
Annotation: @RestControllerAdvice (catches exceptions from ALL controllers)
```

Instead of try-catch in every controller, exceptions bubble up here:

| Exception | HTTP Code | When |
|---|---|---|
| `ResourceNotFoundException` | 404 | Entity not found by ID |
| `DuplicateAckException` | 409 | Event already acknowledged |
| `UnauthorizedException` | 401 | Custom auth failure |
| `BadCredentialsException` | 401 | Wrong username/password (thrown by AuthenticationManager) |
| `AccessDeniedException` | 403 | @PreAuthorize fails (wrong role) |
| `MethodArgumentNotValidException` | 400 | @Valid/@NotBlank validation fails |
| `ConstraintViolationException` | 400 | DB constraint violated |
| `IllegalArgumentException` | 400 | Bad business logic input |
| `IllegalStateException` | 400 | Invalid state transition |
| `Exception` (catch-all) | 500 | Anything unexpected |

All errors return `ApiResponse.error(message)`:
```json
{ "success": false, "message": "Resource not found: Station with id 999", "data": null }
```

### Custom exception classes:

**`ResourceNotFoundException`** — thrown when `findById()` returns empty
```java
throw new ResourceNotFoundException("Station", "id", 999);
// → "Station not found with id: 999"
```

**`DuplicateAckException`** — thrown when event already has an acknowledgement
```java
throw new DuplicateAckException("Event " + eventId + " is already acknowledged");
```

**`UnauthorizedException`** — thrown for custom auth failures (not used much since Spring Security handles most)

---

## 17. COMPLETE FILE EXECUTION ORDER — ONE E-STOP PRESS

Here is EVERY file touched when an operator presses E-Stop and the full lifecycle plays out:

```
═══════════════════════════════════════════════════════
PHASE 1: EVENT CREATION (instant)
═══════════════════════════════════════════════════════

Request: POST /api/events { stationId:3, factoryId:"100091", blockId:"B2" }

Files in order:
 1. JwtFilter.java              → validate JWT, set SecurityContext
 2. CustomUserDetailsService    → load user from DB
 3. SecurityConfig.java         → /api/events → OPERATOR/SUPERVISOR → pass
 4. EStopEventController.java   → createEvent() receives EStopEventDTO
 5. SafetyService.java          → processNewEvent()
 6. StationRepository.java      → findById(3)
 7. FactoryRepository.java      → findById("100091")
 8. EStopEventRepository.java   → save() → INSERT estop_event (OPEN, MEDIUM, risk=0)
 9. EStopEventRepository.java   → findByStationAndTimeRange() (rapid check)
10. HmiService.java             → updateState(3, RED)
11. StationRepository.java      → save() → UPDATE station SET hmi='RED'
12. AuditService.java           → logAction("E-STOP_PRESSED")
13. AuditLogRepository.java     → save() → INSERT audit_log
14. EStopEventController.java   → toDTO() maps entity to EStopEventDTO

DB writes: 1 INSERT (estop_event) + 1 UPDATE (station) + 1 INSERT (audit_log) = 3

Response: { eventId:42, status:"OPEN", severity:"MEDIUM", riskScore:0,
            correlatedWorkId:null, workType:null }

═══════════════════════════════════════════════════════
PHASE 2: ESCALATION (after 2 minutes, automatic)
═══════════════════════════════════════════════════════

No HTTP request — background job triggers:

Files in order:
 1. EscalationJob.java              → @Scheduled runs every 30s
 2. EscalationService.java          → checkAndEscalateAll()
 3. EStopEventRepository.java       → findUnacknowledgedBefore(OPEN, 2min ago)
 4. EscalationService.java          → escalate(event)
 5. CorrelationService.java         → correlate(event)
 6. ScheduledWorkRepository.java    → findOverlappingWork() / findSameDayWork() / findByStation()
 7. RiskScoringService.java         → calculateRiskScore(event)
 8. EStopEventRepository.java       → countByStationSince() (frequency)
 9. TimeUtil.java                   → isHistoricallyRiskyHour()
10. RiskScoreUtil.java              → calculateRiskScore(workType, freq, risky, rapid)
11. RiskScoreUtil.java              → toSeverity(85) → CRITICAL
12. NotificationService.java        → autoDispatch() → determineDispatchType()
13. DispatchLogRepository.java      → save() → INSERT dispatch_log (ALL_EMERGENCY)
14. NotificationService.java        → alertSupervisor()
15. DispatchLogRepository.java      → save() → INSERT dispatch_log (SUPERVISOR_ALERT)
16. AuditService.java               → logAction("AUTO_DISPATCHED")
17. AuditLogRepository.java         → save() → INSERT audit_log
18. HmiService.java                 → updateState(RED)
19. EStopEventRepository.java       → save() → UPDATE estop_event (AUTO_DISPATCHED, CRITICAL, risk=85, work=1)
20. AuditService.java               → logAction("STATUS_CHANGED")
21. AuditLogRepository.java         → save() → INSERT audit_log

DB writes: 1 UPDATE (estop_event) + 2 INSERT (dispatch_log) + 2 INSERT (audit_log) = 5

After this: event shows correlatedWork, severity CRITICAL, riskScore 85,
           dispatches show ALL_EMERGENCY + SUPERVISOR_ALERT

═══════════════════════════════════════════════════════
PHASE 3: ACKNOWLEDGEMENT (supervisor clicks Acknowledge)
═══════════════════════════════════════════════════════

Request: POST /api/acknowledgements/42/acknowledge
         { resolutionCategory: "REAL_EMERGENCY" }

Files in order:
 1. JwtFilter.java                    → validate JWT
 2. SecurityConfig.java               → /api/acknowledgements → OPERATOR/SUPERVISOR
 3. AcknowledgementController.java    → @PreAuthorize check → pass
 4. AcknowledgementService.java       → acknowledgeEvent()
 5. EStopEventRepository.java         → findById(42)
 6. AcknowledgementRepository.java    → findByEvent_EventId(42) → empty (no dup)
 7. UserRepository.java               → findByUsername()
 8. TimeUtil.java                     → ESCALATION_THRESHOLD_SECONDS (120)
 9. AcknowledgementRepository.java    → save() → INSERT acknowledgement
10. EStopEventRepository.java         → save() → UPDATE estop_event (ACKNOWLEDGED)
11. AuditService.java                 → logAction("ACKNOWLEDGED")
12. AuditLogRepository.java           → save() → INSERT audit_log
13. NotificationService.java          → sendDetailedHelp() (because REAL_EMERGENCY)
14. DispatchLogRepository.java        → save() → INSERT dispatch_log

DB writes: 1 INSERT (ack) + 1 UPDATE (event) + 1 INSERT (audit) + 1 INSERT (dispatch) = 4
HMI: STAYS RED (acknowledged ≠ resolved)

═══════════════════════════════════════════════════════
PHASE 4: CLOSE TICKET (supervisor clicks Close Ticket)
═══════════════════════════════════════════════════════

Request: POST /api/acknowledgements/42/resolve

Files in order:
 1. JwtFilter.java                    → validate JWT
 2. SecurityConfig.java               → POST /api/acknowledgements/*/resolve → SUPERVISOR only
 3. AcknowledgementController.java    → @PreAuthorize("hasRole('SUPERVISOR')")
 4. AcknowledgementService.java       → resolveEvent()
 5. EStopEventRepository.java         → findById(42)
 6. EStopEventRepository.java         → save() → UPDATE estop_event (RESOLVED)
 7. HmiService.java                   → refreshHmiState()
 8. EStopEventRepository.java         → countActiveByStation() → 0
 9. StationRepository.java            → save() → UPDATE station SET hmi='GREEN'
10. AuditService.java                 → logAction("RESOLVED")
11. AuditLogRepository.java           → save() → INSERT audit_log

DB writes: 1 UPDATE (event) + 1 UPDATE (station) + 1 INSERT (audit) = 3
HMI: → GREEN (if no other active events at this station)
```

**Total DB writes for full lifecycle:** 3 + 5 + 4 + 3 = **15 database operations**

---

## 18. API ENDPOINTS SUMMARY

### Auth — `/api/auth` (public, no token needed)
| Method | Endpoint | Body DTO | Response DTO | Service |
|---|---|---|---|---|
| POST | `/api/auth/login` | LoginRequestDTO | LoginResponseDTO | UserService.login() |
| POST | `/api/auth/register` | RegisterRequestDTO | LoginResponseDTO | UserService.register() |

### Events — `/api/events` (OPERATOR, SUPERVISOR)
| Method | Endpoint | Body/Params | Response DTO | Service |
|---|---|---|---|---|
| POST | `/api/events` | EStopEventDTO (body) | EStopEventDTO | SafetyService.processNewEvent() |
| GET | `/api/events` | ?status, ?severity, ?stationId, ?page, ?size | Page\<EStopEventDTO> | EStopEventRepository.findWithFilters() |
| GET | `/api/events/{id}` | — | EStopEventDTO | SafetyService.getEventById() |
| GET | `/api/events/open` | — | List\<EStopEventDTO> | EStopEventRepository.findByEventStatus() |
| GET | `/api/events/station/{id}` | — | List\<EStopEventDTO> | EStopEventRepository.findByStation() |
| POST | `/api/events/{id}/release` | — | EStopEventDTO | SafetyService.releaseEvent() |
| GET | `/api/events/{id}/dispatches` | — | List\<DispatchDTO> | NotificationService.getDispatchesForEvent() |

### Acknowledgements — `/api/acknowledgements` (OPERATOR/SUPERVISOR for ack, SUPERVISOR for resolve)
| Method | Endpoint | Body DTO | Response DTO | Service |
|---|---|---|---|---|
| POST | `/{eventId}/acknowledge` | AckRequestDTO | AckResponseDTO | AcknowledgementService.acknowledgeEvent() |
| POST | `/{eventId}/resolve` | — | String | AcknowledgementService.resolveEvent() |
| GET | `/{eventId}` | — | AckResponseDTO | AcknowledgementService.getAckForEvent() |

### Audit — `/api/audit` (AUDITOR only, timeline is authenticated)
| Method | Endpoint | Params | Response | Service |
|---|---|---|---|---|
| GET | `/api/audit/logs` | ?action, ?from, ?to, ?page | Page\<AuditLogDTO> | AuditService.getLogs() |
| GET | `/api/audit/event/{id}/timeline` | — | EventTimelineDTO | AuditService.getEventTimeline() |
| GET | `/api/audit/export` | ?from, ?to | CSV file | AuditService.exportAuditCsv() |

### Analytics — `/api/analytics` (authenticated)
| Method | Endpoint | Response | Service |
|---|---|---|---|
| GET | `/dashboard` | DashboardSummaryDTO | AnalyticsService.getDashboardSummary() |
| GET | `/frequency?groupBy=hour` | List\<FrequencyDTO> | AnalyticsService.getFrequency() |
| GET | `/mean-ack-time` | Double | AnalyticsService.getMeanAckTime() |
| GET | `/high-risk-stations` | List\<StationRiskDTO> | AnalyticsService.getHighRiskStations() |
| GET | `/shift-report` | List\<ShiftReportDTO> | AnalyticsService.getShiftReport() |
| GET | `/risk-trend?stationId=3` | List | AnalyticsService.getRiskTrend() |

### Stations — `/api/stations` (authenticated)
| GET | `/api/stations` | List\<StationStatusDTO> |
| GET | `/api/stations/{id}` | StationStatusDTO |
| GET | `/api/stations/{id}/hmi` | HmiState |
| GET | `/api/stations/factory/{factoryId}` | List\<StationStatusDTO> |

### Factories — `/api/factories` (authenticated)
| GET | `/api/factories` | List\<Factory> |
| GET | `/api/factories/{id}/stations` | List\<Station> |
| GET | `/api/factories/{id}/blocks` | List\<String> |

### Datasets — `/api/datasets` (SUPERVISOR only)
| POST | `/api/datasets/upload?type=stations` | MultipartFile | DatasetStatusDTO |
| POST | `/api/datasets/simulate?count=50` | — | String |
| GET | `/api/datasets/status` | DatasetStatusDTO |
| GET | `/api/datasets/headers?type=stations` | List\<String> |

---

## 19. WHY WE USE EACH DTO — Quick Reference

| DTO | Direction | Used Where | Why Not Use Entity Directly? |
|---|---|---|---|
| **LoginRequestDTO** | Frontend → Backend | AuthController.login() | Only need username+password, not full AppUser |
| **RegisterRequestDTO** | Frontend → Backend | AuthController.register() | Has raw password (entity has BCrypt hash) |
| **LoginResponseDTO** | Backend → Frontend | After login/register | Contains JWT token (entity doesn't have this) |
| **EStopEventDTO** | Both directions | Create + view events | Entity has full Station/Factory objects; DTO has just IDs + names |
| **AckRequestDTO** | Frontend → Backend | Acknowledge event | Only category + optional text; entity has full user/event objects |
| **AckResponseDTO** | Backend → Frontend | View ack details | Shows full name + role; entity has userId FK |
| **DispatchDTO** | Backend → Frontend | View dispatches | Flattens DispatchLog entity (no nested event object) |
| **AuditLogDTO** | Backend → Frontend | View audit logs | Flat fields instead of nested entities |
| **EventTimelineDTO** | Backend → Frontend | Event timeline stepper | Custom structure for UI stepper component |
| **DashboardSummaryDTO** | Backend → Frontend | Analytics dashboard | Aggregated data that doesn't map to any single entity |
| **FrequencyDTO** | Backend → Frontend | Frequency charts | label + count pairs for Recharts |
| **StationRiskDTO** | Backend → Frontend | High-risk stations list | Aggregated from events, not a direct entity |
| **StationStatusDTO** | Backend → Frontend | Station list | Adds HMI state + active event count |
| **ShiftReportDTO** | Backend → Frontend | Shift analytics | Per-shift aggregation |
| **DatasetStatusDTO** | Backend → Frontend | CSV upload status | Row success/failure tracking |
| **ApiResponse\<T>** | Backend → Frontend | EVERY response | Consistent {success, message, data} wrapper |

---

## THE END

This document covers every file in the backend, what it does, why it exists, what calls what, what DTOs flow where, and the complete execution order for every major operation. Use it to trace any request from HTTP to database and back.

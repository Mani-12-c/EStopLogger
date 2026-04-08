# 🏭 Safety E-Stop Logger — Complete Project Plan & Development Blueprint

> **Project Name:** Safety E-Stop Intelligent Logger  
> **Tech Stack:** Spring Boot 3.x (Backend) + React (Frontend) + MySQL/PostgreSQL (DB)  
> **IoT Note:** No physical IoT hardware — all E-Stop events are **simulated via dataset ingestion**  
> **Date:** April 2026

---

## 📌 Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Database Design](#3-database-design)
4. [Dataset Design & Simulation Strategy](#4-dataset-design--simulation-strategy)
5. [Backend — Complete File-by-File Plan](#5-backend--complete-file-by-file-plan)
6. [Core Business Logic — Decision Flowcharts](#6-core-business-logic--decision-flowcharts)
7. [API Endpoints — Full Specification](#7-api-endpoints--full-specification)
8. [Frontend — React UI Plan](#8-frontend--react-ui-plan)
9. [Security & RBAC Plan](#9-security--rbac-plan)
10. [Development Phases & Sprint Plan](#10-development-phases--sprint-plan)
11. [Testing Strategy](#11-testing-strategy)
12. [Improvements Added Beyond Original Scope](#12-improvements-added-beyond-original-scope)

---

## 1. Project Overview

### What is this?
An intelligent factory safety system that logs Emergency Stop (E-Stop) button presses, correlates them with scheduled work activities, applies escalation rules, and provides analytics — all simulated via datasets instead of real IoT devices.

### Core Problem Statement
Factory E-Stop buttons are pressed for many reasons (real emergencies, false alarms, testing). Without an intelligent system:
- There's no way to know if a press is a real emergency or a false alarm
- Responses are slow and purely reactive
- There's no audit trail for compliance
- Patterns of risk go unnoticed

### What This System Does
| Feature | Description |
|---------|-------------|
| **Event Logging** | Every E-Stop press is logged with timestamp, station, factory, block |
| **2-Minute Rule** | No acknowledgment within 2 min → auto-escalate as emergency |
| **Rapid Double-Press** | 2 presses from same station within 5 sec → instant CRITICAL |
| **Context-Aware Response** | Correlates events with scheduled work (electrical, mechanical, etc.) |
| **Auto-Dispatch** | High-risk work overlap → auto-send fire/ambulance |
| **RBAC** | Operators, Supervisors, Auditors — each sees only what they need |
| **Analytics** | Press frequency, mean ack time, high-risk stations, shift analysis |
| **Audit Logs** | Tamper-proof compliance records for inspections |
| **HMI Indicators** | Real-time Red/Amber/Green station status for dashboards |

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        REACT FRONTEND                           │
│  ┌──────────┐ ┌───────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ Operator │ │Supervisor │ │ Auditor  │ │ Dataset Upload   │  │
│  │Dashboard │ │ Analytics │ │ Exports  │ │ (CSV Simulator)  │  │
│  └──────────┘ └───────────┘ └──────────┘ └──────────────────┘  │
└────────────────────────┬────────────────────────────────────────┘
                         │ REST API (JWT Auth)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   SPRING BOOT BACKEND                           │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  CONTROLLER LAYER                        │   │
│  │  Station │ EStopEvent │ Ack │ Analytics │ Audit │ Dataset│   │
│  └──────────────────────┬───────────────────────────────────┘   │
│                         ▼                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   SERVICE LAYER                          │   │
│  │  SafetyService ──► CorrelationService                    │   │
│  │       │                  │                               │   │
│  │       ▼                  ▼                               │   │
│  │  EscalationService  RiskScoringService                   │   │
│  │       │                  │                               │   │
│  │       ▼                  ▼                               │   │
│  │  NotificationService  HmiService                         │   │
│  │       │                                                  │   │
│  │       ▼                                                  │   │
│  │  AnalyticsService  AuditService                          │   │
│  └──────────────────────┬───────────────────────────────────┘   │
│                         ▼                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │               SCHEDULER LAYER                            │   │
│  │  EscalationJob (every 30s: check unacked events > 2min) │   │
│  └──────────────────────────────────────────────────────────┘   │
│                         ▼                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │               REPOSITORY LAYER (Spring Data JPA)         │   │
│  └──────────────────────┬───────────────────────────────────┘   │
│                         ▼                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    DATABASE (MySQL / PostgreSQL)          │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Database Design

### 3.1 Entity Relationship Diagram

```
┌──────────────────┐       ┌──────────────────────┐
│     Factory      │       │      Station         │
├──────────────────┤       ├──────────────────────┤
│ factoryId (PK)   │──1:N─►│ stationId (PK)       │
│ factoryName      │       │ factoryId (FK)       │
│ location         │       │ blockId              │
│ createdAt        │       │ stationName          │
└──────────────────┘       │ status (ACTIVE/DOWN) │
                           │ currentHmiState      │
                           └──────────┬───────────┘
                                      │ 1:N
                                      ▼
                           ┌──────────────────────┐
                           │    EStopEvent        │
                           ├──────────────────────┤
                           │ eventId (PK)         │
                           │ stationId (FK)       │
                           │ factoryId (FK)       │
                           │ blockId              │
                           │ pressedAt (timestamp) │
                           │ eventStatus          │◄── OPEN / ACKNOWLEDGED /
                           │ severity             │    ESCALATED / CRITICAL /
                           │ isRapidSequence      │    RESOLVED / AUTO_DISPATCHED
                           │ correlatedWorkId(FK) │
                           │ riskScore            │
                           │ createdAt            │
                           └──────────┬───────────┘
                                      │ 1:1
                                      ▼
                           ┌──────────────────────┐
                           │  Acknowledgement     │
                           ├──────────────────────┤
                           │ ackId (PK)           │
                           │ eventId (FK, Unique)  │
                           │ userId (FK)          │
                           │ acknowledgedAt       │
                           │ resolutionCategory   │◄── REAL_EMERGENCY /
                           │ customResolutionText │    FALSE_ALARM /
                           │ ackWithinThreshold   │    TESTING_MAINTENANCE /
                           │ createdAt            │    MACHINE_FAULT /
                           └──────────────────────┘    CUSTOM_RESOLUTION

┌──────────────────────┐       ┌──────────────────────┐
│   ScheduledWork      │       │       User           │
├──────────────────────┤       ├──────────────────────┤
│ workId (PK)          │       │ userId (PK)          │
│ stationId (FK)       │       │ username             │
│ factoryId (FK)       │       │ password (hashed)    │
│ blockId              │       │ fullName             │
│ workType             │◄──    │ role                 │◄── OPERATOR /
│ probableEmergency    │  Electrical/   │ assignedStationId   │    SUPERVISOR /
│ instantHelp          │  Mechanical/   │ shift               │    AUDITOR
│ startTime            │  Chemical/     │ createdAt           │
│ endTime              │  Maintenance   └──────────────────────┘
│ riskLevel            │
│ createdAt            │
└──────────────────────┘

┌──────────────────────┐       ┌──────────────────────┐
│  DispatchLog         │       │   AuditLog           │
├──────────────────────┤       ├──────────────────────┤
│ dispatchId (PK)      │       │ auditId (PK)         │
│ eventId (FK)         │       │ eventId (FK)         │
│ dispatchType         │◄──    │ action               │
│ dispatchedAt         │  AMBULANCE/   │ performedBy (userId) │
│ triggerReason        │  FIRE_DEPT/   │ timestamp            │
│ responseStatus       │  SUPERVISOR   │ details (JSON)       │
│ notes                │       │ ipAddress            │
└──────────────────────┘       └──────────────────────┘

┌──────────────────────┐
│  RiskScoreHistory    │  ◄── NEW: Tracks risk score over time per station/workType
├──────────────────────┤
│ id (PK)              │
│ stationId (FK)       │
│ workType             │
│ riskScore            │
│ weekNumber           │
│ eventCount           │
│ calculatedAt         │
└──────────────────────┘
```

### 3.2 Complete SQL Schema (schema.sql)

```sql
-- Factory
CREATE TABLE factory (
    factory_id      VARCHAR(20) PRIMARY KEY,
    factory_name    VARCHAR(100) NOT NULL,
    location        VARCHAR(200),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Station
CREATE TABLE station (
    station_id        BIGINT AUTO_INCREMENT PRIMARY KEY,
    factory_id        VARCHAR(20) NOT NULL,
    block_id          VARCHAR(20) NOT NULL,
    station_name      VARCHAR(100) NOT NULL,
    status            ENUM('ACTIVE', 'INACTIVE', 'MAINTENANCE') DEFAULT 'ACTIVE',
    current_hmi_state ENUM('GREEN', 'AMBER', 'RED') DEFAULT 'GREEN',
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (factory_id) REFERENCES factory(factory_id)
);

-- User
CREATE TABLE app_user (
    user_id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    username            VARCHAR(50) UNIQUE NOT NULL,
    password            VARCHAR(255) NOT NULL,
    full_name           VARCHAR(100) NOT NULL,
    role                ENUM('OPERATOR', 'SUPERVISOR', 'AUDITOR') NOT NULL,
    assigned_station_id BIGINT,
    shift               ENUM('MORNING', 'AFTERNOON', 'NIGHT'),
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_station_id) REFERENCES station(station_id)
);

-- Scheduled Work
CREATE TABLE scheduled_work (
    work_id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    station_id          BIGINT NOT NULL,
    factory_id          VARCHAR(20) NOT NULL,
    block_id            VARCHAR(20) NOT NULL,
    work_type           VARCHAR(50) NOT NULL,
    probable_emergency  VARCHAR(100),
    instant_help        VARCHAR(200),
    start_time          TIMESTAMP NOT NULL,
    end_time            TIMESTAMP NOT NULL,
    risk_level          ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'LOW',
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (station_id) REFERENCES station(station_id),
    FOREIGN KEY (factory_id) REFERENCES factory(factory_id)
);

-- E-Stop Event
CREATE TABLE estop_event (
    event_id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    station_id          BIGINT NOT NULL,
    factory_id          VARCHAR(20) NOT NULL,
    block_id            VARCHAR(20) NOT NULL,
    pressed_at          TIMESTAMP NOT NULL,
    event_status        ENUM('OPEN', 'ACKNOWLEDGED', 'ESCALATED', 'CRITICAL',
                             'RESOLVED', 'AUTO_DISPATCHED') DEFAULT 'OPEN',
    severity            ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
    is_rapid_sequence   BOOLEAN DEFAULT FALSE,
    correlated_work_id  BIGINT,
    risk_score          INT DEFAULT 0,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (station_id) REFERENCES station(station_id),
    FOREIGN KEY (factory_id) REFERENCES factory(factory_id),
    FOREIGN KEY (correlated_work_id) REFERENCES scheduled_work(work_id)
);

-- Acknowledgement
CREATE TABLE acknowledgement (
    ack_id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id                BIGINT NOT NULL UNIQUE,
    user_id                 BIGINT NOT NULL,
    acknowledged_at         TIMESTAMP NOT NULL,
    resolution_category     ENUM('REAL_EMERGENCY', 'FALSE_ALARM',
                                 'TESTING_MAINTENANCE', 'MACHINE_FAULT',
                                 'CUSTOM_RESOLUTION') NOT NULL,
    custom_resolution_text  TEXT,
    ack_within_threshold    BOOLEAN NOT NULL,
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES estop_event(event_id),
    FOREIGN KEY (user_id) REFERENCES app_user(user_id)
);

-- Dispatch Log
CREATE TABLE dispatch_log (
    dispatch_id     BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id        BIGINT NOT NULL,
    dispatch_type   ENUM('AMBULANCE', 'FIRE_DEPT', 'SUPERVISOR_ALERT',
                         'SECURITY', 'ALL_EMERGENCY') NOT NULL,
    dispatched_at   TIMESTAMP NOT NULL,
    trigger_reason  VARCHAR(200) NOT NULL,
    response_status ENUM('DISPATCHED', 'ACKNOWLEDGED', 'CANCELLED', 'COMPLETED') DEFAULT 'DISPATCHED',
    notes           TEXT,
    FOREIGN KEY (event_id) REFERENCES estop_event(event_id)
);

-- Audit Log
CREATE TABLE audit_log (
    audit_id      BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id      BIGINT,
    action        VARCHAR(100) NOT NULL,
    performed_by  BIGINT,
    timestamp     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    details       JSON,
    ip_address    VARCHAR(45),
    FOREIGN KEY (event_id) REFERENCES estop_event(event_id),
    FOREIGN KEY (performed_by) REFERENCES app_user(user_id)
);

-- Risk Score History
CREATE TABLE risk_score_history (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    station_id      BIGINT NOT NULL,
    work_type       VARCHAR(50) NOT NULL,
    risk_score      INT NOT NULL,
    week_number     INT NOT NULL,
    event_count     INT NOT NULL,
    calculated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (station_id) REFERENCES station(station_id)
);
```

---

## 4. Dataset Design & Simulation Strategy

Since we're **NOT** using real IoT hardware, all E-Stop events come from **CSV/JSON datasets** loaded into the system.

### 4.1 Dataset Files Needed

#### Dataset 1: `factories.csv`
```csv
factory_id,factory_name,location
100091,Chennai Plant A,Chennai Industrial Zone
100092,Hyderabad Plant B,Hyderabad Tech Park
```

#### Dataset 2: `stations.csv`
```csv
station_id,factory_id,block_id,station_name,status
1,100091,B1,Assembly Line Station 1,ACTIVE
2,100091,B1,Welding Bay Station 2,ACTIVE
3,100091,B2,Electrical Panel Station 3,ACTIVE
4,100092,B1,Paint Booth Station 1,ACTIVE
5,100092,B2,CNC Machine Station 2,ACTIVE
```

#### Dataset 3: `scheduled_work.csv`
```csv
work_id,station_id,factory_id,block_id,work_type,probable_emergency,instant_help,start_time,end_time,risk_level
1,3,100091,B1,Electrical,Health/Fire/Machine,Send Ambulance/Fire Dept,2026-04-03 10:00,2026-04-03 14:00,HIGH
2,2,100091,B1,Welding,Fire/Burns,Send Fire Dept/Ambulance,2026-04-03 09:00,2026-04-03 12:00,MEDIUM
3,4,100092,B1,Chemical Handling,Toxic Exposure/Fire,Send Hazmat/Ambulance,2026-04-03 13:00,2026-04-03 16:00,CRITICAL
4,5,100092,B2,Mechanical Maintenance,Injury/Crush,Send Ambulance,2026-04-03 08:00,2026-04-03 11:00,LOW
```

#### Dataset 4: `estop_events.csv` (Simulated E-Stop Presses)
```csv
event_id,station_id,factory_id,block_id,pressed_at
1,3,100091,B1,2026-04-03 10:30:00
2,3,100091,B1,2026-04-03 10:30:04
3,2,100091,B1,2026-04-03 09:45:00
4,4,100092,B1,2026-04-03 14:15:00
5,1,100091,B1,2026-04-03 16:00:00
6,5,100092,B2,2026-04-03 09:30:00
7,3,100091,B1,2026-04-03 13:30:00
```
> Note: Events 1 & 2 are **rapid sequential** (same station, <5 sec apart) → instant CRITICAL

#### Dataset 5: `users.csv`
```csv
user_id,username,password,full_name,role,assigned_station_id,shift
1,op_ravi,password123,Ravi Kumar,OPERATOR,3,MORNING
2,op_priya,password123,Priya Sharma,OPERATOR,2,MORNING
3,sup_anand,password123,Anand Reddy,SUPERVISOR,,MORNING
4,aud_meena,password123,Meena Iyer,AUDITOR,,MORNING
```

#### Dataset 6: `acknowledgements.csv` (Simulated Ack Responses)
```csv
ack_id,event_id,user_id,acknowledged_at,resolution_category,custom_resolution_text
1,3,2,2026-04-03 09:46:15,FALSE_ALARM,
2,5,1,2026-04-03 16:03:30,TESTING_MAINTENANCE,
3,6,2,2026-04-03 09:31:00,MACHINE_FAULT,
```
> Note: Events 1,2,4,7 have **NO acknowledgement** → escalation rules apply

### 4.2 Dataset Ingestion Flow

```
CSV/JSON Files
      │
      ▼
┌──────────────────────┐
│  DatasetController    │  POST /api/dataset/upload
│  (upload endpoint)    │
└──────────┬───────────┘
           ▼
┌──────────────────────┐
│ DatasetIngestionService│
│  1. Parse CSV/JSON    │
│  2. Validate rows     │
│  3. Save to DB        │
│  4. For each EStop:   │
│     → trigger          │
│       SafetyService    │
│       .processEvent()  │
└──────────┬───────────┘
           ▼
    Normal event flow
    (correlation,
     escalation, etc.)
```

### 4.3 Alternative: Auto-Simulation Mode
Instead of uploading CSVs, have a **SimulationService** that auto-generates realistic events:

```java
@Service
public class SimulationService {
    // Generates random E-Stop events based on configured patterns
    // Useful for demos and testing
    // Can simulate: normal presses, rapid sequences, shift patterns
}
```

---

## 5. Backend — Complete File-by-File Plan

### 5.1 Project Structure

```
safety-estop-logger/
├── pom.xml
├── src/
│   ├── main/
│   │   ├── java/com/factory/safety/
│   │   │   ├── SafetyEstopApplication.java
│   │   │   │
│   │   │   ├── config/
│   │   │   │   ├── SecurityConfig.java
│   │   │   │   ├── SchedulerConfig.java
│   │   │   │   ├── SwaggerConfig.java
│   │   │   │   └── CorsConfig.java                  ◄── NEW
│   │   │   │
│   │   │   ├── controller/
│   │   │   │   ├── AuthController.java               ◄── NEW (login/register)
│   │   │   │   ├── StationController.java
│   │   │   │   ├── EStopEventController.java
│   │   │   │   ├── AcknowledgementController.java
│   │   │   │   ├── AnalyticsController.java
│   │   │   │   ├── AuditController.java
│   │   │   │   └── DatasetController.java            ◄── NEW (CSV upload)
│   │   │   │
│   │   │   ├── service/
│   │   │   │   ├── SafetyService.java
│   │   │   │   ├── EscalationService.java
│   │   │   │   ├── CorrelationService.java
│   │   │   │   ├── RiskScoringService.java           ◄── NEW
│   │   │   │   ├── HmiService.java
│   │   │   │   ├── NotificationService.java
│   │   │   │   ├── AnalyticsService.java             ◄── NEW (separated from controller)
│   │   │   │   ├── AuditService.java                 ◄── NEW
│   │   │   │   ├── DatasetIngestionService.java      ◄── NEW
│   │   │   │   ├── SimulationService.java            ◄── NEW
│   │   │   │   └── UserService.java                  ◄── NEW
│   │   │   │
│   │   │   ├── scheduler/
│   │   │   │   ├── EscalationJob.java
│   │   │   │   └── RiskRecalculationJob.java         ◄── NEW (weekly risk recalc)
│   │   │   │
│   │   │   ├── repository/
│   │   │   │   ├── FactoryRepository.java            ◄── NEW
│   │   │   │   ├── StationRepository.java
│   │   │   │   ├── EStopEventRepository.java
│   │   │   │   ├── AcknowledgementRepository.java
│   │   │   │   ├── ScheduledWorkRepository.java
│   │   │   │   ├── UserRepository.java               ◄── NEW
│   │   │   │   ├── DispatchLogRepository.java        ◄── NEW
│   │   │   │   ├── AuditLogRepository.java           ◄── NEW
│   │   │   │   └── RiskScoreHistoryRepository.java   ◄── NEW
│   │   │   │
│   │   │   ├── model/
│   │   │   │   ├── entity/
│   │   │   │   │   ├── Factory.java                  ◄── NEW
│   │   │   │   │   ├── Station.java
│   │   │   │   │   ├── EStopEvent.java
│   │   │   │   │   ├── Acknowledgement.java
│   │   │   │   │   ├── ScheduledWork.java
│   │   │   │   │   ├── AppUser.java                  ◄── NEW
│   │   │   │   │   ├── DispatchLog.java              ◄── NEW
│   │   │   │   │   ├── AuditLog.java                 ◄── NEW
│   │   │   │   │   └── RiskScoreHistory.java         ◄── NEW
│   │   │   │   │
│   │   │   │   ├── dto/
│   │   │   │   │   ├── EStopEventDTO.java
│   │   │   │   │   ├── AckRequestDTO.java
│   │   │   │   │   ├── AnalyticsDTO.java
│   │   │   │   │   ├── StationStatusDTO.java         ◄── NEW (HMI state)
│   │   │   │   │   ├── LoginRequestDTO.java          ◄── NEW
│   │   │   │   │   ├── LoginResponseDTO.java         ◄── NEW
│   │   │   │   │   ├── DispatchDTO.java              ◄── NEW
│   │   │   │   │   ├── AuditExportDTO.java           ◄── NEW
│   │   │   │   │   └── DashboardSummaryDTO.java      ◄── NEW
│   │   │   │   │
│   │   │   │   └── enums/
│   │   │   │       ├── EventStatus.java              ◄── NEW
│   │   │   │       ├── Severity.java                 ◄── NEW
│   │   │   │       ├── ResolutionCategory.java       ◄── NEW
│   │   │   │       ├── UserRole.java
│   │   │   │       ├── HmiState.java                 ◄── NEW
│   │   │   │       ├── DispatchType.java             ◄── NEW
│   │   │   │       ├── RiskLevel.java                ◄── NEW
│   │   │   │       └── ShiftType.java                ◄── NEW
│   │   │   │
│   │   │   ├── security/
│   │   │   │   ├── JwtFilter.java
│   │   │   │   ├── JwtUtil.java
│   │   │   │   └── CustomUserDetailsService.java     ◄── NEW
│   │   │   │
│   │   │   ├── exception/
│   │   │   │   ├── ResourceNotFoundException.java
│   │   │   │   ├── UnauthorizedException.java        ◄── NEW
│   │   │   │   ├── DuplicateAckException.java        ◄── NEW
│   │   │   │   └── GlobalExceptionHandler.java
│   │   │   │
│   │   │   └── util/
│   │   │       ├── ShiftUtil.java
│   │   │       ├── TimeUtil.java
│   │   │       ├── RiskScoreUtil.java
│   │   │       └── CsvParserUtil.java                ◄── NEW
│   │   │
│   │   └── resources/
│   │       ├── application.yml
│   │       ├── application-dev.yml                    ◄── NEW
│   │       ├── application-prod.yml                   ◄── NEW
│   │       ├── schema.sql
│   │       ├── data.sql
│   │       └── datasets/                              ◄── NEW (sample datasets)
│   │           ├── factories.csv
│   │           ├── stations.csv
│   │           ├── scheduled_work.csv
│   │           ├── estop_events.csv
│   │           ├── users.csv
│   │           └── acknowledgements.csv
│   │
│   └── test/java/com/factory/safety/
│       ├── service/
│       │   ├── SafetyServiceTest.java
│       │   ├── EscalationServiceTest.java
│       │   ├── CorrelationServiceTest.java
│       │   └── RiskScoringServiceTest.java
│       ├── controller/
│       │   ├── EStopEventControllerTest.java
│       │   └── AcknowledgementControllerTest.java
│       └── integration/
│           └── FullWorkflowIntegrationTest.java
```

### 5.2 File-by-File Specifications

#### 📄 `SafetyEstopApplication.java`
```
- @SpringBootApplication
- @EnableScheduling
- Main entry point
- No custom logic here, just bootstrap
```

---

#### 📁 `config/`

| File | What it does | Key Details |
|------|-------------|-------------|
| `SecurityConfig.java` | RBAC + JWT filter chain | Permit `/api/auth/**`, `/api/dataset/**`; restrict `/api/admin/**` to SUPERVISOR; restrict `/api/audit/**` to AUDITOR; all others need authentication |
| `SchedulerConfig.java` | Enable `@Scheduled` tasks | Configure thread pool size for scheduled tasks (default=1 may block) |
| `SwaggerConfig.java` | Swagger/OpenAPI 3.0 docs | Group APIs by tag: Events, Acknowledgements, Analytics, Audit, Dataset |
| `CorsConfig.java` | CORS for React frontend | Allow `http://localhost:3000` (React dev server), configurable for prod |

---

#### 📁 `controller/` — All API Entry Points

| File | Endpoints | Accessible By |
|------|-----------|---------------|
| `AuthController` | `POST /api/auth/login`, `POST /api/auth/register` | PUBLIC |
| `StationController` | `GET /api/stations`, `GET /api/stations/{id}`, `GET /api/stations/{id}/status` | ALL AUTHENTICATED |
| `EStopEventController` | `POST /api/events` (create), `GET /api/events` (list), `GET /api/events/{id}`, `GET /api/events/open` | OPERATOR, SUPERVISOR |
| `AcknowledgementController` | `POST /api/events/{eventId}/acknowledge` | OPERATOR |
| `AnalyticsController` | `GET /api/analytics/summary`, `GET /api/analytics/press-frequency`, `GET /api/analytics/mean-ack-time`, `GET /api/analytics/high-risk-stations`, `GET /api/analytics/shift-report` | SUPERVISOR |
| `AuditController` | `GET /api/audit/logs`, `GET /api/audit/export` (CSV/PDF) | AUDITOR |
| `DatasetController` | `POST /api/dataset/upload`, `POST /api/dataset/simulate`, `GET /api/dataset/status` | SUPERVISOR |

---

#### 📁 `service/` — Core Business Logic (Detailed)

##### `SafetyService.java` — Central Event Handler
```
Method: processNewEvent(EStopEventDTO dto)
  1. Save event to DB with status = OPEN
  2. Check rapid sequential → call isRapidSequence()
     - Query: last event from same station within 5 seconds
     - If YES → mark CRITICAL, set isRapidSequence=true, skip 2-min wait
              → immediately call NotificationService.autoDispatch()
  3. Call CorrelationService.correlate(event)
  4. Call HmiService.updateState(stationId, RED)
  5. Log to AuditLog
  6. Return event with status
```

##### `EscalationService.java` — 2-Minute Rule
```
Method: checkAndEscalate(EStopEvent event)
  - Called by EscalationJob scheduler
  - Query: all events where status=OPEN AND pressedAt < (now - 2 minutes)
  - For each:
    1. Update status → ESCALATED
    2. Update severity → HIGH
    3. Call CorrelationService to check if overlaps with scheduled work
       - If overlaps with HIGH/CRITICAL work → status = AUTO_DISPATCHED
       - Call NotificationService.autoDispatch(event, scheduledWork)
    4. If no work overlap → Call NotificationService.alertSupervisor(event)
    5. Log to AuditLog
```

##### `CorrelationService.java` — Context-Aware Intelligence
```
Method: correlate(EStopEvent event)
  1. Query ScheduledWork where:
     - stationId matches OR (factoryId + blockId) matches
     - event.pressedAt BETWEEN work.startTime AND work.endTime
  2. If match found:
     - Set event.correlatedWorkId = work.workId
     - Determine risk based on work.workType:
       • Electrical → HIGH (Fire/Electrocution risk)
       • Chemical  → CRITICAL (Toxic/Explosion risk)
       • Welding   → MEDIUM (Fire/Burns risk)
       • Mechanical → LOW-MEDIUM (Injury risk)
     - Set event.riskScore using RiskScoreUtil
  3. Return correlation result

Method: getInstantHelpType(ScheduledWork work)
  - Electrical → "Send Ambulance / Fire Dept"
  - Chemical   → "Send Hazmat / Ambulance / Fire Dept"
  - Welding    → "Send Fire Dept / Ambulance"
  - Mechanical → "Send Ambulance"
  - Default    → "Alert Supervisor"
```

##### `RiskScoringService.java` — ⭐ NEW (Improvement)
```
Method: calculateRiskScore(stationId, workType)
  Formula:
    baseScore = workType risk weight (Electrical=70, Chemical=90, Welding=50, Mechanical=30)
    + frequencyBonus = (events this week at this station) * 5
    + timeBonus = if during historically risky hours → +15
    + rapidSequenceBonus = if rapid sequential detected → +25
  
  Return: min(score, 100)  // cap at 100

  Risk Levels:
    0-25   → LOW
    26-50  → MEDIUM
    51-75  → HIGH
    76-100 → CRITICAL
```

##### `HmiService.java` — Visual Status
```
Method: getHmiState(stationId) → HmiState
  - Any OPEN or ESCALATED event → RED
  - Any ACKNOWLEDGED but UNRESOLVED event → AMBER
  - All events resolved → GREEN

Method: updateState(stationId, HmiState)
  - Update station.currentHmiState in DB
  - (Frontend polls this for real-time display)
```

##### `NotificationService.java` — Alerts & Dispatch
```
Method: autoDispatch(event, scheduledWork)
  1. Determine dispatch type from scheduledWork.instantHelp
  2. Create DispatchLog record
  3. Log: "AUTO-DISPATCH: [type] sent for Station [X], Event [Y]"
  4. (In production: integrate with SMS/email/webhook APIs)
  
Method: alertSupervisor(event)
  1. Create DispatchLog with type=SUPERVISOR_ALERT
  2. Log: "SUPERVISOR ALERT: Unacknowledged event at Station [X]"

Method: sendDetailedHelp(event, acknowledgement)
  - Called when operator acks as REAL_EMERGENCY
  - Dispatch additional resources based on correlation
```

##### `AnalyticsService.java` — ⭐ NEW
```
Methods:
  getDashboardSummary() → DashboardSummaryDTO
    - Total events today / this week / this month
    - Open events count
    - Mean acknowledgment time
    - Events by severity breakdown

  getPressFrequency(startDate, endDate, groupBy) → List<FrequencyDTO>
    - Group by: hour / shift / day / station
    - SQL: SELECT COUNT(*), DATE_TRUNC(...) FROM estop_event GROUP BY ...

  getMeanAckTime(startDate, endDate) → Double
    - SQL: SELECT AVG(TIMESTAMPDIFF(SECOND, e.pressed_at, a.acknowledged_at))

  getHighRiskStations() → List<StationRiskDTO>
    - Stations with most events + highest risk scores

  getShiftReport(date) → ShiftReportDTO
    - Events broken down by MORNING / AFTERNOON / NIGHT shifts
    - Shift boundaries: Morning=6AM-2PM, Afternoon=2PM-10PM, Night=10PM-6AM
```

##### `AuditService.java` — ⭐ NEW
```
Methods:
  logAction(eventId, action, userId, details)
    - Creates immutable AuditLog entry

  getAuditLogs(filters) → Page<AuditLog>
    - Filterable by date range, station, user, action type
    - Paginated

  exportAuditReport(startDate, endDate, format) → byte[]
    - Format: CSV or PDF
    - Includes: all events, acks, dispatches, who did what and when
    - Tamper-proof: include hash/checksum of report
```

##### `DatasetIngestionService.java` — ⭐ NEW
```
Methods:
  ingestFactories(MultipartFile csv)
  ingestStations(MultipartFile csv)
  ingestScheduledWork(MultipartFile csv)
  ingestEStopEvents(MultipartFile csv)
    - For each row: call SafetyService.processNewEvent()
    - This triggers the full workflow (correlation, escalation check, etc.)
  ingestAcknowledgements(MultipartFile csv)
    - For each row: simulate an acknowledgment

  validateCsv(MultipartFile csv, ExpectedFormat format) → ValidationResult
    - Check headers, data types, required fields
    - Return list of errors if any
```

---

#### 📁 `scheduler/`

| File | Schedule | Logic |
|------|----------|-------|
| `EscalationJob` | Every 30 seconds | Find all OPEN events older than 2 min → escalate |
| `RiskRecalculationJob` | Every Sunday midnight | Recalculate risk scores for all stations & work types based on last week's data |

```java
// EscalationJob pseudocode
@Scheduled(fixedRate = 30000) // every 30 seconds
public void checkForUnacknowledgedEvents() {
    Timestamp threshold = Timestamp.from(Instant.now().minusSeconds(120));
    List<EStopEvent> unacked = eventRepo.findByStatusAndPressedAtBefore("OPEN", threshold);
    
    for (EStopEvent event : unacked) {
        escalationService.escalate(event);
    }
}
```

---

## 6. Core Business Logic — Decision Flowcharts

### 6.1 Master Event Flow

```
E-Stop Button Pressed (Dataset Row Ingested)
              │
              ▼
    ┌─────────────────────┐
    │  Create Event       │
    │  status = OPEN      │
    │  HMI → RED          │
    └─────────┬───────────┘
              │
              ▼
    ┌─────────────────────┐     YES    ┌──────────────────────┐
    │  Rapid Sequential?  │───────────►│  Mark CRITICAL       │
    │  (same station,     │            │  Skip 2-min wait     │
    │   < 5 sec apart)    │            │  AUTO-DISPATCH NOW   │
    └─────────┬───────────┘            └──────────────────────┘
              │ NO
              ▼
    ┌─────────────────────┐
    │ Correlate with      │
    │ Scheduled Work      │
    └─────────┬───────────┘
              │
    ┌─────────┴──────────────────────┐
    │                                │
    ▼ WORK OVERLAP FOUND             ▼ NO OVERLAP
    │                                │
    ▼                                ▼
  Set riskScore based             Set riskScore = LOW
  on workType                     Wait for ack...
    │                                │
    ▼                                ▼
    ◄────────────────────────────────┘
              │
              ▼
    ╔═════════════════════════════════════╗
    ║     WAIT UP TO 2 MINUTES           ║
    ║     (EscalationJob monitors)       ║
    ╚════════════════╤════════════════════╝
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
    ACK RECEIVED              NO ACK (2 min passed)
    within 2 min              │
         │                    ▼
         │              ┌─────────────────┐
         │              │ AUTO-ESCALATE    │
         │              │ status=ESCALATED │
         │              └────────┬────────┘
         │                       │
         │              ┌────────┴────────────────┐
         │              │                         │
         │              ▼                         ▼
         │        WORK OVERLAP               NO OVERLAP
         │              │                         │
         │              ▼                         ▼
         │      AUTO-DISPATCH              ALERT SUPERVISOR
         │      (Ambulance/Fire)           (Manual decision)
         │      status=AUTO_DISPATCHED
         │
         ▼
    ┌─────────────────────────────┐
    │ What resolution category?   │
    └─────────┬───────────────────┘
              │
    ┌─────────┼──────────┬──────────────┬─────────────┐
    │         │          │              │             │
    ▼         ▼          ▼              ▼             ▼
  REAL      FALSE    TESTING/       MACHINE      CUSTOM
  EMERGENCY  ALARM   MAINTENANCE    FAULT        RESOLUTION
    │         │          │              │             │
    ▼         ▼          ▼              ▼             ▼
  Dispatch  Resolve   Resolve        Resolve      Require text
  detailed  (log      (log only)     (log,        input, then
  help      only)                    schedule     resolve
                                     repair)
    │         │          │              │             │
    └─────────┴──────────┴──────────────┴─────────────┘
              │
              ▼
    ┌─────────────────────┐
    │  status = RESOLVED  │
    │  HMI → GREEN        │
    │  Log to AuditLog    │
    └─────────────────────┘
```

### 6.2 Risk Score Calculation

```
BASE SCORE (by work type):
  Chemical Handling  = 90
  Electrical Work    = 70
  Welding            = 50
  Mechanical Work    = 30
  No Scheduled Work  = 10

MODIFIERS:
  + (events this week at station) × 5      [max +25]
  + rapid sequential detected    → +25
  + historically risky hour      → +15
  + station had CRITICAL event this month → +10

FINAL = min(base + modifiers, 100)

RISK LEVEL:
   0-25  → LOW       (Green badge)
  26-50  → MEDIUM    (Yellow badge)
  51-75  → HIGH      (Orange badge)
  76-100 → CRITICAL  (Red badge + auto-dispatch)
```

---

## 7. API Endpoints — Full Specification

### 7.1 Authentication APIs

| Method | Endpoint | Body | Response | Role |
|--------|----------|------|----------|------|
| POST | `/api/auth/login` | `{username, password}` | `{token, role, user}` | PUBLIC |
| POST | `/api/auth/register` | `{username, password, fullName, role}` | `{user}` | PUBLIC |

### 7.2 Station APIs

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| GET | `/api/stations` | List all stations with HMI states | ALL |
| GET | `/api/stations/{id}` | Single station details | ALL |
| GET | `/api/stations/{id}/status` | Current HMI state (RED/AMBER/GREEN) | ALL |
| GET | `/api/stations/factory/{factoryId}` | Stations by factory | ALL |

### 7.3 E-Stop Event APIs

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| POST | `/api/events` | Create new E-Stop event | OPERATOR, SUPERVISOR |
| GET | `/api/events` | List events (paginated, filterable) | OPERATOR, SUPERVISOR |
| GET | `/api/events/{id}` | Single event with full details | OPERATOR, SUPERVISOR |
| GET | `/api/events/open` | All currently open events | OPERATOR, SUPERVISOR |
| GET | `/api/events/station/{stationId}` | Events by station | OPERATOR, SUPERVISOR |

**Query Parameters for GET `/api/events`:**
- `status` — OPEN, ACKNOWLEDGED, ESCALATED, CRITICAL, RESOLVED
- `severity` — LOW, MEDIUM, HIGH, CRITICAL
- `stationId` — filter by station
- `factoryId` — filter by factory
- `from` / `to` — date range
- `page` / `size` — pagination
- `sort` — pressedAt,desc (default)

### 7.4 Acknowledgement APIs

| Method | Endpoint | Body | Role |
|--------|----------|------|------|
| POST | `/api/events/{eventId}/acknowledge` | `{resolutionCategory, customResolutionText?}` | OPERATOR |

**Resolution Categories:**
```
REAL_EMERGENCY        → triggers detailed help dispatch
FALSE_ALARM           → resolve, log only
TESTING_MAINTENANCE   → resolve, log only
MACHINE_FAULT         → resolve, optionally schedule repair
CUSTOM_RESOLUTION     → requires customResolutionText (mandatory text field)
```

### 7.5 Analytics APIs

| Method | Endpoint | Query Params | Role |
|--------|----------|-------------|------|
| GET | `/api/analytics/summary` | `factoryId?` | SUPERVISOR |
| GET | `/api/analytics/press-frequency` | `from, to, groupBy(hour/shift/day/station)` | SUPERVISOR |
| GET | `/api/analytics/mean-ack-time` | `from, to, stationId?` | SUPERVISOR |
| GET | `/api/analytics/high-risk-stations` | `factoryId?, limit?` | SUPERVISOR |
| GET | `/api/analytics/shift-report` | `date, factoryId?` | SUPERVISOR |
| GET | `/api/analytics/trend` | `stationId, weeks?` | SUPERVISOR |

**Sample Response — `/api/analytics/summary`:**
```json
{
  "totalEventsToday": 12,
  "totalEventsThisWeek": 47,
  "openEvents": 3,
  "escalatedEvents": 1,
  "meanAckTimeSeconds": 78.5,
  "highRiskStations": ["Station 3 - B1", "Station 4 - B1"],
  "eventsBySeverity": {
    "LOW": 20, "MEDIUM": 15, "HIGH": 8, "CRITICAL": 4
  },
  "eventsByShift": {
    "MORNING": 22, "AFTERNOON": 18, "NIGHT": 7
  }
}
```

### 7.6 Audit APIs

| Method | Endpoint | Query Params | Role |
|--------|----------|-------------|------|
| GET | `/api/audit/logs` | `from, to, stationId?, userId?, action?, page, size` | AUDITOR |
| GET | `/api/audit/export` | `from, to, format(csv/pdf)` | AUDITOR |
| GET | `/api/audit/event/{eventId}/timeline` | — | AUDITOR |

**Sample Response — `/api/audit/event/{eventId}/timeline`:**
```json
{
  "eventId": 1,
  "timeline": [
    {"time": "10:30:00", "action": "E-STOP_PRESSED", "by": "SYSTEM", "details": "Station 3, Block B1"},
    {"time": "10:30:01", "action": "CORRELATION_DETECTED", "by": "SYSTEM", "details": "Electrical work in progress"},
    {"time": "10:30:04", "action": "RAPID_SEQUENCE_DETECTED", "by": "SYSTEM", "details": "2nd press within 5s"},
    {"time": "10:30:04", "action": "STATUS_CHANGED", "by": "SYSTEM", "details": "OPEN → CRITICAL"},
    {"time": "10:30:05", "action": "AUTO_DISPATCH", "by": "SYSTEM", "details": "Ambulance + Fire Dept dispatched"},
    {"time": "10:32:15", "action": "ACKNOWLEDGED", "by": "op_ravi", "details": "REAL_EMERGENCY"}
  ]
}
```

### 7.7 Dataset APIs

| Method | Endpoint | Description | Role |
|--------|----------|-------------|------|
| POST | `/api/dataset/upload` | Upload CSV (multipart) | SUPERVISOR |
| POST | `/api/dataset/simulate` | Auto-generate events | SUPERVISOR |
| GET | `/api/dataset/status` | Last ingestion status | SUPERVISOR |
| GET | `/api/dataset/templates` | Download CSV templates | ALL |

---

## 8. Frontend — React UI Plan

### 8.1 Tech Stack
- **React 18+** with functional components & hooks
- **React Router** for navigation
- **Axios** for API calls
- **Tailwind CSS** or **Material UI** for styling
- **Recharts** or **Chart.js** for analytics graphs
- **React Hot Toast** for notifications
- **Context API or Redux** for auth state

### 8.2 Page Structure

```
src/
├── App.jsx
├── index.jsx
├── api/
│   ├── axiosInstance.js          (base URL, JWT interceptor)
│   ├── authApi.js
│   ├── eventApi.js
│   ├── stationApi.js
│   ├── analyticsApi.js
│   ├── auditApi.js
│   └── datasetApi.js
│
├── context/
│   └── AuthContext.jsx           (JWT token, user role, login/logout)
│
├── components/
│   ├── common/
│   │   ├── Navbar.jsx
│   │   ├── Sidebar.jsx
│   │   ├── ProtectedRoute.jsx    (role-based route guard)
│   │   ├── LoadingSpinner.jsx
│   │   └── Badge.jsx             (severity/status badges)
│   │
│   ├── station/
│   │   ├── StationCard.jsx       (single station with HMI color)
│   │   ├── StationGrid.jsx       (grid of all stations)
│   │   └── HmiIndicator.jsx      (Red/Amber/Green circle)
│   │
│   ├── events/
│   │   ├── EventList.jsx         (table of events with filters)
│   │   ├── EventDetail.jsx       (single event full details)
│   │   ├── AckModal.jsx          (acknowledgement form with categories)
│   │   └── EventTimeline.jsx     (visual timeline of event lifecycle)
│   │
│   ├── analytics/
│   │   ├── DashboardSummary.jsx  (key stats cards)
│   │   ├── PressFrequencyChart.jsx (bar/line chart)
│   │   ├── MeanAckTimeChart.jsx
│   │   ├── HighRiskStationsTable.jsx
│   │   ├── ShiftReportChart.jsx
│   │   └── RiskTrendChart.jsx
│   │
│   ├── audit/
│   │   ├── AuditLogTable.jsx     (filterable, paginated)
│   │   └── ExportButton.jsx      (CSV/PDF download)
│   │
│   └── dataset/
│       ├── DatasetUpload.jsx     (CSV file upload with drag-drop)
│       ├── SimulationControls.jsx (start/stop simulation)
│       └── IngestionStatus.jsx
│
├── pages/
│   ├── LoginPage.jsx
│   ├── OperatorDashboard.jsx     (station grid + open events + ack)
│   ├── SupervisorDashboard.jsx   (analytics + all events + dataset upload)
│   ├── AuditorDashboard.jsx      (audit logs + export)
│   └── NotFoundPage.jsx
│
└── utils/
    ├── formatDate.js
    ├── roleGuard.js
    └── constants.js
```

### 8.3 Page Descriptions

#### 🔐 Login Page
- Username + Password form
- On success → store JWT in localStorage, redirect to role-based dashboard
- On failure → show error toast

#### 👷 Operator Dashboard
```
┌────────────────────────────────────────────────────────┐
│  NAVBAR: [Logo] Safety E-Stop Logger    [Ravi | Logout]│
├──────────┬─────────────────────────────────────────────┤
│          │  MY STATION: Station 3 - Block B1           │
│ SIDEBAR  │  Status: 🔴 RED                             │
│          │                                             │
│ • My     │  ┌──────────────────────────────────────┐   │
│   Station│  │ OPEN EVENTS (needs your action)      │   │
│ • Events │  │                                      │   │
│ • History│  │ #7  | 1:30 PM | Electrical Work      │   │
│          │  │     | Risk: HIGH | [ACKNOWLEDGE]      │   │
│          │  │                                      │   │
│          │  │ #4  | 2:15 PM | Chemical Handling    │   │
│          │  │     | Risk: CRITICAL | [ACKNOWLEDGE]  │   │
│          │  └──────────────────────────────────────┘   │
│          │                                             │
│          │  ┌──────────────────────────────────────┐   │
│          │  │ RECENT HISTORY                       │   │
│          │  │ #3 | 9:45 AM | FALSE_ALARM | ✅       │   │
│          │  │ #6 | 9:30 AM | MACHINE_FAULT | ✅     │   │
│          │  └──────────────────────────────────────┘   │
└──────────┴─────────────────────────────────────────────┘
```

**Acknowledge Modal (when clicking [ACKNOWLEDGE]):**
```
┌──────────────────────────────────┐
│  Acknowledge Event #7            │
│                                  │
│  Select Resolution:              │
│  ○ Real Emergency                │
│  ○ False Alarm                   │
│  ○ Testing / Maintenance         │
│  ○ Machine Fault                 │
│  ○ Custom Resolution             │
│                                  │
│  ┌──────────────────────────┐    │
│  │ Custom details...        │    │  ← Only visible for Custom
│  │ (required text field)    │    │
│  └──────────────────────────┘    │
│                                  │
│  [Cancel]            [Submit]    │
└──────────────────────────────────┘
```

#### 📊 Supervisor Dashboard
```
┌──────────────────────────────────────────────────────────┐
│  NAVBAR: [Logo] Safety E-Stop Logger  [Anand | Logout]   │
├──────────┬───────────────────────────────────────────────┤
│          │ ┌─────┐ ┌─────┐ ┌──────┐ ┌────────┐          │
│ SIDEBAR  │ │  12 │ │  3  │ │ 78s  │ │  47    │          │
│          │ │Today│ │Open │ │ Avg  │ │ Week   │          │
│ •Overview│ │Events││Events│ │ Ack  │ │ Total  │          │
│ •Analytics│└─────┘ └─────┘ └──────┘ └────────┘          │
│ •Stations│                                               │
│ •Dataset │ STATION OVERVIEW                              │
│ •Events  │ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐                    │
│          │ │🔴│ │🟢│ │🟡│ │🔴│ │🟢│                    │
│          │ │S1│ │S2│ │S3│ │S4│ │S5│                    │
│          │ └──┘ └──┘ └──┘ └──┘ └──┘                    │
│          │                                               │
│          │ PRESS FREQUENCY (Bar Chart)                   │
│          │ ┌────────────────────────────────────┐        │
│          │ │ ██                                 │        │
│          │ │ ██ ██        ██                    │        │
│          │ │ ██ ██ ██  ██ ██ ██                 │        │
│          │ │ 6  7  8  9  10 11 12 1  2  3  4   │        │
│          │ └────────────────────────────────────┘        │
│          │                                               │
│          │ HIGH-RISK STATIONS                            │
│          │ Station 3 - Electrical - Score: 85 🔴         │
│          │ Station 4 - Chemical  - Score: 72 🟠         │
└──────────┴───────────────────────────────────────────────┘
```

#### 📋 Auditor Dashboard
```
┌──────────────────────────────────────────────────────────┐
│ AUDIT LOG                              [Export CSV] [PDF]│
│                                                          │
│ Filters: [Date Range ▼] [Station ▼] [User ▼] [Action ▼]│
│                                                          │
│ ┌──────┬────────┬──────────┬──────────┬────────────────┐ │
│ │ Time │ Event  │ Action   │ By       │ Details        │ │
│ ├──────┼────────┼──────────┼──────────┼────────────────┤ │
│ │10:30 │ #1     │ PRESSED  │ SYSTEM   │ Station 3, B1  │ │
│ │10:30 │ #1     │ CORR.    │ SYSTEM   │ Electrical Work│ │
│ │10:30 │ #2     │ RAPID_SEQ│ SYSTEM   │ 2nd press <5s  │ │
│ │10:30 │ #1,#2  │ DISPATCH │ SYSTEM   │ Fire+Ambulance │ │
│ │10:32 │ #1     │ ACK      │ op_ravi  │ REAL_EMERGENCY │ │
│ └──────┴────────┴──────────┴──────────┴────────────────┘ │
│                                                          │
│ Page: [< 1 2 3 4 5 >]                                   │
└──────────────────────────────────────────────────────────┘
```

---

## 9. Security & RBAC Plan

### 9.1 Role Permissions Matrix

| Feature | OPERATOR | SUPERVISOR | AUDITOR |
|---------|----------|-----------|---------|
| View own station status | ✅ | ✅ (all) | ❌ |
| View all stations | ❌ (own only) | ✅ | ❌ |
| Create E-Stop events | ✅ | ✅ | ❌ |
| Acknowledge events | ✅ | ❌ | ❌ |
| View analytics | ❌ | ✅ | ❌ |
| Upload datasets | ❌ | ✅ | ❌ |
| View audit logs | ❌ | ❌ | ✅ |
| Export audit reports | ❌ | ❌ | ✅ |
| View event timeline | ❌ | ✅ | ✅ |
| Run simulation | ❌ | ✅ | ❌ |

### 9.2 JWT Token Structure
```json
{
  "sub": "op_ravi",
  "userId": 1,
  "role": "OPERATOR",
  "assignedStationId": 3,
  "shift": "MORNING",
  "iat": 1712150400,
  "exp": 1712193600
}
```

### 9.3 API Security Rules
```java
// SecurityConfig.java - endpoint protection
.requestMatchers("/api/auth/**").permitAll()
.requestMatchers("/api/dataset/**").hasRole("SUPERVISOR")
.requestMatchers("/api/analytics/**").hasRole("SUPERVISOR")
.requestMatchers("/api/audit/**").hasRole("AUDITOR")
.requestMatchers(HttpMethod.POST, "/api/events/*/acknowledge").hasRole("OPERATOR")
.requestMatchers("/api/events/**").hasAnyRole("OPERATOR", "SUPERVISOR")
.requestMatchers("/api/stations/**").authenticated()
```

---

## 10. Development Phases & Sprint Plan

### Phase 1: Foundation (Week 1) 🏗️
| # | Task | Files | Priority |
|---|------|-------|----------|
| 1 | Initialize Spring Boot project with dependencies | `pom.xml` | 🔴 HIGH |
| 2 | Create all entity classes | `model/entity/*` | 🔴 HIGH |
| 3 | Create all enums | `model/enums/*` | 🔴 HIGH |
| 4 | Create all DTOs | `model/dto/*` | 🔴 HIGH |
| 5 | Create all repositories | `repository/*` | 🔴 HIGH |
| 6 | Write `schema.sql` and `data.sql` | `resources/` | 🔴 HIGH |
| 7 | Configure `application.yml` (DB, server port) | `resources/` | 🔴 HIGH |
| 8 | Create utility classes | `util/*` | 🟡 MEDIUM |

**Deliverable:** Database ready, entities mapped, repositories working.

### Phase 2: Core Safety Logic (Week 2) ⚡
| # | Task | Files | Priority |
|---|------|-------|----------|
| 9 | Implement `SafetyService` (event creation + rapid sequence) | `service/` | 🔴 HIGH |
| 10 | Implement `CorrelationService` (work overlap detection) | `service/` | 🔴 HIGH |
| 11 | Implement `EscalationService` (2-min rule) | `service/` | 🔴 HIGH |
| 12 | Implement `EscalationJob` (scheduler) | `scheduler/` | 🔴 HIGH |
| 13 | Implement `HmiService` (station state logic) | `service/` | 🟡 MEDIUM |
| 14 | Implement `NotificationService` (dispatch logging) | `service/` | 🟡 MEDIUM |
| 15 | Implement `RiskScoringService` | `service/` | 🟡 MEDIUM |
| 16 | Write unit tests for all services | `test/service/*` | 🟡 MEDIUM |

**Deliverable:** Full safety workflow works end-to-end in backend.

### Phase 3: API Layer + Security (Week 3) 🔐
| # | Task | Files | Priority |
|---|------|-------|----------|
| 17 | Implement `JwtUtil` and `JwtFilter` | `security/` | 🔴 HIGH |
| 18 | Implement `SecurityConfig` (RBAC) | `config/` | 🔴 HIGH |
| 19 | Implement `AuthController` (login/register) | `controller/` | 🔴 HIGH |
| 20 | Implement `StationController` | `controller/` | 🔴 HIGH |
| 21 | Implement `EStopEventController` | `controller/` | 🔴 HIGH |
| 22 | Implement `AcknowledgementController` | `controller/` | 🔴 HIGH |
| 23 | Implement `GlobalExceptionHandler` | `exception/` | 🟡 MEDIUM |
| 24 | Configure Swagger | `config/` | 🟢 LOW |
| 25 | Test all APIs via Postman/Swagger | — | 🔴 HIGH |

**Deliverable:** All APIs working with JWT auth and role restrictions.

### Phase 4: Analytics + Audit + Dataset (Week 4) 📊
| # | Task | Files | Priority |
|---|------|-------|----------|
| 26 | Implement `AnalyticsService` | `service/` | 🔴 HIGH |
| 27 | Implement `AnalyticsController` | `controller/` | 🔴 HIGH |
| 28 | Implement `AuditService` (logging + export) | `service/` | 🟡 MEDIUM |
| 29 | Implement `AuditController` | `controller/` | 🟡 MEDIUM |
| 30 | Implement `DatasetIngestionService` (CSV parsing) | `service/` | 🔴 HIGH |
| 31 | Implement `DatasetController` (upload endpoint) | `controller/` | 🔴 HIGH |
| 32 | Create sample CSV datasets | `resources/datasets/` | 🔴 HIGH |
| 33 | Implement `RiskRecalculationJob` | `scheduler/` | 🟢 LOW |

**Deliverable:** Full backend complete with dataset simulation.

### Phase 5: React Frontend (Week 5-6) 🎨
| # | Task | Priority |
|---|------|----------|
| 34 | Setup React project + routing + auth context | 🔴 HIGH |
| 35 | Build Login Page | 🔴 HIGH |
| 36 | Build Operator Dashboard (station + events + ack modal) | 🔴 HIGH |
| 37 | Build Supervisor Dashboard (analytics charts) | 🔴 HIGH |
| 38 | Build Auditor Dashboard (logs + export) | 🟡 MEDIUM |
| 39 | Build Dataset Upload page | 🟡 MEDIUM |
| 40 | Build Event Timeline component | 🟡 MEDIUM |
| 41 | Add real-time polling (or WebSocket later) | 🟢 LOW |
| 42 | Responsive design + polish | 🟢 LOW |

**Deliverable:** Full-stack application working.

### Phase 6: Testing + Polish (Week 7) ✅
| # | Task | Priority |
|---|------|----------|
| 43 | Integration tests (full workflow) | 🔴 HIGH |
| 44 | Load test with large datasets | 🟡 MEDIUM |
| 45 | Edge case testing (rapid sequence, concurrent acks) | 🟡 MEDIUM |
| 46 | Documentation (README, API docs) | 🟡 MEDIUM |
| 47 | Demo preparation with realistic dataset | 🔴 HIGH |

---

## 11. Testing Strategy

### 11.1 Unit Tests (Service Layer)

| Test Class | Key Test Cases |
|-----------|---------------|
| `SafetyServiceTest` | Create event → status=OPEN; Rapid sequence detection (2 presses <5s); HMI updated to RED |
| `EscalationServiceTest` | Event >2 min without ack → ESCALATED; Event with work overlap → AUTO_DISPATCHED; Event <2 min → no escalation |
| `CorrelationServiceTest` | Event during electrical work → correlated; Event outside work hours → no correlation; Correct risk score assigned |
| `RiskScoringServiceTest` | Chemical work → score >75; No work overlap → score <25; Multiple events increase score |

### 11.2 Integration Tests

| Test | Scenario |
|------|----------|
| `FullWorkflowTest` | Upload dataset → events created → correlations detected → 2 min passes → escalation triggers → verify dispatch logs |
| `RapidSequenceTest` | Upload 2 events <5s apart → verify CRITICAL status + immediate dispatch |
| `AckWorkflowTest` | Create event → ack as REAL_EMERGENCY → verify detailed help dispatched |
| `AckTimeoutTest` | Create event → wait 2+ min → verify auto-escalation |

### 11.3 API Tests

| Endpoint | Test |
|----------|------|
| POST `/api/auth/login` | Valid creds → 200 + JWT; Invalid → 401 |
| POST `/api/events` | Operator → 201; Auditor → 403 |
| POST `/api/events/{id}/acknowledge` | Valid → 200; Already acked → 409; Wrong role → 403 |
| GET `/api/analytics/summary` | Supervisor → 200; Operator → 403 |
| GET `/api/audit/export` | Auditor → 200 + file; Others → 403 |

---

## 12. Improvements Added Beyond Original Scope

These are enhancements I've added to make the project more robust and impressive:

| # | Improvement | Why It Matters |
|---|------------|----------------|
| 1 | **Factory entity** added | Supports multi-factory setup, more realistic |
| 2 | **DispatchLog table** added | Tracks exactly what help was dispatched and when |
| 3 | **AuditLog table** with JSON details | Tamper-proof trail with full context |
| 4 | **RiskScoreHistory table** | Tracks risk trends over weeks for analytics |
| 5 | **Risk Score formula** defined | Quantifiable, weighted scoring instead of just labels |
| 6 | **Event Timeline API** | Shows full lifecycle of an event (great for auditors) |
| 7 | **Dataset validation** before ingestion | Prevents bad data from corrupting the system |
| 8 | **SimulationService** | Auto-generate realistic events for demos |
| 9 | **Profile-based config** (dev/prod) | Professional environment management |
| 10 | **Export formats** (CSV + PDF) | Auditors need downloadable reports |
| 11 | **MACHINE_FAULT resolution category** | Was missing — common real-world scenario |
| 12 | **Custom resolution with mandatory text** | Ensures detailed logging for unusual situations |
| 13 | **Operator-to-station assignment** | Operators see only their station (data isolation) |
| 14 | **Shift-based analytics** | Morning/Afternoon/Night breakdown |
| 15 | **Weekly risk recalculation job** | Risk scores evolve based on real data patterns |
| 16 | **DuplicateAckException** | Prevents double-acknowledgement bugs |
| 17 | **Full React component tree** planned | Role-based dashboards with charts |
| 18 | **Comprehensive test strategy** | Unit + Integration + API tests |

---

## 📋 Dependencies (pom.xml)

```xml
<!-- Core -->
spring-boot-starter-web
spring-boot-starter-data-jpa
spring-boot-starter-security
spring-boot-starter-validation

<!-- Database -->
mysql-connector-j (or postgresql)
h2 (for testing)

<!-- JWT -->
jjwt-api, jjwt-impl, jjwt-jackson (io.jsonwebtoken)

<!-- Scheduling -->
(built into spring-boot-starter)

<!-- Swagger -->
springdoc-openapi-starter-webmvc-ui

<!-- CSV Parsing -->
opencsv (com.opencsv)

<!-- PDF Export (optional) -->
itext7 or jasperreports

<!-- Testing -->
spring-boot-starter-test
spring-security-test

<!-- Lombok (optional but recommended) -->
lombok
```

---

> 🚀 **This document is your complete development blueprint.** Every file, every method, every API, every decision flow is mapped out. You can now focus purely on writing code — no more planning needed.


safety-estop-logger/
├── pom.xml
├── src/
│   ├── main/
│   │   ├── java/com/factory/safety/
│   │   │   ├── SafetyEstopApplication.java              ← Main entry point
│   │   │   │
│   │   │   ├── config/                                   ← Configuration Layer
│   │   │   │   ├── SecurityConfig.java                   (RBAC + JWT filter chain)
│   │   │   │   ├── SchedulerConfig.java                  (Thread pool for @Scheduled)
│   │   │   │   ├── SwaggerConfig.java                    (OpenAPI 3.0 docs)
│   │   │   │   └── CorsConfig.java                       (React frontend CORS)
│   │   │   │
│   │   │   ├── controller/                               ← REST API Layer
│   │   │   │   ├── AuthController.java                   (login/register)
│   │   │   │   ├── StationController.java
│   │   │   │   ├── EStopEventController.java
│   │   │   │   ├── AcknowledgementController.java
│   │   │   │   ├── AnalyticsController.java
│   │   │   │   ├── AuditController.java
│   │   │   │   └── DatasetController.java                (CSV upload)
│   │   │   │
│   │   │   ├── service/                                  ← Business Logic Layer
│   │   │   │   ├── SafetyService.java                    (Central event handler)
│   │   │   │   ├── EscalationService.java                (2-minute rule)
│   │   │   │   ├── CorrelationService.java               (Work overlap detection)
│   │   │   │   ├── RiskScoringService.java               (Risk score formula)
│   │   │   │   ├── HmiService.java                       (RED/AMBER/GREEN state)
│   │   │   │   ├── NotificationService.java              (Alerts & dispatch)
│   │   │   │   ├── AnalyticsService.java                 (Dashboard metrics)
│   │   │   │   ├── AuditService.java                     (Immutable audit logs)
│   │   │   │   ├── DatasetIngestionService.java          (CSV parsing & loading)
│   │   │   │   ├── SimulationService.java                (Auto-generate test events)
│   │   │   │   └── UserService.java
│   │   │   │
│   │   │   ├── scheduler/                                ← Scheduled Jobs Layer
│   │   │   │   ├── EscalationJob.java                    (Every 30s: check unacked > 2min)
│   │   │   │   └── RiskRecalculationJob.java             (Weekly risk recalc)
│   │   │   │
│   │   │   ├── repository/                               ← Data Access Layer (Spring Data JPA)
│   │   │   │   ├── FactoryRepository.java
│   │   │   │   ├── StationRepository.java
│   │   │   │   ├── EStopEventRepository.java
│   │   │   │   ├── AcknowledgementRepository.java
│   │   │   │   ├── ScheduledWorkRepository.java
│   │   │   │   ├── UserRepository.java
│   │   │   │   ├── DispatchLogRepository.java
│   │   │   │   ├── AuditLogRepository.java
│   │   │   │   └── RiskScoreHistoryRepository.java
│   │   │   │
│   │   │   ├── model/                                    ← Domain Model Layer
│   │   │   │   ├── entity/                               (JPA Entities — 9 tables)
│   │   │   │   │   ├── Factory, Station, EStopEvent, Acknowledgement,
│   │   │   │   │   │   ScheduledWork, AppUser, DispatchLog, AuditLog,
│   │   │   │   │   │   RiskScoreHistory
│   │   │   │   ├── dto/                                  (Request/Response DTOs — 9 DTOs)
│   │   │   │   │   ├── EStopEventDTO, AckRequestDTO, AnalyticsDTO,
│   │   │   │   │   │   StationStatusDTO, LoginRequestDTO, LoginResponseDTO,
│   │   │   │   │   │   DispatchDTO, AuditExportDTO, DashboardSummaryDTO
│   │   │   │   └── enums/                                (Type-safe enumerations — 8 enums)
│   │   │   │       ├── EventStatus, Severity, ResolutionCategory, UserRole,
│   │   │   │       │   HmiState, DispatchType, RiskLevel, ShiftType
│   │   │   │
│   │   │   ├── security/                                 ← Security Layer
│   │   │   │   ├── JwtFilter.java
│   │   │   │   ├── JwtUtil.java
│   │   │   │   └── CustomUserDetailsService.java
│   │   │   │
│   │   │   ├── exception/                                ← Exception Handling
│   │   │   │   ├── ResourceNotFoundException.java
│   │   │   │   ├── UnauthorizedException.java
│   │   │   │   ├── DuplicateAckException.java
│   │   │   │   └── GlobalExceptionHandler.java
│   │   │   │
│   │   │   └── util/                                     ← Utility Classes
│   │   │       ├── ShiftUtil.java
│   │   │       ├── TimeUtil.java
│   │   │       ├── RiskScoreUtil.java
│   │   │       └── CsvParserUtil.java
│   │   │
│   │   └── resources/
│   │       ├── application.yml
│   │       ├── application-dev.yml                       (Dev profile)
│   │       ├── application-prod.yml                      (Prod profile)
│   │       ├── schema.sql
│   │       ├── data.sql
│   │       └── datasets/                                 (Sample CSV datasets)
│   │           ├── factories.csv, stations.csv, scheduled_work.csv,
│   │           │   estop_events.csv, users.csv, acknowledgements.csv
│   │
│   └── test/java/com/factory/safety/                     ← Test Layer
│       ├── service/                                      (Unit tests)
│       ├── controller/                                   (Controller tests)
│       └── integration/                                  (Full workflow integration tests)

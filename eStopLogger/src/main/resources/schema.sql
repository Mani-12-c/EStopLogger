-- =====================================================
-- Safety E-Stop Logger - Database Schema
-- =====================================================

-- Factory
CREATE TABLE IF NOT EXISTS factory (
    factory_id      VARCHAR(20) PRIMARY KEY,
    factory_name    VARCHAR(100) NOT NULL,
    location        VARCHAR(200),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Station
CREATE TABLE IF NOT EXISTS station (
    station_id        BIGINT AUTO_INCREMENT PRIMARY KEY,
    factory_id        VARCHAR(20) NOT NULL,
    block_id          VARCHAR(20) NOT NULL,
    station_name      VARCHAR(100) NOT NULL,
    status            VARCHAR(20) DEFAULT 'ACTIVE',
    current_hmi_state VARCHAR(10) DEFAULT 'GREEN',
    created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (factory_id) REFERENCES factory(factory_id)
);

-- User
CREATE TABLE IF NOT EXISTS app_user (
    user_id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    username            VARCHAR(50) UNIQUE NOT NULL,
    password            VARCHAR(255) NOT NULL,
    full_name           VARCHAR(100) NOT NULL,
    role                VARCHAR(20) NOT NULL,
    assigned_station_id BIGINT,
    shift               VARCHAR(20),
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_station_id) REFERENCES station(station_id)
);

-- Scheduled Work
CREATE TABLE IF NOT EXISTS scheduled_work (
    work_id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    station_id          BIGINT NOT NULL,
    factory_id          VARCHAR(20) NOT NULL,
    block_id            VARCHAR(20) NOT NULL,
    work_type           VARCHAR(50) NOT NULL,
    probable_emergency  VARCHAR(100),
    instant_help        VARCHAR(200),
    start_time          TIMESTAMP NOT NULL,
    end_time            TIMESTAMP NOT NULL,
    risk_level          VARCHAR(20) DEFAULT 'LOW',
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (station_id) REFERENCES station(station_id),
    FOREIGN KEY (factory_id) REFERENCES factory(factory_id)
);

-- E-Stop Event
CREATE TABLE IF NOT EXISTS estop_event (
    event_id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    station_id          BIGINT NOT NULL,
    factory_id          VARCHAR(20) NOT NULL,
    block_id            VARCHAR(20) NOT NULL,
    pressed_at          TIMESTAMP NOT NULL,
    event_status        VARCHAR(30) DEFAULT 'OPEN',
    severity            VARCHAR(20) DEFAULT 'MEDIUM',
    is_rapid_sequence   BOOLEAN DEFAULT FALSE,
    correlated_work_id  BIGINT,
    risk_score          INT DEFAULT 0,
    created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (station_id) REFERENCES station(station_id),
    FOREIGN KEY (factory_id) REFERENCES factory(factory_id),
    FOREIGN KEY (correlated_work_id) REFERENCES scheduled_work(work_id)
);

-- Acknowledgement
CREATE TABLE IF NOT EXISTS acknowledgement (
    ack_id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id                BIGINT NOT NULL UNIQUE,
    user_id                 BIGINT NOT NULL,
    acknowledged_at         TIMESTAMP NOT NULL,
    resolution_category     VARCHAR(30) NOT NULL,
    custom_resolution_text  TEXT,
    ack_within_threshold    BOOLEAN NOT NULL,
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES estop_event(event_id),
    FOREIGN KEY (user_id) REFERENCES app_user(user_id)
);

-- Dispatch Log
CREATE TABLE IF NOT EXISTS dispatch_log (
    dispatch_id     BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id        BIGINT NOT NULL,
    dispatch_type   VARCHAR(30) NOT NULL,
    dispatched_at   TIMESTAMP NOT NULL,
    trigger_reason  VARCHAR(200) NOT NULL,
    response_status VARCHAR(20) DEFAULT 'DISPATCHED',
    notes           TEXT,
    FOREIGN KEY (event_id) REFERENCES estop_event(event_id)
);

-- Audit Log
CREATE TABLE IF NOT EXISTS audit_log (
    audit_id      BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id      BIGINT,
    action        VARCHAR(100) NOT NULL,
    performed_by  BIGINT,
    timestamp     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    details       TEXT,
    ip_address    VARCHAR(45),
    FOREIGN KEY (event_id) REFERENCES estop_event(event_id),
    FOREIGN KEY (performed_by) REFERENCES app_user(user_id)
);

-- Risk Score History
CREATE TABLE IF NOT EXISTS risk_score_history (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    station_id      BIGINT NOT NULL,
    work_type       VARCHAR(50) NOT NULL,
    risk_score      INT NOT NULL,
    week_number     INT NOT NULL,
    event_count     INT NOT NULL,
    calculated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (station_id) REFERENCES station(station_id)
);

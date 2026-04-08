-- =====================================================
-- Safety E-Stop Logger - Sample Data for Development
-- =====================================================

-- Factories
INSERT INTO factory (factory_id, factory_name, location) VALUES
('100091', 'Chennai Plant A', 'Chennai Industrial Zone'),
('100092', 'Hyderabad Plant B', 'Hyderabad Tech Park');

-- Stations
INSERT INTO station (station_id, factory_id, block_id, station_name, status, current_hmi_state) VALUES
(1, '100091', 'B1', 'Assembly Line Station 1', 'ACTIVE', 'GREEN'),
(2, '100091', 'B1', 'Welding Bay Station 2', 'ACTIVE', 'GREEN'),
(3, '100091', 'B2', 'Electrical Panel Station 3', 'ACTIVE', 'GREEN'),
(4, '100092', 'B1', 'Paint Booth Station 1', 'ACTIVE', 'GREEN'),
(5, '100092', 'B2', 'CNC Machine Station 2', 'ACTIVE', 'GREEN');

-- Users (passwords are BCrypt encoded "password123")
INSERT INTO app_user (user_id, username, password, full_name, role, assigned_station_id, shift) VALUES
(1, 'op_ravi', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Ravi Kumar', 'OPERATOR', 3, 'MORNING'),
(2, 'op_priya', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Priya Sharma', 'OPERATOR', 2, 'MORNING'),
(3, 'sup_anand', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Anand Reddy', 'SUPERVISOR', NULL, 'MORNING'),
(4, 'aud_meena', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Meena Iyer', 'AUDITOR', NULL, 'MORNING');

-- Scheduled Work
INSERT INTO scheduled_work (work_id, station_id, factory_id, block_id, work_type, probable_emergency, instant_help, start_time, end_time, risk_level) VALUES
(1, 3, '100091', 'B2', 'Electrical', 'Health/Fire/Machine', 'Send Ambulance/Fire Dept', '2026-04-03 10:00:00', '2026-04-03 14:00:00', 'HIGH'),
(2, 2, '100091', 'B1', 'Welding', 'Fire/Burns', 'Send Fire Dept/Ambulance', '2026-04-03 09:00:00', '2026-04-03 12:00:00', 'MEDIUM'),
(3, 4, '100092', 'B1', 'Chemical Handling', 'Toxic Exposure/Fire', 'Send Hazmat/Ambulance', '2026-04-03 13:00:00', '2026-04-03 16:00:00', 'CRITICAL'),
(4, 5, '100092', 'B2', 'Mechanical Maintenance', 'Injury/Crush', 'Send Ambulance', '2026-04-03 08:00:00', '2026-04-03 11:00:00', 'LOW');

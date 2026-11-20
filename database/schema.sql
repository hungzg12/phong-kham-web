-- An Tâm Clinic: relational identities, foreign keys and indexed booking constraints.
-- The JSONB document stores the remaining typed fields of each domain entity.
CREATE TABLE IF NOT EXISTS clinic_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS clinic_patients (id TEXT PRIMARY KEY, data JSONB NOT NULL);
CREATE TABLE IF NOT EXISTS clinic_specialties (id TEXT PRIMARY KEY, data JSONB NOT NULL);
CREATE TABLE IF NOT EXISTS clinic_doctors (id TEXT PRIMARY KEY, specialty_id TEXT NOT NULL REFERENCES clinic_specialties(id), data JSONB NOT NULL);
CREATE TABLE IF NOT EXISTS clinic_users (id TEXT PRIMARY KEY, username TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('patient','doctor','reception','admin')), patient_id TEXT UNIQUE REFERENCES clinic_patients(id), doctor_id TEXT UNIQUE REFERENCES clinic_doctors(id), data JSONB NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS clinic_username_unique ON clinic_users(LOWER(username));
CREATE TABLE IF NOT EXISTS clinic_shifts (id TEXT PRIMARY KEY, doctor_id TEXT NOT NULL REFERENCES clinic_doctors(id), day DATE NOT NULL, capacity INTEGER NOT NULL CHECK(capacity>0), data JSONB NOT NULL);
CREATE INDEX IF NOT EXISTS clinic_shifts_day ON clinic_shifts(day,doctor_id);
CREATE TABLE IF NOT EXISTS clinic_appointments (id TEXT PRIMARY KEY, patient_id TEXT NOT NULL REFERENCES clinic_patients(id), shift_id TEXT NOT NULL REFERENCES clinic_shifts(id), status TEXT NOT NULL CHECK(status IN ('pending','confirmed','received','cancelled','rejected')), request_id TEXT NOT NULL UNIQUE, data JSONB NOT NULL);
CREATE INDEX IF NOT EXISTS clinic_appointment_capacity ON clinic_appointments(shift_id,status);
CREATE TABLE IF NOT EXISTS clinic_visits (id TEXT PRIMARY KEY, appointment_id TEXT NOT NULL UNIQUE REFERENCES clinic_appointments(id), doctor_id TEXT NOT NULL REFERENCES clinic_doctors(id), data JSONB NOT NULL);
CREATE TABLE IF NOT EXISTS clinic_medicines (id TEXT PRIMARY KEY, data JSONB NOT NULL);
CREATE TABLE IF NOT EXISTS clinic_records (id TEXT PRIMARY KEY, visit_id TEXT NOT NULL UNIQUE REFERENCES clinic_visits(id), data JSONB NOT NULL);
CREATE TABLE IF NOT EXISTS clinic_prescription_lines (record_id TEXT NOT NULL REFERENCES clinic_records(id), line_no INTEGER NOT NULL, medicine_id TEXT NOT NULL REFERENCES clinic_medicines(id), data JSONB NOT NULL, PRIMARY KEY(record_id,line_no));
CREATE TABLE IF NOT EXISTS clinic_notifications (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES clinic_users(id), data JSONB NOT NULL);

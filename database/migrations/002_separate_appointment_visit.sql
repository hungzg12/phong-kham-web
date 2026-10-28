-- Preserve appointments, visits, records, identities and historical clinical states.
ALTER TABLE clinic_appointments DROP CONSTRAINT IF EXISTS clinic_appointments_status_check;
UPDATE clinic_appointments a
SET status='received', data=jsonb_set(a.data,'{status}','"received"'::jsonb)
WHERE a.status IN ('waiting','examining','completed')
AND EXISTS (SELECT 1 FROM clinic_visits v WHERE v.appointment_id=a.id);
ALTER TABLE clinic_appointments ADD CONSTRAINT clinic_appointments_status_check
CHECK(status IN ('pending','confirmed','received','cancelled','rejected'));
INSERT INTO clinic_meta(key,value) VALUES('migration_002','1') ON CONFLICT(key) DO NOTHING;

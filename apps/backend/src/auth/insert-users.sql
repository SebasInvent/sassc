INSERT INTO "Practitioner" (id, license, "firstName", "lastName", specialty, "createdAt", "updatedAt")
VALUES 
  ('doctor-001', 'MP-87654321', 'Doctor', 'User', 'Medicina General', NOW(), NOW()),
  ('nurse-001', 'MP-11223344', 'Nurse', 'User', 'Enfermería', NOW(), NOW()),
  ('pharmacist-001', 'MP-55667788', 'Pharmacist', 'User', 'Farmacia', NOW(), NOW()),
  ('radiologist-001', 'MP-99887766', 'Radiologist', 'User', 'Radiología', NOW(), NOW())
ON CONFLICT (license) DO UPDATE SET
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName",
  specialty = EXCLUDED.specialty;
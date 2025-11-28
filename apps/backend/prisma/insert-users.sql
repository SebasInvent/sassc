-- Insertar practitioners con licencias específicas
INSERT INTO "Practitioner" (id, license, "firstName", "lastName", specialty, "createdAt", "updatedAt")
VALUES 
  ('admin-user-001', 'MP-43423635', 'Admin', 'User', 'Administración', NOW(), NOW()),
  ('doctor-user-001', 'MP-87654321', 'Doctor', 'User', 'Medicina General', NOW(), NOW()),
  ('nurse-user-001', 'MP-11223344', 'Nurse', 'User', 'Enfermería', NOW(), NOW()),
  ('pharmacist-user-001', 'MP-55667788', 'Pharmacist', 'User', 'Farmacia', NOW(), NOW()),
  ('radiologist-user-001', 'MP-99887766', 'Radiologist', 'User', 'Radiología', NOW(), NOW())
ON CONFLICT (license) DO UPDATE SET
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName",
  specialty = EXCLUDED.specialty;

-- Insertar usuarios vinculados
INSERT INTO "User" (id, email, password, role, "firstName", "lastName", "practitionerId", "isActive", "createdAt", "updatedAt")
VALUES 
  ('user-admin-001', 'admin.user@medicare.com', '$2a$10$YourHashedPasswordHere', 'ADMIN', 'Admin', 'User', 'admin-user-001', true, NOW(), NOW()),
  ('user-doctor-001', 'doctor.user@medicare.com', '$2a$10$YourHashedPasswordHere', 'DOCTOR', 'Doctor', 'User', 'doctor-user-001', true, NOW(), NOW()),
  ('user-nurse-001', 'nurse.user@medicare.com', '$2a$10$YourHashedPasswordHere', 'NURSE', 'Nurse', 'User', 'nurse-user-001', true, NOW(), NOW()),
  ('user-pharmacist-001', 'pharmacist.user@medicare.com', '$2a$10$YourHashedPasswordHere', 'PHARMACIST', 'Pharmacist', 'User', 'pharmacist-user-001', true, NOW(), NOW()),
  ('user-radiologist-001', 'radiologist.user@medicare.com', '$2a$10$YourHashedPasswordHere', 'RADIOLOGIST', 'Radiologist', 'User', 'radiologist-user-001', true, NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET
  role = EXCLUDED.role,
  "practitionerId" = EXCLUDED."practitionerId",
  "isActive" = true;

-- Insertar pacientes de prueba
INSERT INTO "Patient" (id, "docType", "docNumber", "firstName", "lastName", "birthDate", "createdAt", "updatedAt")
VALUES 
  ('patient-001', 'CC', '1234567890', 'Juan', 'Pérez', '1985-03-15T00:00:00.000Z', NOW(), NOW()),
  ('patient-002', 'CC', '0987654321', 'María', 'González', '1990-07-22T00:00:00.000Z', NOW(), NOW()),
  ('patient-003', 'CC', '1122334455', 'Carlos', 'Rodríguez', '1978-11-30T00:00:00.000Z', NOW(), NOW()),
  ('patient-004', 'CC', '5566778899', 'Ana', 'Martínez', '1995-05-18T00:00:00.000Z', NOW(), NOW()),
  ('patient-005', 'CC', '9988776655', 'Luis', 'López', '1982-09-25T00:00:00.000Z', NOW(), NOW()),
  ('patient-006', 'CC', '4433221100', 'Laura', 'Hernández', '1988-12-10T00:00:00.000Z', NOW(), NOW()),
  ('patient-007', 'CC', '6677889900', 'Pedro', 'García', '1975-04-05T00:00:00.000Z', NOW(), NOW()),
  ('patient-008', 'TI', '1357924680', 'Sofia', 'Ramírez', '1992-08-14T00:00:00.000Z', NOW(), NOW()),
  ('patient-009', 'CC', '2468013579', 'Diego', 'Torres', '1980-02-28T00:00:00.000Z', NOW(), NOW()),
  ('patient-010', 'TI', '9876543210', 'Elena', 'Flores', '1998-06-20T00:00:00.000Z', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  "docType" = EXCLUDED."docType",
  "firstName" = EXCLUDED."firstName",
  "lastName" = EXCLUDED."lastName",
  "docNumber" = EXCLUDED."docNumber",
  "birthDate" = EXCLUDED."birthDate";

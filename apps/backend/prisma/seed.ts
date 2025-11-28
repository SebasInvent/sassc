import { PrismaClient, DocumentType, AppointmentStatus, EncounterStatus } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function main() {
  console.log(' Start seeding Medicare database...\n');

  // 1. Clean up existing data
  console.log(' Cleaning existing data...');
  await prisma.imagingResult.deleteMany();
  await prisma.imagingOrder.deleteMany();
  await prisma.laboratoryResult.deleteMany();
  await prisma.laboratoryOrder.deleteMany();
  await prisma.authorization.deleteMany();
  await prisma.dispensation.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.inventory.deleteMany();
  await prisma.condition.deleteMany();
  await prisma.observation.deleteMany();
  await prisma.encounter.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.practitioner.deleteMany();
  await prisma.organization.deleteMany();
  console.log(' Cleanup complete\n');

  // 2. Create Organizations
  console.log(' Creating organizations...');
  const org1 = await prisma.organization.create({
    data: {
      name: 'Hospital Universitario San Ignacio',
      type: 'hospital',
      city: 'Bogotá',
      state: 'Cundinamarca',
    },
  });

  const org2 = await prisma.organization.create({
    data: {
      name: 'Clínica Medellín',
      type: 'clinic',
      city: 'Medellín',
      state: 'Antioquia',
    },
  });
  console.log(' Created 2 organizations\n');

  // 3. Create Practitioners
  console.log(' Creating practitioners...');
  const specialties = [
    'Medicina General', 'Cardiología', 'Pediatría', 'Ortopedia', 
    'Dermatología', 'Ginecología', 'Neurología', 'Radiología',
    'Medicina Interna', 'Cirugía General'
  ];
  
  const practitioners = [];

  // 3.1. Create specific practitioners with roles for login
  console.log(' Creating users with roles...');
  const usersData = [
    { license: 'MP-43423635', role: 'ADMIN', name: 'Admin', lastName: 'User', specialty: 'Administración' },
    { license: 'MP-87654321', role: 'DOCTOR', name: 'Doctor', lastName: 'User', specialty: 'Medicina General' },
    { license: 'MP-11223344', role: 'NURSE', name: 'Nurse', lastName: 'User', specialty: 'Enfermería' },
    { license: 'MP-55667788', role: 'PHARMACIST', name: 'Pharmacist', lastName: 'User', specialty: 'Farmacia' },
    { license: 'MP-99887766', role: 'RADIOLOGIST', name: 'Radiologist', lastName: 'User', specialty: 'Radiología' },
  ];
  
  for (const userData of usersData) {
    console.log(`   Creating practitioner with license: ${userData.license}`);
    
    // Crear practitioner
    const practitioner = await prisma.practitioner.upsert({
      where: { license: userData.license },
      update: {
        firstName: userData.name,
        lastName: userData.lastName,
        specialty: userData.specialty,
      },
      create: {
        license: userData.license,
        firstName: userData.name,
        lastName: userData.lastName,
        specialty: userData.specialty,
      },
    });
    
    console.log(`   ✓ Practitioner created: ${practitioner.firstName} ${practitioner.lastName}`);
    
    // Crear usuario vinculado
    const email = `${userData.name.toLowerCase()}.${userData.lastName.toLowerCase()}@medicare.com`;
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        role: userData.role as any,
        isActive: true,
        practitionerId: practitioner.id,
      },
      create: {
        email,
        password: '$2a$10$YourHashedPasswordHere',
        role: userData.role as any,
        firstName: userData.name,
        lastName: userData.lastName,
        practitionerId: practitioner.id,
        isActive: true,
      },
    });
    
    console.log(`   ✓ User created: ${user.email} with role ${user.role}`);
    
    // Agregar al array de practitioners
    practitioners.push(practitioner);
  }
  console.log(` ✓ Created/Updated ${usersData.length} users with specific roles and licenses\n`);

  // 3.2. Create additional random practitioners
  console.log(' Creating additional practitioners...');
  for (let i = 0; i < 7; i++) {
    const practitioner = await prisma.practitioner.create({
      data: {
        license: `MP-${faker.string.numeric(8)}`,
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        specialty: specialties[i % specialties.length],
      },
    });
    practitioners.push(practitioner);
  }
  console.log(` Created ${practitioners.length} total practitioners\n`);

  // 4. Create Patients
  console.log(' Creating patients...');
  const patients = [];
  const docTypes = [DocumentType.CC, DocumentType.CE, DocumentType.TI, DocumentType.PA];
  const colombianNames = [
    'María', 'Juan', 'Ana', 'Carlos', 'Laura', 'Pedro', 'Sofía', 'Diego',
    'Valentina', 'Andrés', 'Camila', 'Santiago', 'Isabella', 'Sebastián'
  ];
  
  for (let i = 0; i < 20; i++) {
    const patient = await prisma.patient.create({
      data: {
        docType: docTypes[i % docTypes.length],
        docNumber: faker.string.numeric(10),
        firstName: colombianNames[i % colombianNames.length],
        lastName: `${faker.person.lastName()} ${faker.person.lastName()}`,
        birthDate: faker.date.birthdate({ min: 18, max: 80, mode: 'age' }),
        email: faker.internet.email().toLowerCase(),
        phone: `+57 ${faker.string.numeric(10)}`,
      },
    });
    patients.push(patient);
  }
  console.log(` Created ${patients.length} patients\n`);
  
  // 5. Create Appointments
  console.log(' Creating appointments...');
  const appointments = [];
  const appointmentStatuses: AppointmentStatus[] = ['booked', 'arrived', 'fulfilled', 'cancelled'];
  
  for (let i = 0; i < 30; i++) {
    const startDate = i < 10 
      ? faker.date.past({ years: 0.1 }) // Past appointments
      : faker.date.future({ years: 0.2 }); // Future appointments
    
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + 30);
    
    const appointment = await prisma.appointment.create({
      data: {
        patientId: patients[i % patients.length].id,
        practitionerId: practitioners[i % practitioners.length].id,
        organizationId: i % 2 === 0 ? org1.id : org2.id,
        start: startDate,
        end: endDate,
        modality: i % 3 === 0 ? 'especialista' : 'consulta externa',
        status: i < 10 ? 'fulfilled' : appointmentStatuses[i % appointmentStatuses.length],
      },
    });
    appointments.push(appointment);
  }
  console.log(` Created ${appointments.length} appointments\n`);

  // 6. Create Encounters (for past appointments)
  console.log(' Creating encounters...');
  const encounters = [];
  for (let i = 0; i < 10; i++) {
    const encounter = await prisma.encounter.create({
      data: {
        patientId: patients[i % patients.length].id,
        practitionerId: practitioners[i % practitioners.length].id,
        appointmentId: appointments[i].id,
        status: 'finished',
        reason: 'Control médico general',
        start: appointments[i].start,
        end: appointments[i].end,
      },
    });
    encounters.push(encounter);
  }
  console.log(` Created ${encounters.length} encounters\n`);

  // 7. Create Observations
  console.log(' Creating observations...');
  const observationCodes = [
    { code: '8480-6', name: 'Presión Sistólica', unit: 'mmHg', min: 90, max: 140 },
    { code: '8462-4', name: 'Presión Diastólica', unit: 'mmHg', min: 60, max: 90 },
    { code: '8310-5', name: 'Temperatura', unit: '°C', min: 36, max: 38 },
    { code: '8867-4', name: 'Frecuencia Cardíaca', unit: 'lpm', min: 60, max: 100 },
  ];

  for (const encounter of encounters) {
    for (const obs of observationCodes) {
      await prisma.observation.create({
        data: {
          encounterId: encounter.id,
          patientId: encounter.patientId,
          performerId: encounter.practitionerId,
          status: 'final',
          category: 'vital-signs',
          code: obs.code,
          valueQuantity: parseFloat(faker.number.float({ min: obs.min, max: obs.max }).toFixed(1)),
          valueUnit: obs.unit,
          effectiveDateTime: encounter.start || new Date(),
        },
      });
    }
  }
  console.log(` Created observations for ${encounters.length} encounters\n`);

  // 8. Create Prescriptions
  console.log(' Creating prescriptions...');
  const medications = [
    { code: 'ACE001', name: 'Acetaminofén 500mg', dosage: '500mg', frequency: 'cada 8 horas' },
    { code: 'IBU001', name: 'Ibuprofeno 400mg', dosage: '400mg', frequency: 'cada 12 horas' },
    { code: 'AMO001', name: 'Amoxicilina 500mg', dosage: '500mg', frequency: 'cada 8 horas' },
    { code: 'LOS001', name: 'Losartán 50mg', dosage: '50mg', frequency: 'cada 24 horas' },
    { code: 'MET001', name: 'Metformina 850mg', dosage: '850mg', frequency: 'cada 12 horas' },
  ];

  const prescriptions = [];
  for (let i = 0; i < 15; i++) {
    const med = medications[i % medications.length];
    const prescription = await prisma.prescription.create({
      data: {
        encounterId: encounters[i % encounters.length].id,
        patientId: patients[i % patients.length].id,
        practitionerId: practitioners[i % practitioners.length].id,
        medicationCode: med.code,
        medicationName: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        duration: faker.number.int({ min: 7, max: 30 }),
        instructions: 'Tomar con alimentos',
        status: i < 10 ? 'active' : 'completed',
        validityPeriodStart: faker.date.recent({ days: 30 }),
        validityPeriodEnd: faker.date.future({ years: 0.1 }),
      },
    });
    prescriptions.push(prescription);
  }
  console.log(` Created ${prescriptions.length} prescriptions\n`);

  // 9. Create Inventory
  console.log(' Creating inventory...');
  for (const med of medications) {
    await prisma.inventory.create({
      data: {
        medicationCode: med.code,
        medicationName: med.name,
        presentation: `Tabletas ${med.dosage}`,
        quantity: faker.number.int({ min: 50, max: 500 }),
        quantityUnit: 'tabletas',
        minQuantity: 50,
        batchNumber: `LOTE-${faker.string.numeric(6)}`,
        expiryDate: faker.date.future({ years: 2 }),
        location: `Estante ${faker.string.alpha(1).toUpperCase()}-${faker.number.int({ min: 1, max: 10 })}`,
        supplier: 'Laboratorios Farmacéuticos S.A.',
        unitPrice: parseFloat(faker.number.float({ min: 500, max: 5000 }).toFixed(0)),
        status: 'available',
        organizationId: org1.id,
      },
    });
  }
  console.log(` Created ${medications.length} inventory items\n`);

  // 10. Create Laboratory Orders
  console.log(' Creating laboratory orders...');
  const labTests = ['CBC', 'GLU', 'HbA1c', 'CREA', 'BUN', 'ALT', 'AST', 'CHOL', 'HDL', 'LDL'];
  
  for (let i = 0; i < 8; i++) {
    const numTests = faker.number.int({ min: 2, max: 5 });
    const selectedTests = faker.helpers.arrayElements(labTests, numTests);
    
    const labOrder = await prisma.laboratoryOrder.create({
      data: {
        patientId: patients[i % patients.length].id,
        encounterId: encounters[i % encounters.length].id,
        practitionerId: practitioners[i % practitioners.length].id,
        testCodes: selectedTests,
        priority: i < 2 ? 'urgent' : 'routine',
        status: i < 5 ? 'completed' : 'pending',
        notes: 'Control de rutina',
      },
    });

    // Add results for completed orders
    if (i < 5) {
      for (const testCode of selectedTests) {
        await prisma.laboratoryResult.create({
          data: {
            orderId: labOrder.id,
            testCode: testCode,
            testName: `Examen ${testCode}`,
            result: faker.number.float({ min: 50, max: 150 }).toFixed(1),
            unit: 'mg/dL',
            referenceRange: '70-100 mg/dL',
            status: 'final',
            interpretation: faker.helpers.arrayElement(['normal', 'abnormal', 'critical']),
            resultDate: faker.date.recent({ days: 2 }),
            reportedBy: 'Lab Technician',
          },
        });
      }
    }
  }
  console.log(` Created 8 laboratory orders with results\n`);

  // 11. Create Imaging Orders
  console.log(' Creating imaging orders...');
  const studyTypes = [
    { type: 'Rayos X', region: 'Tórax' },
    { type: 'Tomografía (TAC)', region: 'Abdomen' },
    { type: 'Resonancia Magnética', region: 'Rodilla' },
    { type: 'Ecografía', region: 'Abdomen' },
    { type: 'Mamografía', region: 'Bilateral' },
  ];

  for (let i = 0; i < 6; i++) {
    const study = studyTypes[i % studyTypes.length];
    const imagingOrder = await prisma.imagingOrder.create({
      data: {
        patientId: patients[i % patients.length].id,
        encounterId: encounters[i % encounters.length].id,
        practitionerId: practitioners[i % practitioners.length].id,
        studyType: study.type,
        bodyRegion: study.region,
        clinicalInfo: 'Dolor persistente, evaluación diagnóstica',
        priority: i < 1 ? 'stat' : i < 3 ? 'urgent' : 'routine',
        status: i < 4 ? 'completed' : 'pending',
        notes: 'Paciente en ayunas',
      },
    });

    // Add results for completed orders
    if (i < 4) {
      await prisma.imagingResult.create({
        data: {
          orderId: imagingOrder.id,
          studyDate: faker.date.recent({ days: 3 }),
          findings: `Estudio de ${study.type} de ${study.region}. Se observan estructuras anatómicas normales. No se identifican lesiones focales ni alteraciones significativas.`,
          impression: 'Estudio dentro de límites normales. No hallazgos patológicos significativos.',
          recommendation: 'Control clínico según evolución',
          status: 'final',
          imageUrls: [
            `https://pacs.hospital.com/study/${faker.string.alphanumeric(10)}`,
            `https://pacs.hospital.com/study/${faker.string.alphanumeric(10)}`
          ],
          reportedBy: `Dr. ${faker.person.firstName()} ${faker.person.lastName()}`,
        },
      });
    }
  }
  console.log(` Created 6 imaging orders with reports\n`);

  // 12. Create Authorizations
  console.log(' Creating authorizations...');
  for (let i = 0; i < 10; i++) {
    await prisma.authorization.create({
      data: {
        prescriptionId: prescriptions[i % prescriptions.length].id,
        patientId: patients[i % patients.length].id,
        requesterId: practitioners[i % practitioners.length].id,
        reviewerId: i < 7 ? practitioners[(i + 1) % practitioners.length].id : null,
        authorizationNumber: i < 7 ? `AUTH-${faker.string.numeric(8)}` : null,
        status: i < 5 ? 'approved' : i < 7 ? 'denied' : 'pending',
        priority: i < 3 ? 'urgent' : 'routine',
        justification: 'Medicamento de alto costo requerido para tratamiento',
        diagnosis: 'Hipertensión arterial esencial',
        treatmentPlan: 'Control de presión arterial con medicamento antihipertensivo',
        estimatedCost: parseFloat(faker.number.float({ min: 100000, max: 500000 }).toFixed(0)),
        approvedQuantity: i < 5 ? faker.number.int({ min: 30, max: 90 }) : null,
        denialReason: i >= 5 && i < 7 ? 'Requiere documentación adicional' : null,
        validUntil: i < 5 ? faker.date.future({ years: 0.2 }) : null,
        responseDate: i < 7 ? faker.date.recent({ days: 5 }) : null,
        insuranceEntity: 'EPS Sura',
      },
    });
  }
  console.log(` Created 10 authorizations\n`);

  console.log(' Seeding completed successfully!\n');
  console.log(' Summary:');
  console.log(`   - 2 Organizations`);
  console.log(`   - ${practitioners.length} Practitioners`);
  console.log(`   - 5 Users with Roles (ADMIN, DOCTOR, NURSE, PHARMACIST, RADIOLOGIST)`);
  console.log(`   - ${patients.length} Patients`);
  console.log(`   - ${appointments.length} Appointments`);
  console.log(`   - ${encounters.length} Encounters`);
  console.log(`   - ${prescriptions.length} Prescriptions`);
  console.log(`   - ${medications.length} Inventory Items`);
  console.log(`   - 8 Laboratory Orders`);
  console.log(`   - 6 Imaging Orders`);
  console.log(`   - 10 Authorizations`);
  console.log('\n Database is ready for testing!\n');
  
  console.log('🔐 LOGIN CREDENTIALS WITH ROLES:');
  console.log('   Use these practitioner licenses to login:\n');
  
  const testUsers = [
    { license: 'MP-43423635', role: 'ADMIN', name: 'Admin User' },
    { license: 'MP-87654321', role: 'DOCTOR', name: 'Doctor User' },
    { license: 'MP-11223344', role: 'NURSE', name: 'Nurse User' },
    { license: 'MP-55667788', role: 'PHARMACIST', name: 'Pharmacist User' },
    { license: 'MP-99887766', role: 'RADIOLOGIST', name: 'Radiologist User' },
  ];
  
  testUsers.forEach((user, i) => {
    console.log(`   ${i + 1}. License: ${user.license}`);
    console.log(`      Name: ${user.name}`);
    console.log(`      Role: ${user.role}\n`);
  });
  console.log('   🎯 ADMIN user: MP-43423635');
  console.log('   📋 All users are available in the login screen!\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
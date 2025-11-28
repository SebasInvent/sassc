const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding ...');

  // 1. Limpiar datos existentes (orden correcto por foreign keys)
  // Resultados primero
  await prisma.imagingResult.deleteMany();
  await prisma.laboratoryResult.deleteMany();
  // Luego órdenes y dispensaciones
  await prisma.dispensation.deleteMany();
  await prisma.authorization.deleteMany();
  await prisma.imagingOrder.deleteMany();
  await prisma.laboratoryOrder.deleteMany();
  // Datos clínicos
  await prisma.observation.deleteMany();
  await prisma.condition.deleteMany();
  await prisma.prescription.deleteMany();
  // Encuentros y citas
  await prisma.encounter.deleteMany();
  await prisma.appointment.deleteMany();
  // Tablas principales
  await prisma.patient.deleteMany();
  await prisma.practitioner.deleteMany();
  await prisma.organization.deleteMany();
  console.log('✅ Cleaned existing data');

  // 2. Crear Organizaciones
  const org1 = await prisma.organization.create({
    data: {
      name: 'Hospital Central',
      type: 'hospital',
      city: 'Bogotá',
      state: 'Cundinamarca',
    },
  });

  const org2 = await prisma.organization.create({
    data: {
      name: 'Clínica del Norte',
      type: 'clinic',
      city: 'Medellín',
      state: 'Antioquia',
    },
  });
  console.log('✅ Created 2 organizations');

  // 3. Crear Médico para login (Licencia: L12345)
  const drSofiaVergara = await prisma.practitioner.create({
    data: {
      license: 'L12345',
      firstName: 'Sofia',
      lastName: 'Vergara',
      specialty: 'Medicina General',
    },
  });

  const drSattler = await prisma.practitioner.create({
    data: {
      license: 'L67890',
      firstName: 'Ellie',
      lastName: 'Sattler',
      specialty: 'Pediatría',
    },
  });

  const drMalcolm = await prisma.practitioner.create({
    data: {
      license: 'L11223',
      firstName: 'Ian',
      lastName: 'Malcolm',
      specialty: 'Cardiología',
    },
  });
  console.log('✅ Created 3 practitioners');

  // 4. Crear Paciente para login (CC: 1001234567)
  const patient1 = await prisma.patient.create({
    data: {
      docType: 'CC',
      docNumber: '1001234567',
      firstName: 'Isabella',
      lastName: 'Rossi',
      birthDate: new Date('1990-05-15'),
      email: 'isabella.rossi@example.com',
      phone: '3001234567',
    },
  });

  const patient2 = await prisma.patient.create({
    data: {
      docType: 'CC',
      docNumber: '1007654321',
      firstName: 'Carlos',
      lastName: 'Mendoza',
      birthDate: new Date('1985-08-22'),
      email: 'carlos.mendoza@example.com',
      phone: '3109876543',
    },
  });

  const patient3 = await prisma.patient.create({
    data: {
      docType: 'TI',
      docNumber: '1234567890',
      firstName: 'Sofia',
      lastName: 'Torres',
      birthDate: new Date('2010-03-10'),
      email: 'sofia.torres@example.com',
      phone: '3201122334',
    },
  });
  console.log('✅ Created 3 patients');

  // 5. Crear Citas
  const now = new Date();
  
  // Citas para Isabella Rossi
  await prisma.appointment.create({
    data: {
      patientId: patient1.id,
      practitionerId: drSofiaVergara.id,
      organizationId: org1.id,
      start: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000), // Mañana
      end: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000), // +30 min
      modality: 'consulta externa',
      status: 'booked',
    },
  });

  await prisma.appointment.create({
    data: {
      patientId: patient1.id,
      practitionerId: drMalcolm.id,
      organizationId: org2.id,
      start: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // En 3 días
      end: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000), // +45 min
      modality: 'telemedicina',
      status: 'booked',
    },
  });

  // Citas para Carlos Mendoza
  await prisma.appointment.create({
    data: {
      patientId: patient2.id,
      practitionerId: drSattler.id,
      organizationId: org1.id,
      start: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // En 2 días
      end: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
      modality: 'consulta externa',
      status: 'booked',
    },
  });

  // Citas para Sofia Torres
  await prisma.appointment.create({
    data: {
      patientId: patient3.id,
      practitionerId: drSattler.id,
      organizationId: org2.id,
      start: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // En 5 días
      end: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
      modality: 'consulta externa',
      status: 'booked',
    },
  });

  // Cita para hoy
  await prisma.appointment.create({
    data: {
      patientId: patient1.id,
      practitionerId: drSofiaVergara.id,
      organizationId: org1.id,
      start: new Date(now.getTime() + 2 * 60 * 60 * 1000), // En 2 horas
      end: new Date(now.getTime() + 2 * 60 * 60 * 1000 + 30 * 60 * 1000),
      modality: 'consulta externa',
      status: 'booked',
    },
  });

  console.log('✅ Created 5 appointments');

  console.log('\n🎉 Seeding finished successfully!');
  console.log('\n📋 Login credentials:');
  console.log('   👨‍⚕️  Doctor: L12345 (Dr. Sofia Vergara)');
  console.log('   🧑  Patient: CC 1001234567 (Isabella Rossi)');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
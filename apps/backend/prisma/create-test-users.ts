import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Creating test users with specific licenses...\n');

  const usersData = [
    { license: 'MP-43423635', role: 'ADMIN', name: 'Admin', lastName: 'User', specialty: 'Administración' },
    { license: 'MP-87654321', role: 'DOCTOR', name: 'Doctor', lastName: 'User', specialty: 'Medicina General' },
    { license: 'MP-11223344', role: 'NURSE', name: 'Nurse', lastName: 'User', specialty: 'Enfermería' },
    { license: 'MP-55667788', role: 'PHARMACIST', name: 'Pharmacist', lastName: 'User', specialty: 'Farmacia' },
    { license: 'MP-99887766', role: 'RADIOLOGIST', name: 'Radiologist', lastName: 'User', specialty: 'Radiología' },
  ];

  for (const userData of usersData) {
    console.log(`Creating: ${userData.name} ${userData.lastName} (${userData.license})`);
    
    // Crear o actualizar practitioner
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

    console.log(`  ✓ Practitioner: ${practitioner.id}`);

    // Crear o actualizar usuario
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

    console.log(`  ✓ User: ${user.email} with role ${user.role}\n`);
  }

  console.log('✅ All test users created successfully!\n');
  console.log('📋 You can now login with these licenses:');
  usersData.forEach((u, i) => {
    console.log(`   ${i + 1}. ${u.license} - ${u.role} (${u.name} ${u.lastName})`);
  });
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

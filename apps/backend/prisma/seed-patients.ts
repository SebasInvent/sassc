import { PrismaClient, DocumentType } from '@prisma/client';

const prisma = new PrismaClient();

// Datos realistas colombianos
const nombresHombre = ['Juan', 'Carlos', 'Andrés', 'Miguel', 'José', 'Luis', 'David', 'Santiago', 'Daniel', 'Sebastián', 'Alejandro', 'Felipe', 'Camilo', 'Nicolás', 'Diego'];
const nombresMujer = ['María', 'Ana', 'Laura', 'Carolina', 'Valentina', 'Daniela', 'Sofía', 'Isabella', 'Mariana', 'Gabriela', 'Paula', 'Andrea', 'Natalia', 'Juliana', 'Catalina'];
const apellidos = ['García', 'Rodríguez', 'Martínez', 'López', 'González', 'Hernández', 'Pérez', 'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Rivera', 'Gómez', 'Díaz', 'Reyes', 'Morales', 'Jiménez', 'Ruiz', 'Álvarez', 'Romero', 'Vargas', 'Castro', 'Ortiz', 'Mendoza', 'Guerrero'];

const ciudades = [
  { ciudad: 'Bogotá', departamento: 'Cundinamarca' },
  { ciudad: 'Medellín', departamento: 'Antioquia' },
  { ciudad: 'Cali', departamento: 'Valle del Cauca' },
  { ciudad: 'Barranquilla', departamento: 'Atlántico' },
  { ciudad: 'Cartagena', departamento: 'Bolívar' },
  { ciudad: 'Bucaramanga', departamento: 'Santander' },
  { ciudad: 'Pereira', departamento: 'Risaralda' },
  { ciudad: 'Manizales', departamento: 'Caldas' },
];

const eps = ['Sura EPS', 'Nueva EPS', 'Sanitas', 'Compensar', 'Famisanar', 'Salud Total', 'Coomeva', 'Mutual Ser'];
const regimenes = ['contributivo', 'subsidiado'];
const gruposSanguineos = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateCC(): string {
  // Cédulas colombianas: 8-10 dígitos
  const length = Math.random() > 0.5 ? 10 : 8;
  let cc = '';
  for (let i = 0; i < length; i++) {
    cc += Math.floor(Math.random() * 10).toString();
  }
  return cc;
}

function generatePhone(): string {
  const prefixes = ['300', '301', '302', '310', '311', '312', '313', '314', '315', '316', '317', '318', '319', '320', '321', '322', '323'];
  return prefixes[Math.floor(Math.random() * prefixes.length)] + Math.floor(Math.random() * 10000000).toString().padStart(7, '0');
}

function generateBirthDate(): Date {
  // Edades entre 1 y 90 años
  const age = Math.floor(Math.random() * 89) + 1;
  const date = new Date();
  date.setFullYear(date.getFullYear() - age);
  date.setMonth(Math.floor(Math.random() * 12));
  date.setDate(Math.floor(Math.random() * 28) + 1);
  return date;
}

async function main() {
  console.log('👥 Creando pacientes de prueba...\n');

  // Obtener CAPs para asignar pacientes
  const caps = await prisma.cAP.findMany();
  
  if (caps.length === 0) {
    console.log('❌ No hay CAPs. Ejecuta primero: npx ts-node prisma/seed-caps-ips.ts');
    return;
  }

  console.log(`📊 Encontrados ${caps.length} CAPs para asignar pacientes\n`);

  // No borrar pacientes existentes para mantener las remisiones
  const existingCount = await prisma.patient.count();
  console.log(`📋 Pacientes existentes: ${existingCount}\n`);

  const patientsToCreate = 50;
  const patients = [];

  for (let i = 0; i < patientsToCreate; i++) {
    const isFemale = Math.random() > 0.5;
    const firstName = isFemale ? randomElement(nombresMujer) : randomElement(nombresHombre);
    const lastName = `${randomElement(apellidos)} ${randomElement(apellidos)}`;
    const location = randomElement(ciudades);
    const birthDate = generateBirthDate();
    const age = new Date().getFullYear() - birthDate.getFullYear();

    // Asignar CAP según ciudad (territorialización)
    let capAsignado = caps.find(c => c.ciudad === location.ciudad);
    if (!capAsignado) {
      capAsignado = randomElement(caps);
    }

    const patient = {
      docType: DocumentType.CC,
      docNumber: generateCC(),
      firstName,
      lastName,
      birthDate,
      gender: isFemale ? 'female' : 'male',
      phone: generatePhone(),
      email: `${firstName.toLowerCase()}.${lastName.split(' ')[0].toLowerCase()}${Math.floor(Math.random() * 100)}@email.com`,
      address: `Calle ${Math.floor(Math.random() * 150) + 1} #${Math.floor(Math.random() * 100)}-${Math.floor(Math.random() * 100)}`,
      city: location.ciudad,
      department: location.departamento,
      bloodType: randomElement(gruposSanguineos),
      // Campos adicionales del sistema de salud colombiano
      capAsignadoId: capAsignado.id,
    };

    patients.push(patient);
  }

  // Crear pacientes en lotes
  let created = 0;
  for (const patient of patients) {
    try {
      await prisma.patient.create({ data: patient });
      created++;
    } catch (error: any) {
      // Ignorar duplicados de documento
      if (!error.message?.includes('Unique constraint')) {
        console.error(`Error creando paciente:`, error.message);
      }
    }
  }

  console.log(`✅ ${created} pacientes nuevos creados\n`);

  // Actualizar población actual de CAPs
  console.log('📊 Actualizando población de CAPs...');
  for (const cap of caps) {
    const count = await prisma.patient.count({
      where: { capAsignadoId: cap.id },
    });
    await prisma.cAP.update({
      where: { id: cap.id },
      data: { poblacionActual: count },
    });
  }

  // Estadísticas finales
  const totalPatients = await prisma.patient.count();
  const byCity = await prisma.patient.groupBy({
    by: ['city'],
    _count: true,
    orderBy: { _count: { city: 'desc' } },
  });

  const byGender = await prisma.patient.groupBy({
    by: ['gender'],
    _count: true,
  });

  console.log('\n═══════════════════════════════════════════');
  console.log('📊 RESUMEN DE PACIENTES');
  console.log('═══════════════════════════════════════════');
  console.log(`👥 Total pacientes: ${totalPatients}`);
  console.log('\n📍 Por ciudad:');
  byCity.forEach(c => {
    console.log(`   ${c.city || 'Sin ciudad'}: ${c._count}`);
  });
  console.log('\n👤 Por género:');
  byGender.forEach(g => {
    console.log(`   ${g.gender === 'female' ? 'Mujeres' : 'Hombres'}: ${g._count}`);
  });
  console.log('═══════════════════════════════════════════\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

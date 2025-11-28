import { PrismaClient, EstadoRemision } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📋 Creando remisiones de prueba...\n');

  // Obtener CAPs e IPS existentes
  const caps = await prisma.cAP.findMany();
  const ipsList = await prisma.iPS.findMany();
  const patients = await prisma.patient.findMany({ take: 10 });

  if (caps.length === 0 || ipsList.length === 0) {
    console.log('❌ No hay CAPs o IPS. Ejecuta primero: npx ts-node prisma/seed-caps-ips.ts');
    return;
  }

  if (patients.length === 0) {
    console.log('❌ No hay pacientes. Ejecuta primero: npx prisma db seed');
    return;
  }

  console.log(`📊 Encontrados: ${caps.length} CAPs, ${ipsList.length} IPS, ${patients.length} pacientes\n`);

  // Limpiar remisiones existentes
  await prisma.remision.deleteMany();
  console.log('🧹 Remisiones anteriores eliminadas\n');

  // Usar módulo para evitar índices fuera de rango
  const getPatient = (i: number) => patients[i % patients.length];
  const getCap = (i: number) => caps[i % caps.length];
  const getIps = (i: number) => ipsList[i % ipsList.length];

  const remisionesData = [
    // Remisiones urgentes
    {
      codigo: 'REM-2024-001',
      patientId: getPatient(0).id,
      capOrigenId: caps[0].id, // CAP Kennedy
      ipsDestinoId: ipsList[0].id, // Hospital San Ignacio
      diagnostico: 'Infarto agudo de miocardio',
      motivoRemision: 'Requiere cateterismo cardíaco de urgencia',
      especialidadRequerida: 'Cardiología',
      prioridad: 'urgente',
      estado: EstadoRemision.EN_PROCESO,
      fechaSolicitud: new Date(Date.now() - 2 * 60 * 60 * 1000), // Hace 2 horas
    },
    {
      codigo: 'REM-2024-002',
      patientId: getPatient(1).id,
      capOrigenId: caps[1].id, // CAP Suba
      ipsDestinoId: ipsList[2].id, // Hospital Simón Bolívar
      diagnostico: 'Quemaduras de segundo grado en 30% del cuerpo',
      motivoRemision: 'Unidad de quemados especializada',
      especialidadRequerida: 'Cirugía Plástica',
      prioridad: 'urgente',
      estado: EstadoRemision.APROBADA,
      fechaSolicitud: new Date(Date.now() - 4 * 60 * 60 * 1000),
      fechaAprobacion: new Date(Date.now() - 3 * 60 * 60 * 1000),
    },
    // Remisiones prioritarias
    {
      codigo: 'REM-2024-003',
      patientId: getPatient(2).id,
      capOrigenId: caps[0].id,
      ipsDestinoId: ipsList[1].id, // Fundación Santa Fe
      diagnostico: 'Masa pulmonar sospechosa de malignidad',
      motivoRemision: 'Biopsia y estudio oncológico',
      especialidadRequerida: 'Oncología',
      prioridad: 'prioritario',
      estado: EstadoRemision.SOLICITADA,
      fechaSolicitud: new Date(Date.now() - 24 * 60 * 60 * 1000), // Hace 1 día
    },
    {
      codigo: 'REM-2024-004',
      patientId: getPatient(3).id,
      capOrigenId: caps[2].id, // CAP Usaquén
      ipsDestinoId: ipsList[0].id,
      diagnostico: 'Arritmia cardíaca compleja',
      motivoRemision: 'Estudio electrofisiológico',
      especialidadRequerida: 'Cardiología',
      prioridad: 'prioritario',
      estado: EstadoRemision.APROBADA,
      fechaSolicitud: new Date(Date.now() - 48 * 60 * 60 * 1000),
      fechaAprobacion: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
    // Remisiones normales
    {
      codigo: 'REM-2024-005',
      patientId: getPatient(4).id,
      capOrigenId: caps[3].id, // CAP Ciudad Bolívar
      ipsDestinoId: ipsList[3].id, // Clínica Kennedy
      diagnostico: 'Hernia inguinal bilateral',
      motivoRemision: 'Cirugía programada',
      especialidadRequerida: 'Cirugía General',
      prioridad: 'normal',
      estado: EstadoRemision.COMPLETADA,
      fechaSolicitud: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      fechaAprobacion: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      fechaAtencion: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      resultadoAtencion: 'Cirugía exitosa. Alta médica.',
    },
    {
      codigo: 'REM-2024-006',
      patientId: getPatient(5).id,
      capOrigenId: getCap(4).id, // CAP Belén (Medellín)
      ipsDestinoId: getIps(4).id, // Hospital Pablo Tobón
      diagnostico: 'Leucemia linfoblástica aguda',
      motivoRemision: 'Inicio de quimioterapia',
      especialidadRequerida: 'Hematología',
      prioridad: 'urgente',
      estado: EstadoRemision.EN_PROCESO,
      fechaSolicitud: new Date(Date.now() - 12 * 60 * 60 * 1000),
    },
    {
      codigo: 'REM-2024-007',
      patientId: getPatient(6).id,
      capOrigenId: getCap(5).id,
      ipsDestinoId: getIps(5).id,
      diagnostico: 'Fractura de cadera',
      motivoRemision: 'Reemplazo total de cadera',
      especialidadRequerida: 'Ortopedia',
      prioridad: 'prioritario',
      estado: EstadoRemision.SOLICITADA,
      fechaSolicitud: new Date(Date.now() - 6 * 60 * 60 * 1000),
    },
    {
      codigo: 'REM-2024-008',
      patientId: getPatient(7).id,
      capOrigenId: getCap(6).id, // CAP Aguablanca (Cali)
      ipsDestinoId: getIps(6).id, // Valle del Lili
      diagnostico: 'Insuficiencia renal crónica terminal',
      motivoRemision: 'Evaluación para trasplante renal',
      especialidadRequerida: 'Nefrología',
      prioridad: 'prioritario',
      estado: EstadoRemision.APROBADA,
      fechaSolicitud: new Date(Date.now() - 72 * 60 * 60 * 1000),
      fechaAprobacion: new Date(Date.now() - 48 * 60 * 60 * 1000),
    },
    // Remisión rechazada (ejemplo)
    {
      codigo: 'REM-2024-009',
      patientId: getPatient(8).id,
      capOrigenId: caps[0].id,
      ipsDestinoId: getIps(8).id, // Laboratorio
      diagnostico: 'Dolor abdominal crónico',
      motivoRemision: 'Estudios de laboratorio especializados',
      especialidadRequerida: 'Gastroenterología',
      prioridad: 'normal',
      estado: EstadoRemision.RECHAZADA,
      fechaSolicitud: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      notas: 'Rechazada: Se puede manejar en CAP con exámenes básicos',
    },
    // Remisión cancelada
    {
      codigo: 'REM-2024-010',
      patientId: getPatient(9).id,
      capOrigenId: caps[1].id,
      ipsDestinoId: ipsList[1].id,
      diagnostico: 'Cefalea crónica',
      motivoRemision: 'Resonancia magnética cerebral',
      especialidadRequerida: 'Neurología',
      prioridad: 'normal',
      estado: EstadoRemision.CANCELADA,
      fechaSolicitud: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      notas: 'Cancelada por el paciente',
    },
  ];

  let created = 0;
  for (const data of remisionesData) {
    try {
      await prisma.remision.create({ data });
      created++;
    } catch (error) {
      console.error(`Error creando ${data.codigo}:`, error);
    }
  }

  console.log(`✅ ${created} remisiones creadas\n`);

  // Resumen
  const stats = await prisma.remision.groupBy({
    by: ['estado'],
    _count: true,
  });

  console.log('═══════════════════════════════════════════');
  console.log('📊 RESUMEN DE REMISIONES');
  console.log('═══════════════════════════════════════════');
  stats.forEach(s => {
    console.log(`   ${s.estado}: ${s._count}`);
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

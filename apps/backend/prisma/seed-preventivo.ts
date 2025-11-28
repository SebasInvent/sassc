import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🏥 Creando programas preventivos...\n');

  // Limpiar datos existentes
  await prisma.seguimientoPreventivo.deleteMany();
  await prisma.programaPreventivo.deleteMany();
  console.log('🧹 Datos anteriores eliminados\n');

  // Crear programas preventivos
  const programas = [
    // Vacunación
    {
      codigo: 'VAC-INF',
      nombre: 'Vacunación Infantil',
      descripcion: 'Esquema completo de vacunación para menores de 5 años',
      edadMinima: 0,
      edadMaxima: 5,
      genero: null,
      frecuenciaMeses: 2,
      tipo: 'vacunacion',
    },
    {
      codigo: 'VAC-FLU',
      nombre: 'Vacuna Influenza',
      descripcion: 'Vacunación anual contra la influenza',
      edadMinima: 60,
      edadMaxima: null,
      genero: null,
      frecuenciaMeses: 12,
      tipo: 'vacunacion',
    },
    // Control prenatal
    {
      codigo: 'PREN-CTL',
      nombre: 'Control Prenatal',
      descripcion: 'Seguimiento mensual durante el embarazo',
      edadMinima: 12,
      edadMaxima: 50,
      genero: 'F',
      frecuenciaMeses: 1,
      tipo: 'control_prenatal',
    },
    // Tamizaje cáncer
    {
      codigo: 'TAM-MAMA',
      nombre: 'Mamografía',
      descripcion: 'Tamizaje de cáncer de mama para mujeres mayores de 40',
      edadMinima: 40,
      edadMaxima: null,
      genero: 'F',
      frecuenciaMeses: 24,
      tipo: 'tamizaje_cancer',
    },
    {
      codigo: 'TAM-CERV',
      nombre: 'Citología Cervical',
      descripcion: 'Tamizaje de cáncer de cuello uterino',
      edadMinima: 25,
      edadMaxima: 65,
      genero: 'F',
      frecuenciaMeses: 36,
      tipo: 'tamizaje_cancer',
    },
    {
      codigo: 'TAM-PROST',
      nombre: 'Antígeno Prostático',
      descripcion: 'Tamizaje de cáncer de próstata para hombres mayores de 50',
      edadMinima: 50,
      edadMaxima: null,
      genero: 'M',
      frecuenciaMeses: 12,
      tipo: 'tamizaje_cancer',
    },
    // Control de crónicos
    {
      codigo: 'CRON-DM',
      nombre: 'Control Diabetes',
      descripcion: 'Control trimestral de pacientes diabéticos',
      edadMinima: null,
      edadMaxima: null,
      genero: null,
      frecuenciaMeses: 3,
      tipo: 'control_cronico',
    },
    {
      codigo: 'CRON-HTA',
      nombre: 'Control Hipertensión',
      descripcion: 'Control mensual de pacientes hipertensos',
      edadMinima: null,
      edadMaxima: null,
      genero: null,
      frecuenciaMeses: 1,
      tipo: 'control_cronico',
    },
    // Salud oral
    {
      codigo: 'ORAL-CTL',
      nombre: 'Control Odontológico',
      descripcion: 'Revisión odontológica semestral',
      edadMinima: null,
      edadMaxima: null,
      genero: null,
      frecuenciaMeses: 6,
      tipo: 'salud_oral',
    },
    // Crecimiento y desarrollo
    {
      codigo: 'CYD-INF',
      nombre: 'Crecimiento y Desarrollo',
      descripcion: 'Control de crecimiento para menores de 10 años',
      edadMinima: 0,
      edadMaxima: 10,
      genero: null,
      frecuenciaMeses: 3,
      tipo: 'crecimiento_desarrollo',
    },
  ];

  for (const programa of programas) {
    await prisma.programaPreventivo.create({ data: programa });
  }
  console.log(`✅ ${programas.length} programas preventivos creados\n`);

  // Obtener pacientes y programas
  const patients = await prisma.patient.findMany({ take: 30 });
  const programasCreados = await prisma.programaPreventivo.findMany();

  if (patients.length === 0) {
    console.log('⚠️ No hay pacientes. Ejecuta primero el seed de pacientes.');
    return;
  }

  console.log(`📊 Generando seguimientos para ${patients.length} pacientes...\n`);

  // Crear seguimientos de prueba
  const seguimientos = [];
  const hoy = new Date();

  for (const patient of patients) {
    const edad = patient.birthDate 
      ? Math.floor((Date.now() - patient.birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : 30;

    // Seleccionar 2-4 programas aleatorios aplicables
    const programasAplicables = programasCreados.filter(p => {
      const edadOk = (!p.edadMinima || edad >= p.edadMinima) && (!p.edadMaxima || edad <= p.edadMaxima);
      const generoOk = !p.genero || p.genero === (patient.gender === 'female' ? 'F' : 'M');
      return edadOk && generoOk;
    });

    const numSeguimientos = Math.min(programasAplicables.length, Math.floor(Math.random() * 3) + 2);
    const programasSeleccionados = programasAplicables
      .sort(() => Math.random() - 0.5)
      .slice(0, numSeguimientos);

    for (const programa of programasSeleccionados) {
      // Fecha aleatoria: entre 30 días atrás y 30 días adelante
      const diasOffset = Math.floor(Math.random() * 60) - 30;
      const fechaProgramada = new Date(hoy);
      fechaProgramada.setDate(fechaProgramada.getDate() + diasOffset);

      // Estado basado en la fecha
      let estado = 'pendiente';
      let fechaRealizada = null;

      if (diasOffset < -7) {
        // Más de 7 días pasados
        if (Math.random() > 0.3) {
          estado = 'completado';
          fechaRealizada = new Date(fechaProgramada);
          fechaRealizada.setDate(fechaRealizada.getDate() + Math.floor(Math.random() * 3));
        } else {
          estado = 'vencido';
        }
      } else if (diasOffset < 0) {
        // Últimos 7 días
        if (Math.random() > 0.5) {
          estado = 'completado';
          fechaRealizada = new Date();
        }
      }

      seguimientos.push({
        programaId: programa.id,
        patientId: patient.id,
        fechaProgramada,
        fechaRealizada,
        estado,
        notas: estado === 'completado' ? 'Control realizado sin novedad' : null,
        resultado: estado === 'completado' ? 'Normal' : null,
      });
    }
  }

  // Crear seguimientos en lotes
  let created = 0;
  for (const seg of seguimientos) {
    try {
      await prisma.seguimientoPreventivo.create({ data: seg });
      created++;
    } catch (error) {
      // Ignorar errores
    }
  }

  console.log(`✅ ${created} seguimientos creados\n`);

  // Estadísticas
  const stats = await prisma.seguimientoPreventivo.groupBy({
    by: ['estado'],
    _count: true,
  });

  console.log('═══════════════════════════════════════════');
  console.log('🏥 RESUMEN MODELO PREVENTIVO');
  console.log('═══════════════════════════════════════════');
  console.log(`📋 Programas: ${programas.length}`);
  console.log(`📊 Seguimientos: ${created}`);
  console.log('\n📈 Por estado:');
  stats.forEach(s => {
    const emoji = s.estado === 'completado' ? '✅' : s.estado === 'vencido' ? '⚠️' : '⏳';
    console.log(`   ${emoji} ${s.estado}: ${s._count}`);
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

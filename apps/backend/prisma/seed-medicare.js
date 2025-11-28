const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Medicare data...');

  // Crear ADRES Regionales
  const adresBogota = await prisma.aDRESRegional.upsert({
    where: { codigo: 'ADRES-BOG' },
    update: {},
    create: {
      codigo: 'ADRES-BOG',
      nombre: 'ADRES Regional Bogotá',
      departamento: 'Bogotá D.C.',
      presupuestoAnual: 500000000000,
      director: 'Dr. Carlos Mendoza',
      telefono: '601-3456789',
      email: 'bogota@adres.gov.co',
    },
  });

  const adresMedellin = await prisma.aDRESRegional.upsert({
    where: { codigo: 'ADRES-ANT' },
    update: {},
    create: {
      codigo: 'ADRES-ANT',
      nombre: 'ADRES Regional Antioquia',
      departamento: 'Antioquia',
      presupuestoAnual: 350000000000,
      director: 'Dra. María López',
      telefono: '604-2345678',
      email: 'antioquia@adres.gov.co',
    },
  });

  console.log('✅ ADRES Regionales creados');

  // Crear CAPs
  const caps = [
    {
      codigo: 'CAP-BOG-001',
      nombre: 'CAP Kennedy Central',
      direccion: 'Calle 38 Sur #78-50',
      ciudad: 'Bogotá',
      departamento: 'Bogotá D.C.',
      telefono: '601-4567890',
      email: 'kennedy@caps.gov.co',
      horarioApertura: '07:00',
      horarioCierre: '19:00',
      diasOperacion: 'Lunes a Sábado',
      poblacionAsignada: 25000,
      poblacionActual: 18500,
      tieneOdontologia: true,
      tieneVacunacion: true,
      tieneLaboratorio: true,
      tieneUrgencias: false,
      adresRegionalId: adresBogota.id,
    },
    {
      codigo: 'CAP-BOG-002',
      nombre: 'CAP Suba Norte',
      direccion: 'Carrera 92 #145-20',
      ciudad: 'Bogotá',
      departamento: 'Bogotá D.C.',
      telefono: '601-5678901',
      email: 'suba@caps.gov.co',
      horarioApertura: '06:00',
      horarioCierre: '20:00',
      diasOperacion: 'Lunes a Domingo',
      poblacionAsignada: 25000,
      poblacionActual: 22000,
      tieneOdontologia: true,
      tieneVacunacion: true,
      tieneLaboratorio: false,
      tieneUrgencias: true,
      adresRegionalId: adresBogota.id,
    },
    {
      codigo: 'CAP-BOG-003',
      nombre: 'CAP Usaquén',
      direccion: 'Calle 127 #15-30',
      ciudad: 'Bogotá',
      departamento: 'Bogotá D.C.',
      telefono: '601-6789012',
      email: 'usaquen@caps.gov.co',
      horarioApertura: '07:00',
      horarioCierre: '18:00',
      diasOperacion: 'Lunes a Viernes',
      poblacionAsignada: 25000,
      poblacionActual: 15000,
      tieneOdontologia: true,
      tieneVacunacion: true,
      tieneLaboratorio: true,
      tieneUrgencias: false,
      adresRegionalId: adresBogota.id,
    },
    {
      codigo: 'CAP-MED-001',
      nombre: 'CAP El Poblado',
      direccion: 'Carrera 43A #1-50',
      ciudad: 'Medellín',
      departamento: 'Antioquia',
      telefono: '604-3456789',
      email: 'poblado@caps.gov.co',
      horarioApertura: '07:00',
      horarioCierre: '19:00',
      diasOperacion: 'Lunes a Sábado',
      poblacionAsignada: 25000,
      poblacionActual: 20000,
      tieneOdontologia: true,
      tieneVacunacion: true,
      tieneLaboratorio: true,
      tieneUrgencias: false,
      adresRegionalId: adresMedellin.id,
    },
    {
      codigo: 'CAP-MED-002',
      nombre: 'CAP Belén',
      direccion: 'Calle 30 #76-20',
      ciudad: 'Medellín',
      departamento: 'Antioquia',
      telefono: '604-4567890',
      email: 'belen@caps.gov.co',
      horarioApertura: '06:00',
      horarioCierre: '20:00',
      diasOperacion: 'Lunes a Domingo',
      poblacionAsignada: 25000,
      poblacionActual: 23500,
      tieneOdontologia: true,
      tieneVacunacion: true,
      tieneLaboratorio: false,
      tieneUrgencias: true,
      adresRegionalId: adresMedellin.id,
    },
  ];

  for (const cap of caps) {
    await prisma.cAP.upsert({
      where: { codigo: cap.codigo },
      update: cap,
      create: cap,
    });
  }

  console.log('✅ CAPs creados');

  // Crear IPS
  const ipsList = [
    {
      codigo: 'IPS-BOG-001',
      nombre: 'Hospital Universitario San Ignacio',
      tipo: 'hospital',
      nivelComplejidad: 'NIVEL_4',
      direccion: 'Carrera 7 #40-62',
      ciudad: 'Bogotá',
      departamento: 'Bogotá D.C.',
      telefono: '601-5946161',
      email: 'info@husi.org.co',
      numeroCamas: 350,
      numeroQuirofanos: 12,
      numeroUCI: 45,
      servicios: ['cardiologia', 'neurologia', 'oncologia', 'cirugia_general', 'pediatria', 'ginecologia', 'traumatologia'],
      adresRegionalId: adresBogota.id,
    },
    {
      codigo: 'IPS-BOG-002',
      nombre: 'Clínica del Country',
      tipo: 'clinica',
      nivelComplejidad: 'NIVEL_3',
      direccion: 'Carrera 16 #82-57',
      ciudad: 'Bogotá',
      departamento: 'Bogotá D.C.',
      telefono: '601-5300470',
      email: 'info@clinicadelcountry.com',
      numeroCamas: 200,
      numeroQuirofanos: 8,
      numeroUCI: 25,
      servicios: ['cardiologia', 'cirugia_plastica', 'ortopedia', 'ginecologia', 'urologia'],
      adresRegionalId: adresBogota.id,
    },
    {
      codigo: 'IPS-BOG-003',
      nombre: 'Hospital Simón Bolívar',
      tipo: 'hospital',
      nivelComplejidad: 'NIVEL_3',
      direccion: 'Carrera 7 #165-00',
      ciudad: 'Bogotá',
      departamento: 'Bogotá D.C.',
      telefono: '601-6764466',
      email: 'info@hospitalsimonbolivar.gov.co',
      numeroCamas: 280,
      numeroQuirofanos: 10,
      numeroUCI: 35,
      servicios: ['quemados', 'cirugia_general', 'medicina_interna', 'pediatria', 'urgencias'],
      adresRegionalId: adresBogota.id,
    },
    {
      codigo: 'IPS-BOG-004',
      nombre: 'Laboratorio Clínico Colsanitas',
      tipo: 'laboratorio',
      nivelComplejidad: 'NIVEL_2',
      direccion: 'Calle 100 #19-54',
      ciudad: 'Bogotá',
      departamento: 'Bogotá D.C.',
      telefono: '601-4895050',
      email: 'laboratorio@colsanitas.com',
      servicios: ['hematologia', 'quimica_sanguinea', 'microbiologia', 'inmunologia'],
      adresRegionalId: adresBogota.id,
    },
    {
      codigo: 'IPS-MED-001',
      nombre: 'Hospital Pablo Tobón Uribe',
      tipo: 'hospital',
      nivelComplejidad: 'NIVEL_4',
      direccion: 'Calle 78B #69-240',
      ciudad: 'Medellín',
      departamento: 'Antioquia',
      telefono: '604-4459000',
      email: 'info@hptu.org.co',
      numeroCamas: 400,
      numeroQuirofanos: 15,
      numeroUCI: 50,
      servicios: ['trasplantes', 'oncologia', 'cardiologia', 'neurocirugia', 'pediatria', 'neonatologia'],
      adresRegionalId: adresMedellin.id,
    },
    {
      codigo: 'IPS-MED-002',
      nombre: 'Clínica Las Américas',
      tipo: 'clinica',
      nivelComplejidad: 'NIVEL_3',
      direccion: 'Diagonal 75B #2A-80',
      ciudad: 'Medellín',
      departamento: 'Antioquia',
      telefono: '604-3421010',
      email: 'info@lasamericas.com.co',
      numeroCamas: 250,
      numeroQuirofanos: 10,
      numeroUCI: 30,
      servicios: ['cardiologia', 'ortopedia', 'cirugia_bariatrica', 'ginecologia', 'urologia'],
      adresRegionalId: adresMedellin.id,
    },
    {
      codigo: 'IPS-MED-003',
      nombre: 'Centro de Imágenes Diagnósticas',
      tipo: 'centro_imagenes',
      nivelComplejidad: 'NIVEL_2',
      direccion: 'Carrera 48 #10-45',
      ciudad: 'Medellín',
      departamento: 'Antioquia',
      telefono: '604-2661234',
      email: 'imagenes@diagnostico.com.co',
      servicios: ['radiologia', 'tomografia', 'resonancia_magnetica', 'ecografia', 'mamografia'],
      adresRegionalId: adresMedellin.id,
    },
  ];

  for (const ips of ipsList) {
    await prisma.iPS.upsert({
      where: { codigo: ips.codigo },
      update: ips,
      create: ips,
    });
  }

  console.log('✅ IPS creadas');

  // Crear Programas Preventivos
  const programas = [
    {
      codigo: 'PREV-001',
      nombre: 'Control Prenatal',
      descripcion: 'Seguimiento mensual durante el embarazo',
      edadMinima: 12,
      edadMaxima: 50,
      genero: 'F',
      frecuenciaMeses: 1,
      tipo: 'control_prenatal',
    },
    {
      codigo: 'PREV-002',
      nombre: 'Vacunación Infantil',
      descripcion: 'Esquema de vacunación para niños de 0 a 5 años',
      edadMinima: 0,
      edadMaxima: 5,
      frecuenciaMeses: 2,
      tipo: 'vacunacion',
    },
    {
      codigo: 'PREV-003',
      nombre: 'Tamizaje Cáncer de Mama',
      descripcion: 'Mamografía anual para mujeres mayores de 40 años',
      edadMinima: 40,
      edadMaxima: 70,
      genero: 'F',
      frecuenciaMeses: 12,
      tipo: 'tamizaje_cancer',
    },
    {
      codigo: 'PREV-004',
      nombre: 'Control Hipertensión',
      descripcion: 'Seguimiento mensual para pacientes hipertensos',
      edadMinima: 18,
      frecuenciaMeses: 1,
      tipo: 'control_cronico',
    },
    {
      codigo: 'PREV-005',
      nombre: 'Control Diabetes',
      descripcion: 'Seguimiento trimestral para pacientes diabéticos',
      edadMinima: 18,
      frecuenciaMeses: 3,
      tipo: 'control_cronico',
    },
  ];

  for (const programa of programas) {
    await prisma.programaPreventivo.upsert({
      where: { codigo: programa.codigo },
      update: programa,
      create: programa,
    });
  }

  console.log('✅ Programas Preventivos creados');

  console.log('🎉 Seed Medicare completado!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

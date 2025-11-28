import { PrismaClient, NivelComplejidad } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🏥 Creando datos de prueba para CAPs e IPS...\n');

  // Limpiar datos existentes de CAPs e IPS
  console.log('🧹 Limpiando datos anteriores...');
  await prisma.citaCAP.deleteMany();
  await prisma.personalCAP.deleteMany();
  await prisma.personalIPS.deleteMany();
  await prisma.remision.deleteMany();
  await prisma.pagoADRES.deleteMany();
  await prisma.cAP.deleteMany();
  await prisma.iPS.deleteMany();
  await prisma.aDRESRegional.deleteMany();
  console.log('✅ Limpieza completada\n');

  // ============================================
  // ADRES REGIONALES
  // ============================================
  console.log('💰 Creando ADRES Regionales...');
  
  const adresBogota = await prisma.aDRESRegional.create({
    data: {
      codigo: 'ADRES-BOG',
      nombre: 'ADRES Regional Bogotá',
      departamento: 'Cundinamarca',
      presupuestoAnual: 500000000000, // 500 mil millones
      presupuestoEjecutado: 125000000000,
      director: 'Dr. Carlos Mendoza',
      telefono: '601-555-0100',
      email: 'bogota@adres.gov.co',
    },
  });

  const adresMedellin = await prisma.aDRESRegional.create({
    data: {
      codigo: 'ADRES-MED',
      nombre: 'ADRES Regional Antioquia',
      departamento: 'Antioquia',
      presupuestoAnual: 350000000000,
      presupuestoEjecutado: 87500000000,
      director: 'Dra. María Restrepo',
      telefono: '604-555-0200',
      email: 'antioquia@adres.gov.co',
    },
  });

  const adresCali = await prisma.aDRESRegional.create({
    data: {
      codigo: 'ADRES-CAL',
      nombre: 'ADRES Regional Valle',
      departamento: 'Valle del Cauca',
      presupuestoAnual: 280000000000,
      presupuestoEjecutado: 70000000000,
      director: 'Dr. Jorge Valencia',
      telefono: '602-555-0300',
      email: 'valle@adres.gov.co',
    },
  });

  console.log('✅ 3 ADRES Regionales creadas\n');

  // ============================================
  // CAPs - CENTROS DE ATENCIÓN PRIMARIA
  // ============================================
  console.log('🏢 Creando CAPs...');

  const capsData = [
    // Bogotá
    {
      codigo: 'CAP-BOG-001',
      nombre: 'CAP Kennedy Central',
      direccion: 'Calle 38 Sur #78-50',
      ciudad: 'Bogotá',
      departamento: 'Cundinamarca',
      codigoPostal: '110851',
      latitude: 4.6097,
      longitude: -74.1318,
      poblacionAsignada: 25000,
      poblacionActual: 22500,
      telefono: '601-555-1001',
      email: 'kennedy@caps.gov.co',
      horarioApertura: '06:00',
      horarioCierre: '20:00',
      diasOperacion: 'Lunes a Sábado',
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
      departamento: 'Cundinamarca',
      codigoPostal: '111111',
      latitude: 4.7574,
      longitude: -74.0836,
      poblacionAsignada: 25000,
      poblacionActual: 24800,
      telefono: '601-555-1002',
      email: 'suba@caps.gov.co',
      horarioApertura: '07:00',
      horarioCierre: '19:00',
      diasOperacion: 'Lunes a Viernes',
      tieneOdontologia: true,
      tieneVacunacion: true,
      tieneLaboratorio: false,
      tieneUrgencias: false,
      adresRegionalId: adresBogota.id,
    },
    {
      codigo: 'CAP-BOG-003',
      nombre: 'CAP Usaquén',
      direccion: 'Calle 127 #15-30',
      ciudad: 'Bogotá',
      departamento: 'Cundinamarca',
      codigoPostal: '110121',
      latitude: 4.7050,
      longitude: -74.0320,
      poblacionAsignada: 25000,
      poblacionActual: 18000,
      telefono: '601-555-1003',
      email: 'usaquen@caps.gov.co',
      horarioApertura: '07:00',
      horarioCierre: '18:00',
      diasOperacion: 'Lunes a Viernes',
      tieneOdontologia: true,
      tieneVacunacion: true,
      tieneLaboratorio: true,
      tieneUrgencias: true,
      adresRegionalId: adresBogota.id,
    },
    {
      codigo: 'CAP-BOG-004',
      nombre: 'CAP Ciudad Bolívar',
      direccion: 'Carrera 20 #63-50 Sur',
      ciudad: 'Bogotá',
      departamento: 'Cundinamarca',
      codigoPostal: '111711',
      latitude: 4.5500,
      longitude: -74.1500,
      poblacionAsignada: 25000,
      poblacionActual: 25000,
      telefono: '601-555-1004',
      email: 'ciudadbolivar@caps.gov.co',
      horarioApertura: '06:00',
      horarioCierre: '22:00',
      diasOperacion: 'Lunes a Domingo',
      tieneOdontologia: true,
      tieneVacunacion: true,
      tieneLaboratorio: true,
      tieneUrgencias: true,
      adresRegionalId: adresBogota.id,
    },
    // Medellín
    {
      codigo: 'CAP-MED-001',
      nombre: 'CAP Belén',
      direccion: 'Carrera 76 #30-15',
      ciudad: 'Medellín',
      departamento: 'Antioquia',
      codigoPostal: '050031',
      latitude: 6.2318,
      longitude: -75.5900,
      poblacionAsignada: 25000,
      poblacionActual: 21000,
      telefono: '604-555-2001',
      email: 'belen@caps.gov.co',
      horarioApertura: '07:00',
      horarioCierre: '19:00',
      diasOperacion: 'Lunes a Sábado',
      tieneOdontologia: true,
      tieneVacunacion: true,
      tieneLaboratorio: false,
      tieneUrgencias: false,
      adresRegionalId: adresMedellin.id,
    },
    {
      codigo: 'CAP-MED-002',
      nombre: 'CAP Robledo',
      direccion: 'Calle 80 #65-100',
      ciudad: 'Medellín',
      departamento: 'Antioquia',
      codigoPostal: '050040',
      latitude: 6.2800,
      longitude: -75.5700,
      poblacionAsignada: 25000,
      poblacionActual: 19500,
      telefono: '604-555-2002',
      email: 'robledo@caps.gov.co',
      horarioApertura: '06:00',
      horarioCierre: '20:00',
      diasOperacion: 'Lunes a Viernes',
      tieneOdontologia: true,
      tieneVacunacion: true,
      tieneLaboratorio: true,
      tieneUrgencias: false,
      adresRegionalId: adresMedellin.id,
    },
    // Cali
    {
      codigo: 'CAP-CAL-001',
      nombre: 'CAP Aguablanca',
      direccion: 'Carrera 28 #72-50',
      ciudad: 'Cali',
      departamento: 'Valle del Cauca',
      codigoPostal: '760042',
      latitude: 3.4200,
      longitude: -76.5000,
      poblacionAsignada: 25000,
      poblacionActual: 24000,
      telefono: '602-555-3001',
      email: 'aguablanca@caps.gov.co',
      horarioApertura: '06:00',
      horarioCierre: '21:00',
      diasOperacion: 'Lunes a Domingo',
      tieneOdontologia: true,
      tieneVacunacion: true,
      tieneLaboratorio: true,
      tieneUrgencias: true,
      adresRegionalId: adresCali.id,
    },
    {
      codigo: 'CAP-CAL-002',
      nombre: 'CAP San Fernando',
      direccion: 'Calle 5 #38-20',
      ciudad: 'Cali',
      departamento: 'Valle del Cauca',
      codigoPostal: '760020',
      latitude: 3.4500,
      longitude: -76.5300,
      poblacionAsignada: 25000,
      poblacionActual: 15000,
      telefono: '602-555-3002',
      email: 'sanfernando@caps.gov.co',
      horarioApertura: '07:00',
      horarioCierre: '18:00',
      diasOperacion: 'Lunes a Viernes',
      tieneOdontologia: true,
      tieneVacunacion: true,
      tieneLaboratorio: false,
      tieneUrgencias: false,
      adresRegionalId: adresCali.id,
    },
  ];

  const caps = [];
  for (const capData of capsData) {
    const cap = await prisma.cAP.create({ data: capData });
    caps.push(cap);
  }
  console.log(`✅ ${caps.length} CAPs creados\n`);

  // ============================================
  // IPS - INSTITUCIONES PRESTADORAS DE SALUD
  // ============================================
  console.log('🏥 Creando IPS...');

  const ipsData = [
    // Bogotá - Nivel 4
    {
      codigo: 'IPS-BOG-001',
      nombre: 'Hospital Universitario San Ignacio',
      tipo: 'hospital',
      nivelComplejidad: NivelComplejidad.NIVEL_4,
      direccion: 'Carrera 7 #40-62',
      ciudad: 'Bogotá',
      departamento: 'Cundinamarca',
      codigoPostal: '110231',
      latitude: 4.6280,
      longitude: -74.0650,
      telefono: '601-594-6161',
      email: 'info@husi.org.co',
      numeroCamas: 450,
      numeroQuirofanos: 18,
      numeroUCI: 60,
      servicios: ['cardiología', 'neurología', 'oncología', 'trasplantes', 'cirugía cardiovascular', 'neurocirugía'],
      adresRegionalId: adresBogota.id,
    },
    {
      codigo: 'IPS-BOG-002',
      nombre: 'Fundación Santa Fe de Bogotá',
      tipo: 'hospital',
      nivelComplejidad: NivelComplejidad.NIVEL_4,
      direccion: 'Calle 119 #7-75',
      ciudad: 'Bogotá',
      departamento: 'Cundinamarca',
      codigoPostal: '110111',
      latitude: 4.6970,
      longitude: -74.0330,
      telefono: '601-603-0303',
      email: 'info@fsfb.org.co',
      numeroCamas: 380,
      numeroQuirofanos: 15,
      numeroUCI: 50,
      servicios: ['cardiología', 'oncología', 'ortopedia', 'medicina interna', 'pediatría'],
      adresRegionalId: adresBogota.id,
    },
    // Bogotá - Nivel 3
    {
      codigo: 'IPS-BOG-003',
      nombre: 'Hospital Simón Bolívar',
      tipo: 'hospital',
      nivelComplejidad: NivelComplejidad.NIVEL_3,
      direccion: 'Carrera 7 #165-00',
      ciudad: 'Bogotá',
      departamento: 'Cundinamarca',
      codigoPostal: '110131',
      latitude: 4.7500,
      longitude: -74.0300,
      telefono: '601-676-0200',
      email: 'info@simonbolivar.gov.co',
      numeroCamas: 280,
      numeroQuirofanos: 10,
      numeroUCI: 35,
      servicios: ['quemados', 'cirugía plástica', 'ortopedia', 'medicina interna'],
      adresRegionalId: adresBogota.id,
    },
    // Bogotá - Nivel 2
    {
      codigo: 'IPS-BOG-004',
      nombre: 'Clínica Kennedy',
      tipo: 'clinica',
      nivelComplejidad: NivelComplejidad.NIVEL_2,
      direccion: 'Carrera 80 #38-50 Sur',
      ciudad: 'Bogotá',
      departamento: 'Cundinamarca',
      codigoPostal: '110851',
      latitude: 4.6100,
      longitude: -74.1300,
      telefono: '601-448-0000',
      email: 'info@clinicakennedy.com',
      numeroCamas: 120,
      numeroQuirofanos: 5,
      numeroUCI: 15,
      servicios: ['medicina general', 'pediatría', 'ginecología', 'cirugía menor'],
      adresRegionalId: adresBogota.id,
    },
    // Medellín
    {
      codigo: 'IPS-MED-001',
      nombre: 'Hospital Pablo Tobón Uribe',
      tipo: 'hospital',
      nivelComplejidad: NivelComplejidad.NIVEL_4,
      direccion: 'Calle 78B #69-240',
      ciudad: 'Medellín',
      departamento: 'Antioquia',
      codigoPostal: '050034',
      latitude: 6.2700,
      longitude: -75.5800,
      telefono: '604-445-9000',
      email: 'info@hptu.org.co',
      numeroCamas: 400,
      numeroQuirofanos: 16,
      numeroUCI: 55,
      servicios: ['trasplantes', 'oncología', 'cardiología', 'neurología', 'hematología'],
      adresRegionalId: adresMedellin.id,
    },
    {
      codigo: 'IPS-MED-002',
      nombre: 'Clínica Las Américas',
      tipo: 'clinica',
      nivelComplejidad: NivelComplejidad.NIVEL_3,
      direccion: 'Diagonal 75B #2A-80',
      ciudad: 'Medellín',
      departamento: 'Antioquia',
      codigoPostal: '050012',
      latitude: 6.2100,
      longitude: -75.5600,
      telefono: '604-342-1010',
      email: 'info@lasamericas.com.co',
      numeroCamas: 200,
      numeroQuirofanos: 8,
      numeroUCI: 30,
      servicios: ['cirugía general', 'ortopedia', 'medicina interna', 'ginecología'],
      adresRegionalId: adresMedellin.id,
    },
    // Cali
    {
      codigo: 'IPS-CAL-001',
      nombre: 'Fundación Valle del Lili',
      tipo: 'hospital',
      nivelComplejidad: NivelComplejidad.NIVEL_4,
      direccion: 'Carrera 98 #18-49',
      ciudad: 'Cali',
      departamento: 'Valle del Cauca',
      codigoPostal: '760032',
      latitude: 3.3700,
      longitude: -76.5200,
      telefono: '602-331-9090',
      email: 'info@valledellili.org',
      numeroCamas: 500,
      numeroQuirofanos: 20,
      numeroUCI: 70,
      servicios: ['trasplantes', 'cardiología', 'oncología', 'neurología', 'trauma'],
      adresRegionalId: adresCali.id,
    },
    {
      codigo: 'IPS-CAL-002',
      nombre: 'Clínica Imbanaco',
      tipo: 'clinica',
      nivelComplejidad: NivelComplejidad.NIVEL_3,
      direccion: 'Carrera 38A #5A-100',
      ciudad: 'Cali',
      departamento: 'Valle del Cauca',
      codigoPostal: '760042',
      latitude: 3.4300,
      longitude: -76.5400,
      telefono: '602-682-1000',
      email: 'info@imbanaco.com.co',
      numeroCamas: 250,
      numeroQuirofanos: 12,
      numeroUCI: 40,
      servicios: ['cardiología', 'ortopedia', 'medicina interna', 'pediatría'],
      adresRegionalId: adresCali.id,
    },
    // Laboratorios e Imágenes
    {
      codigo: 'IPS-BOG-LAB-001',
      nombre: 'Laboratorio Clínico Colsanitas',
      tipo: 'laboratorio',
      nivelComplejidad: NivelComplejidad.NIVEL_2,
      direccion: 'Calle 100 #19-54',
      ciudad: 'Bogotá',
      departamento: 'Cundinamarca',
      codigoPostal: '110111',
      latitude: 4.6850,
      longitude: -74.0450,
      telefono: '601-489-0000',
      email: 'laboratorio@colsanitas.com',
      servicios: ['hematología', 'química sanguínea', 'microbiología', 'patología'],
      adresRegionalId: adresBogota.id,
    },
    {
      codigo: 'IPS-BOG-IMG-001',
      nombre: 'Centro de Imágenes Diagnósticas',
      tipo: 'centro_imagenes',
      nivelComplejidad: NivelComplejidad.NIVEL_2,
      direccion: 'Carrera 15 #93-75',
      ciudad: 'Bogotá',
      departamento: 'Cundinamarca',
      codigoPostal: '110221',
      latitude: 4.6780,
      longitude: -74.0520,
      telefono: '601-621-0000',
      email: 'imagenes@diagnosticas.com',
      servicios: ['radiología', 'ecografía', 'tomografía', 'resonancia magnética'],
      adresRegionalId: adresBogota.id,
    },
  ];

  const ipsList = [];
  for (const ipsDataItem of ipsData) {
    const ips = await prisma.iPS.create({ 
      data: {
        ...ipsDataItem,
        servicios: ipsDataItem.servicios,
      }
    });
    ipsList.push(ips);
  }
  console.log(`✅ ${ipsList.length} IPS creadas\n`);

  // ============================================
  // RESUMEN
  // ============================================
  console.log('═══════════════════════════════════════════');
  console.log('📊 RESUMEN DE DATOS CREADOS');
  console.log('═══════════════════════════════════════════');
  console.log(`💰 ADRES Regionales: 3`);
  console.log(`   - Bogotá (Cundinamarca)`);
  console.log(`   - Medellín (Antioquia)`);
  console.log(`   - Cali (Valle del Cauca)`);
  console.log('');
  console.log(`🏢 CAPs: ${caps.length}`);
  console.log(`   - Bogotá: 4 CAPs`);
  console.log(`   - Medellín: 2 CAPs`);
  console.log(`   - Cali: 2 CAPs`);
  console.log('');
  console.log(`🏥 IPS: ${ipsList.length}`);
  console.log(`   - Nivel IV (Alta complejidad): 4`);
  console.log(`   - Nivel III: 3`);
  console.log(`   - Nivel II: 3`);
  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log('✅ ¡Datos de prueba creados exitosamente!');
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

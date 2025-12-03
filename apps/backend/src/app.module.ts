import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { EncountersModule } from './encounters/encounters.module';
import { PatientsModule } from './patients/patients.module';
import { ObservationsModule } from './observations/observations.module';
import { ConditionsModule } from './conditions/conditions.module';
import { MedicationsModule } from './medications/medications.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { LaboratoryModule } from './laboratory/laboratory.module';
import { ImagingModule } from './imaging/imaging.module';
import { UsersModule } from './users/users.module';
// Nuevos módulos - Plan Maestro Medicare
import { CapsModule } from './caps/caps.module';
import { IpsModule } from './ips/ips.module';
import { RemisionesModule } from './remisiones/remisiones.module';
import { AdresModule } from './adres/adres.module';
import { FinancieroModule } from './financiero/financiero.module';
import { PreventivoModule } from './preventivo/preventivo.module';
import { FirmaBiometricaModule } from './firma-biometrica/firma-biometrica.module';
import { NotificacionesModule } from './notificaciones/notificaciones.module';
import { AuditoriaModule } from './auditoria/auditoria.module';
// Módulos de Cumplimiento Normativo
import { RipsModule } from './rips/rips.module';
import { MipresModule } from './mipres/mipres.module';
import { ConsentimientoModule } from './consentimiento/consentimiento.module';
import { FacturacionModule } from './facturacion/facturacion.module';
// Biometric V2 - Sistema Anticorrupcion SASSC (deshabilitado temporalmente por errores de tipos)
// import { BiometricV2Module } from './biometrics/v2/biometric-v2.module';
// Lector de Cédula
import { CedulaReaderModule } from './cedula-reader/cedula-reader.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AppointmentsModule,
    EncountersModule,
    PatientsModule,
    ObservationsModule,
    ConditionsModule,
    MedicationsModule,
    DashboardModule,
    LaboratoryModule,
    ImagingModule,
    UsersModule,
    // Nuevos módulos - Plan Maestro Medicare
    CapsModule,
    IpsModule,
    RemisionesModule,
    AdresModule,
    FinancieroModule,
    PreventivoModule,
    FirmaBiometricaModule,
    NotificacionesModule,
    AuditoriaModule,
    // Cumplimiento Normativo
    RipsModule,
    MipresModule,
    ConsentimientoModule,
    FacturacionModule,
    // Biometric V2 (deshabilitado temporalmente)
    // BiometricV2Module,
    // Lector de Cédula
    CedulaReaderModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}


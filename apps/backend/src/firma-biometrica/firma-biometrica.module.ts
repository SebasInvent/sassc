import { Module } from '@nestjs/common';
import { FirmaBiometricaController } from './firma-biometrica.controller';
import { FirmaBiometricaService } from './firma-biometrica.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FirmaBiometricaController],
  providers: [FirmaBiometricaService],
  exports: [FirmaBiometricaService],
})
export class FirmaBiometricaModule {}

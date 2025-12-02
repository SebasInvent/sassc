import { Module } from '@nestjs/common';
import { AnticorrupcionController } from './anticorrupcion.controller';
import { AnticorrupcionService } from './anticorrupcion.service';
import { FraudDetectorService } from './fraud-detector.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [AnticorrupcionController],
  providers: [AnticorrupcionService, FraudDetectorService],
  exports: [AnticorrupcionService, FraudDetectorService],
})
export class AnticorrupcionModule {}

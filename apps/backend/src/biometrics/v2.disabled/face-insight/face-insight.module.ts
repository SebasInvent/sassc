import { Module } from '@nestjs/common';
import { FaceInsightController } from './face-insight.controller';
import { FaceInsightService } from './face-insight.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [FaceInsightController],
  providers: [FaceInsightService],
  exports: [FaceInsightService],
})
export class FaceInsightModule {}

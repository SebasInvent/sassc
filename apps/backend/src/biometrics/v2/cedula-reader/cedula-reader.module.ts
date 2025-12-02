import { Module } from '@nestjs/common';
import { CedulaReaderController } from './cedula-reader.controller';
import { CedulaReaderService } from './cedula-reader.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [CedulaReaderController],
  providers: [CedulaReaderService],
  exports: [CedulaReaderService],
})
export class CedulaReaderModule {}

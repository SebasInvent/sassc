import { Module } from '@nestjs/common';
import { IpsController } from './ips.controller';
import { IpsService } from './ips.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [IpsController],
  providers: [IpsService],
  exports: [IpsService],
})
export class IpsModule {}

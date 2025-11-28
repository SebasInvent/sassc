import { Module } from '@nestjs/common';
import { ImagingController } from './imaging.controller';
import { ImagingService } from './imaging.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ImagingController],
  providers: [ImagingService],
  exports: [ImagingService],
})
export class ImagingModule {}

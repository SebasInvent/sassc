import { Module } from '@nestjs/common';
import { CedulaReaderController } from './cedula-reader.controller';
import { CedulaReaderService } from './cedula-reader.service';

@Module({
  controllers: [CedulaReaderController],
  providers: [CedulaReaderService],
  exports: [CedulaReaderService],
})
export class CedulaReaderModule {}

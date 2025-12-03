import { Module } from '@nestjs/common';
import { FingerprintReaderController } from './fingerprint-reader.controller';
import { FingerprintReaderService } from './fingerprint-reader.service';

@Module({
  controllers: [FingerprintReaderController],
  providers: [FingerprintReaderService],
  exports: [FingerprintReaderService],
})
export class FingerprintReaderModule {}

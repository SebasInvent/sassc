import { Module } from '@nestjs/common';
import { SessionModule } from './session/session.module';
import { FaceInsightModule } from './face-insight/face-insight.module';
import { FingerprintModule } from './fingerprint/fingerprint.module';
import { CedulaReaderModule } from './cedula-reader/cedula-reader.module';
import { AnticorrupcionModule } from './anticorrupcion-engine/anticorrupcion.module';
import { RoutingModule } from './routing-engine/routing.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    SessionModule,
    FaceInsightModule,
    FingerprintModule,
    CedulaReaderModule,
    AnticorrupcionModule,
    RoutingModule,
    AuditModule,
  ],
  exports: [
    SessionModule,
    FaceInsightModule,
    FingerprintModule,
    CedulaReaderModule,
    AnticorrupcionModule,
    RoutingModule,
    AuditModule,
  ],
})
export class BiometricV2Module {}

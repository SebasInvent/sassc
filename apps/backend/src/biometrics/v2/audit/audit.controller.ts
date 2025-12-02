import { Controller, Get, Param, Query } from '@nestjs/common';
import { AuditService } from './audit.service';

@Controller('biometrics/v2/audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('session/:sessionId')
  async findBySession(@Param('sessionId') sessionId: string) {
    return this.auditService.findBySession(sessionId);
  }

  @Get('terminal/:terminalId')
  async findByTerminal(
    @Param('terminalId') terminalId: string,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.findByTerminal(terminalId, limit);
  }

  @Get('verify-integrity')
  async verifyIntegrity() {
    return this.auditService.verifyChainIntegrity();
  }

  @Get('stats')
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.auditService.getStats(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }
}

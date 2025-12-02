import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import { SessionService, CreateSessionDto, UpdateSessionDto } from './session.service';

@Controller('biometrics/v2/session')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post()
  async create(@Body() dto: CreateSessionDto) {
    return this.sessionService.create(dto);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.sessionService.findById(id);
  }

  @Get('code/:sessionCode')
  async findByCode(@Param('sessionCode') sessionCode: string) {
    return this.sessionService.findByCode(sessionCode);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSessionDto) {
    return this.sessionService.update(id, dto);
  }

  @Get('terminal/:terminalId')
  async findByTerminal(
    @Param('terminalId') terminalId: string,
    @Query('limit') limit?: number,
  ) {
    return this.sessionService.findByTerminal(terminalId, limit);
  }

  @Get('alerts/pending')
  async findWithPendingAlerts() {
    return this.sessionService.findWithPendingAlerts();
  }

  @Get('stats/summary')
  async getStats(
    @Query('terminalId') terminalId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.sessionService.getStats(
      terminalId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }
}

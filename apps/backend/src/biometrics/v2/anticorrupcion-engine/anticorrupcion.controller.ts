import { Controller, Post, Get, Put, Body, Param, Query } from '@nestjs/common';
import { AnticorrupcionService } from './anticorrupcion.service';
import { SessionScores } from './fraud-detector.service';

@Controller('biometrics/v2/anticorrupcion')
export class AnticorrupcionController {
  constructor(private readonly anticorrupcionService: AnticorrupcionService) {}

  @Post('evaluate')
  async evaluateSession(
    @Body() body: { sessionId: string; scores: SessionScores },
  ) {
    return this.anticorrupcionService.evaluateSession(body.sessionId, body.scores);
  }

  @Get('alerts/pending')
  async getPendingAlerts(@Query('limit') limit?: number) {
    return this.anticorrupcionService.getPendingAlerts(limit);
  }

  @Put('alerts/:alertId/resolve')
  async resolveAlert(
    @Param('alertId') alertId: string,
    @Body() body: { resolvedBy: string; resolution: string },
  ) {
    return this.anticorrupcionService.resolveAlert(
      alertId,
      body.resolvedBy,
      body.resolution,
    );
  }

  @Get('stats')
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.anticorrupcionService.getStats(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }
}

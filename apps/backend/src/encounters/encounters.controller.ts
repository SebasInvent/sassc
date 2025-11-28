import { Controller, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { EncountersService } from './encounters.service';
import { CheckinDto } from './dto/checkin.dto';
import { TriageDto } from './dto/triage.dto';

@Controller('fhir/Encounter')
export class EncountersController {
  constructor(private readonly encountersService: EncountersService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  startEncounter(@Body('appointmentId') appointmentId: string, @Request() req: any) {
    const practitionerId = req.user.sub;
    return this.encountersService.startEncounter(appointmentId, practitionerId);
  }

  @Post('checkin/biometric')
  performCheckIn(@Body() checkinDto: CheckinDto) {
    return this.encountersService.performCheckIn(checkinDto.appointmentId);
  }

  @Post('triage/:id')
  performTriage(@Param('id') id: string, @Body() triageDto: TriageDto) {
    return this.encountersService.performTriage(id, triageDto.practitionerId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('encounter/:id/grant')
  grantAccess(@Param('id') id: string) {
    return this.encountersService.grantAccess(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/finish')
  finishEncounter(@Param('id') id: string, @Request() req: any) {
    const practitionerId = req.user.sub;
    return this.encountersService.finish(id, practitionerId);
  }
}
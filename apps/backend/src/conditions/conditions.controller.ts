import { Controller, Post, Body, UseGuards, Req, Get, Param } from '@nestjs/common';
import { ConditionsService } from './conditions.service';
import { CreateConditionDto } from './dto/create-condition.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('fhir/Condition')
export class ConditionsController {
  constructor(private readonly conditionsService: ConditionsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createConditionDto: CreateConditionDto, @Req() req: any) {
    const practitionerId = req.user.sub;
    return this.conditionsService.create(createConditionDto, practitionerId);
  }

  @Get('for-encounter/:encounterId')
  @UseGuards(JwtAuthGuard)
  findAllForEncounter(@Param('encounterId') encounterId: string) {
    return this.conditionsService.findAllForEncounter(encounterId);
  }
}
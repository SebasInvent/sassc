import { Controller, Get, Post, Body, UseGuards, Request, Param } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateAppointmentDto } from './dto/create-appointment.dto';

@UseGuards(JwtAuthGuard) // Protegemos todos los endpoints de este controlador
@Controller('fhir/Appointment')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  create(@Body() createAppointmentDto: CreateAppointmentDto) {
    return this.appointmentsService.create(createAppointmentDto);
  }

  @Get()
  findAll() {
    return this.appointmentsService.findAll();
  }

  @Get('my-appointments')
  findMyAppointments(@Request() req: any) {
    const patientId = req.user.sub; // El ID del paciente viene del token JWT
    return this.appointmentsService.findAllForPatient(patientId);
  }

  @Get('today')
  findTodaysAppointments(@Request() req: any) {
    const practitionerId = req.user.sub; // El ID del médico viene del token JWT
    return this.appointmentsService.findTodaysAppointmentsForPractitioner(practitionerId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.appointmentsService.findOneById(id);
  }
}
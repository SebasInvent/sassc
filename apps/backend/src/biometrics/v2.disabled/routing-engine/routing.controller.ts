import { Controller, Post, Body } from '@nestjs/common';
import { RoutingService, RoutingContext } from './routing.service';

@Controller('biometrics/v2/routing')
export class RoutingController {
  constructor(private readonly routingService: RoutingService) {}

  @Post('decide')
  async determineRouting(@Body() context: RoutingContext) {
    return this.routingService.determineRouting(context);
  }
}

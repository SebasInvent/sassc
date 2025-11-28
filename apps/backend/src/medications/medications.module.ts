import { Module } from '@nestjs/common';
import { MedicationsController } from './medications.controller';
import { MedicationsService } from './medications.service';
import { DispensationsController } from './dispensations.controller';
import { DispensationsService } from './dispensations.service';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { AuthorizationsController } from './authorizations.controller';
import { AuthorizationsService } from './authorizations.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MedicationsController, DispensationsController, InventoryController, AuthorizationsController],
  providers: [MedicationsService, DispensationsService, InventoryService, AuthorizationsService],
})
export class MedicationsModule {}

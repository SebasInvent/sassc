import { Controller, Get, Post, Put, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('fhir/Inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() createInventoryDto: CreateInventoryDto) {
    return this.inventoryService.create(createInventoryDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll() {
    return this.inventoryService.findAll();
  }

  @Get('low-stock')
  @UseGuards(JwtAuthGuard)
  findLowStock() {
    return this.inventoryService.findLowStock();
  }

  @Get('expiring-soon')
  @UseGuards(JwtAuthGuard)
  findExpiringSoon(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days) : 30;
    return this.inventoryService.findExpiringSoon(daysNum);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.inventoryService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(@Param('id') id: string, @Body() updateInventoryDto: UpdateInventoryDto) {
    return this.inventoryService.update(id, updateInventoryDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  partialUpdate(@Param('id') id: string, @Body() updateInventoryDto: UpdateInventoryDto) {
    return this.inventoryService.update(id, updateInventoryDto);
  }

  @Patch(':id/adjust')
  @UseGuards(JwtAuthGuard)
  adjustStock(
    @Param('id') id: string,
    @Body() body: { quantityChange: number; reason?: string }
  ) {
    return this.inventoryService.adjustStock(id, body.quantityChange, body.reason);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string) {
    return this.inventoryService.remove(id);
  }
}

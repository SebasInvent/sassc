import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateInventoryDto } from './dto/create-inventory.dto';
import { UpdateInventoryDto } from './dto/update-inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async create(createInventoryDto: CreateInventoryDto) {
    // Calcular valor total si hay precio unitario
    const totalValue = createInventoryDto.unitPrice 
      ? createInventoryDto.quantity * createInventoryDto.unitPrice 
      : null;

    // Determinar estado según cantidad y fecha de vencimiento
    let status = 'available';
    const minQty = createInventoryDto.minQuantity ?? 10; // Default 10 si no se especifica
    if (createInventoryDto.quantity <= minQty) {
      status = 'low_stock';
    }
    if (createInventoryDto.expiryDate && new Date(createInventoryDto.expiryDate) < new Date()) {
      status = 'expired';
    }

    return this.prisma.inventory.create({
      data: {
        ...createInventoryDto,
        totalValue,
        status: createInventoryDto.status || status,
      },
    });
  }

  async findAll() {
    return this.prisma.inventory.findMany({
      include: {
        organization: {
          select: {
            name: true,
            type: true,
          },
        },
      },
      orderBy: {
        medicationName: 'asc',
      },
    });
  }

  async findLowStock() {
    // Buscar items con status low_stock
    return this.prisma.inventory.findMany({
      where: {
        status: 'low_stock',
      },
      orderBy: {
        quantity: 'asc',
      },
    });
  }

  async findExpiringSoon(days: number = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.prisma.inventory.findMany({
      where: {
        expiryDate: {
          lte: futureDate,
          gte: new Date(),
        },
      },
      orderBy: {
        expiryDate: 'asc',
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.inventory.findUnique({
      where: { id },
      include: {
        organization: true,
      },
    });
  }

  async update(id: string, updateInventoryDto: UpdateInventoryDto) {
    // Recalcular valor total si cambia precio o cantidad
    let totalValue = undefined;
    if (updateInventoryDto.unitPrice !== undefined || updateInventoryDto.quantity !== undefined) {
      const current = await this.prisma.inventory.findUnique({ where: { id } });
      const price = updateInventoryDto.unitPrice ?? current?.unitPrice;
      const qty = updateInventoryDto.quantity ?? current?.quantity;
      totalValue = price && qty ? price * qty : null;
    }

    // Actualizar estado automáticamente
    let status = updateInventoryDto.status;
    if (updateInventoryDto.quantity !== undefined || updateInventoryDto.minQuantity !== undefined) {
      const current = await this.prisma.inventory.findUnique({ where: { id } });
      const qty = updateInventoryDto.quantity ?? current?.quantity ?? 0;
      const minQty = updateInventoryDto.minQuantity ?? current?.minQuantity ?? 10;
      if (qty <= minQty) {
        status = 'low_stock';
      } else if (status === 'low_stock') {
        status = 'available';
      }
    }

    return this.prisma.inventory.update({
      where: { id },
      data: {
        ...updateInventoryDto,
        ...(totalValue !== undefined && { totalValue }),
        ...(status && { status }),
      },
    });
  }

  async adjustStock(id: string, quantityChange: number, reason?: string) {
    const item = await this.prisma.inventory.findUnique({ where: { id } });
    if (!item) {
      throw new Error('Item no encontrado en inventario');
    }

    const newQuantity = item.quantity + quantityChange;
    if (newQuantity < 0) {
      throw new Error('La cantidad no puede ser negativa');
    }

    // Determinar nuevo estado
    let status = item.status;
    if (newQuantity <= item.minQuantity) {
      status = 'low_stock';
    } else if (status === 'low_stock') {
      status = 'available';
    }

    return this.prisma.inventory.update({
      where: { id },
      data: {
        quantity: newQuantity,
        status,
        notes: reason ? `${item.notes || ''}\n${new Date().toISOString()}: ${reason}` : item.notes,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.inventory.delete({
      where: { id },
    });
  }
}

"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

interface AddInventoryDialogProps {
  onSuccess?: () => void;
}

export function AddInventoryDialog({ onSuccess }: AddInventoryDialogProps) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    medicationCode: '',
    medicationName: '',
    presentation: '',
    quantity: '',
    quantityUnit: 'tabletas',
    minQuantity: '10',
    batchNumber: '',
    expiryDate: '',
    location: '',
    supplier: '',
    unitPrice: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        medicationCode: formData.medicationCode,
        medicationName: formData.medicationName,
        presentation: formData.presentation,
        quantity: parseInt(formData.quantity),
        quantityUnit: formData.quantityUnit,
        minQuantity: formData.minQuantity ? parseInt(formData.minQuantity) : 10,
        batchNumber: formData.batchNumber || null,
        expiryDate: formData.expiryDate ? new Date(formData.expiryDate).toISOString() : null,
        location: formData.location || null,
        supplier: formData.supplier || null,
        unitPrice: formData.unitPrice ? parseFloat(formData.unitPrice) : null,
        notes: formData.notes || null,
        lastRestockDate: new Date().toISOString()
      };

      const res = await fetch('http://localhost:3001/fhir/Inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Error desconocido' }));
        console.error('Error del backend:', errorData);
        throw new Error(errorData.message || 'Error al agregar al inventario');
      }

      toast.success('Medicamento agregado al inventario exitosamente');
      setFormData({
        medicationCode: '',
        medicationName: '',
        presentation: '',
        quantity: '',
        quantityUnit: 'tabletas',
        minQuantity: '10',
        batchNumber: '',
        expiryDate: '',
        location: '',
        supplier: '',
        unitPrice: '',
        notes: ''
      });
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast.error('Error al agregar al inventario');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>+ Agregar Medicamento</Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agregar Medicamento al Inventario</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="medicationCode">Código *</Label>
              <Input
                id="medicationCode"
                value={formData.medicationCode}
                onChange={(e) => setFormData({ ...formData, medicationCode: e.target.value })}
                placeholder="ej: ATC-N02BE01"
                required
              />
            </div>
            <div>
              <Label htmlFor="medicationName">Nombre *</Label>
              <Input
                id="medicationName"
                value={formData.medicationName}
                onChange={(e) => setFormData({ ...formData, medicationName: e.target.value })}
                placeholder="ej: Paracetamol"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="presentation">Presentación *</Label>
            <Input
              id="presentation"
              value={formData.presentation}
              onChange={(e) => setFormData({ ...formData, presentation: e.target.value })}
              placeholder="ej: Tabletas 500mg"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="quantity">Cantidad *</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                min="0"
                required
              />
            </div>
            <div>
              <Label htmlFor="quantityUnit">Unidad *</Label>
              <Select
                value={formData.quantityUnit}
                onValueChange={(value) => setFormData({ ...formData, quantityUnit: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tabletas">Tabletas</SelectItem>
                  <SelectItem value="cápsulas">Cápsulas</SelectItem>
                  <SelectItem value="frascos">Frascos</SelectItem>
                  <SelectItem value="cajas">Cajas</SelectItem>
                  <SelectItem value="ampollas">Ampollas</SelectItem>
                  <SelectItem value="ml">Mililitros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="minQuantity">Stock Mínimo</Label>
              <Input
                id="minQuantity"
                type="number"
                value={formData.minQuantity}
                onChange={(e) => setFormData({ ...formData, minQuantity: e.target.value })}
                min="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="batchNumber">Lote</Label>
              <Input
                id="batchNumber"
                value={formData.batchNumber}
                onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                placeholder="ej: LOT123456"
              />
            </div>
            <div>
              <Label htmlFor="expiryDate">Fecha de Vencimiento</Label>
              <Input
                id="expiryDate"
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="location">Ubicación</Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="ej: Estante A-3"
              />
            </div>
            <div>
              <Label htmlFor="supplier">Proveedor</Label>
              <Input
                id="supplier"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                placeholder="ej: Laboratorios ABC"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="unitPrice">Precio Unitario</Label>
            <Input
              id="unitPrice"
              type="number"
              step="0.01"
              value={formData.unitPrice}
              onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notas adicionales sobre el medicamento..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Agregar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

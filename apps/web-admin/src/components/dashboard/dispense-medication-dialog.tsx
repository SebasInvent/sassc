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
import { API_URL } from '@/lib/api';

interface DispenseMedicationDialogProps {
  prescriptionId: string;
  patientId: string;
  medicationName: string;
  onSuccess?: () => void;
}

export function DispenseMedicationDialog({
  prescriptionId,
  patientId,
  medicationName,
  onSuccess
}: DispenseMedicationDialogProps) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    quantity: '',
    quantityUnit: 'tabletas',
    notes: '',
    dispenserId: '', // Opcional
    status: 'completed'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        prescriptionId,
        patientId,
        quantity: parseInt(formData.quantity),
        quantityUnit: formData.quantityUnit,
        notes: formData.notes || null,
        dispenserId: formData.dispenserId || null,
        status: formData.status
      };

      const res = await fetch(`${API_URL}/fhir/MedicationDispense`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Error al dispensar medicamento');

      toast.success('Medicamento dispensado exitosamente');
      setFormData({
        quantity: '',
        quantityUnit: 'tabletas',
        notes: '',
        dispenserId: '',
        status: 'completed'
      });
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast.error('Error al dispensar medicamento');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Dispensar</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dispensar Medicamento</DialogTitle>
          <p className="text-sm text-gray-500 mt-2">{medicationName}</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity">Cantidad *</Label>
              <Input
                id="quantity"
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
                min="1"
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
                  <SelectItem value="ml">Mililitros (ml)</SelectItem>
                  <SelectItem value="ampollas">Ampollas</SelectItem>
                  <SelectItem value="sobres">Sobres</SelectItem>
                  <SelectItem value="frascos">Frascos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="status">Estado</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="completed">Completo</SelectItem>
                <SelectItem value="partial">Parcial</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notas adicionales sobre la dispensación..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Procesando...' : 'Dispensar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

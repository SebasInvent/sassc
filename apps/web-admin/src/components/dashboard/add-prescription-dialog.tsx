"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/lib/api';

interface AddPrescriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  encounterId: string;
  practitionerId: string;
  onSuccess?: () => void;
}

export function AddPrescriptionDialog({
  open,
  onOpenChange,
  patientId,
  encounterId,
  practitionerId,
  onSuccess
}: AddPrescriptionDialogProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    medicationCode: '',
    medicationName: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        patientId,
        encounterId,
        practitionerId,
        medicationCode: formData.medicationCode || 'N/A',
        medicationName: formData.medicationName,
        dosage: formData.dosage,
        frequency: formData.frequency,
        duration: formData.duration ? parseInt(formData.duration) : null,
        instructions: formData.instructions || null,
        status: 'active'
      };

      const res = await fetch(`${API_URL}/fhir/MedicationRequest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Error al crear prescripción');

      toast.success('Prescripción agregada exitosamente');
      setFormData({
        medicationCode: '',
        medicationName: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: ''
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error('Error al agregar prescripción');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Prescribir Medicamento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div>
            <Label htmlFor="medicationName">Medicamento *</Label>
            <Input
              id="medicationName"
              value={formData.medicationName}
              onChange={(e) => setFormData({ ...formData, medicationName: e.target.value })}
              placeholder="Ej: Acetaminofén"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Label htmlFor="dosage">Dosis *</Label>
              <Input
                id="dosage"
                value={formData.dosage}
                onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                placeholder="Ej: 500mg"
                required
              />
            </div>
            <div>
              <Label htmlFor="frequency">Frecuencia *</Label>
              <Input
                id="frequency"
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                placeholder="Ej: Cada 8 horas"
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="duration">Duración (días)</Label>
            <Input
              id="duration"
              type="number"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              placeholder="Ej: 7"
            />
          </div>

          <div>
            <Label htmlFor="instructions">Instrucciones</Label>
            <Textarea
              id="instructions"
              value={formData.instructions}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              placeholder="Instrucciones adicionales..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Prescribir'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

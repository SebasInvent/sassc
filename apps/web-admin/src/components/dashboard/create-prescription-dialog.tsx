"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Plus } from 'lucide-react';
import useSWR from 'swr';
import { API_URL } from '@/lib/api';

const fetcher = async (url: string, token: string) => {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Error');
  return res.json();
};

interface CreatePrescriptionDialogProps {
  onSuccess?: () => void;
}

export function CreatePrescriptionDialog({ onSuccess }: CreatePrescriptionDialogProps) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Cargar pacientes
  const { data: patients } = useSWR(
    token ? '${API_URL}/fhir/Patient' : null,
    (url: string) => fetcher(url, token!)
  );

  const [formData, setFormData] = useState({
    patientId: '',
    medicationName: '',
    medicationCode: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Crear un encounter simple primero
      const encounterRes = await fetch(`${API_URL}/fhir/Encounter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientId: formData.patientId,
          status: 'finished',
          class: 'ambulatory',
        }),
      });

      if (!encounterRes.ok) throw new Error('Error al crear encuentro');
      const encounter = await encounterRes.json();

      // Ahora crear la prescripción
      const prescriptionPayload = {
        patientId: formData.patientId,
        encounterId: encounter.id,
        practitionerId: 'default-practitioner-id', // Usar un ID por defecto
        medicationCode: formData.medicationCode || 'N/A',
        medicationName: formData.medicationName,
        dosage: formData.dosage,
        frequency: formData.frequency,
        duration: formData.duration ? parseInt(formData.duration) : null,
        instructions: formData.instructions,
        status: 'active'
      };

      const res = await fetch(`${API_URL}/fhir/MedicationRequest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(prescriptionPayload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Error desconocido' }));
        throw new Error(errorData.message || 'Error al crear prescripción');
      }

      toast.success('Prescripción creada exitosamente');
      setFormData({
        patientId: '',
        medicationName: '',
        medicationCode: '',
        dosage: '',
        frequency: '',
        duration: '',
        instructions: ''
      });
      setOpen(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Error al crear prescripción');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Prescripción
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nueva Prescripción</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div>
            <Label htmlFor="patientId">Paciente *</Label>
            <select
              id="patientId"
              value={formData.patientId}
              onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
              required
              className="w-full p-2 border rounded-md"
            >
              <option value="">Seleccionar paciente...</option>
              {patients?.map((patient: any) => (
                <option key={patient.id} value={patient.id}>
                  {patient.firstName} {patient.lastName} - {patient.docNumber}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <Label htmlFor="medicationName">Medicamento *</Label>
              <Input
                id="medicationName"
                value={formData.medicationName}
                onChange={(e) => setFormData({ ...formData, medicationName: e.target.value })}
                placeholder="Ej: Paracetamol"
                required
              />
            </div>
            <div>
              <Label htmlFor="medicationCode">Código</Label>
              <Input
                id="medicationCode"
                value={formData.medicationCode}
                onChange={(e) => setFormData({ ...formData, medicationCode: e.target.value })}
                placeholder="Ej: PAR-500"
              />
            </div>
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
              placeholder="Instrucciones adicionales para el paciente..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Crear Prescripción'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

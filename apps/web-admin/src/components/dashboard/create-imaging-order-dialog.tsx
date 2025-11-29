"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Plus, Scan } from 'lucide-react';
import useSWR from 'swr';
import { API_URL } from '@/lib/api';

const fetcher = async (url: string, token: string) => {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Error');
  return res.json();
};

// Catálogo de estudios imagenológicos
const STUDY_TYPES = [
  { code: 'x-ray', name: 'Rayos X', icon: '📷' },
  { code: 'ct', name: 'Tomografía (TAC)', icon: '🔄' },
  { code: 'mri', name: 'Resonancia Magnética', icon: '🧲' },
  { code: 'ultrasound', name: 'Ecografía', icon: '📡' },
  { code: 'mammography', name: 'Mamografía', icon: '🩺' },
  { code: 'fluoroscopy', name: 'Fluoroscopía', icon: '🎬' },
  { code: 'pet', name: 'PET Scan', icon: '⚡' },
  { code: 'bone-scan', name: 'Gammagrafía Ósea', icon: '🦴' },
];

// Regiones anatómicas comunes
const BODY_REGIONS = [
  'Cabeza', 'Cuello', 'Tórax', 'Abdomen', 'Pelvis',
  'Columna Cervical', 'Columna Dorsal', 'Columna Lumbar',
  'Hombro', 'Brazo', 'Codo', 'Antebrazo', 'Muñeca', 'Mano',
  'Cadera', 'Muslo', 'Rodilla', 'Pierna', 'Tobillo', 'Pie'
];

interface CreateImagingOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateImagingOrderDialog({
  open,
  onOpenChange,
  onSuccess
}: CreateImagingOrderDialogProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);

  const { data: patients } = useSWR(
    token ? `${API_URL}/fhir/Patient` : null,
    (url: string) => fetcher(url, token!)
  );

  const [formData, setFormData] = useState({
    patientId: '',
    studyType: '',
    bodyPart: '',
    priority: 'routine',
    clinicalIndication: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.studyType || !formData.bodyPart) {
      toast.error('Selecciona el tipo de estudio y región anatómica');
      return;
    }

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

      // Crear la orden de imagen
      const orderPayload = {
        patientId: formData.patientId,
        encounterId: encounter.id,
        practitionerId: 'default-practitioner-id',
        studyType: formData.studyType,
        bodyPart: formData.bodyPart,
        priority: formData.priority,
        clinicalIndication: formData.clinicalIndication,
        notes: formData.notes,
        status: 'pending'
      };

      const res = await fetch(`${API_URL}/fhir/Imaging/order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(orderPayload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Error desconocido' }));
        throw new Error(errorData.message || 'Error al crear orden');
      }

      toast.success('Orden de imagen creada exitosamente');
      
      // Reset form
      setFormData({
        patientId: '',
        studyType: '',
        bodyPart: '',
        priority: 'routine',
        clinicalIndication: '',
        notes: ''
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Error al crear orden');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="h-6 w-6" />
            Nueva Orden de Imagen Diagnóstica
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {/* Seleccionar Paciente */}
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

          {/* Tipo de Estudio */}
          <div>
            <Label>Tipo de Estudio *</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
              {STUDY_TYPES.map(study => (
                <button
                  key={study.code}
                  type="button"
                  onClick={() => setFormData({ ...formData, studyType: study.name })}
                  className={`p-3 border-2 rounded-lg text-left transition-all ${
                    formData.studyType === study.name
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{study.icon}</div>
                  <div className="font-semibold text-sm">{study.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Región Anatómica */}
          <div>
            <Label htmlFor="bodyPart">Región Anatómica *</Label>
            <select
              id="bodyPart"
              value={formData.bodyPart}
              onChange={(e) => setFormData({ ...formData, bodyPart: e.target.value })}
              required
              className="w-full p-2 border rounded-md"
            >
              <option value="">Seleccionar región...</option>
              {BODY_REGIONS.map(region => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </select>
          </div>

          {/* Prioridad */}
          <div>
            <Label>Prioridad *</Label>
            <div className="flex gap-3 mt-2">
              <Button
                type="button"
                variant={formData.priority === 'routine' ? 'outline' : 'outline'}
                onClick={() => setFormData({ ...formData, priority: 'routine' })}
                className={formData.priority === 'routine' ? 'border-green-500 bg-green-50' : ''}
              >
                📋 Rutina
              </Button>
              <Button
                type="button"
                variant={formData.priority === 'urgent' ? 'outline' : 'outline'}
                onClick={() => setFormData({ ...formData, priority: 'urgent' })}
                className={formData.priority === 'urgent' ? 'border-orange-500 bg-orange-50' : ''}
              >
                ⚡ Urgente
              </Button>
              <Button
                type="button"
                variant={formData.priority === 'stat' ? 'destructive' : 'outline'}
                onClick={() => setFormData({ ...formData, priority: 'stat' })}
                className={formData.priority === 'stat' ? 'bg-red-500' : ''}
              >
                🚨 STAT
              </Button>
            </div>
          </div>

          {/* Indicación Clínica */}
          <div>
            <Label htmlFor="clinicalIndication">Indicación Clínica *</Label>
            <Textarea
              id="clinicalIndication"
              value={formData.clinicalIndication}
              onChange={(e) => setFormData({ ...formData, clinicalIndication: e.target.value })}
              placeholder="Razón del estudio, síntomas relevantes, historia clínica..."
              rows={3}
              required
            />
          </div>

          {/* Notas Adicionales */}
          <div>
            <Label htmlFor="notes">Notas Adicionales</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Instrucciones especiales, contraindicaciones, alergias..."
              rows={2}
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creando...' : 'Crear Orden'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

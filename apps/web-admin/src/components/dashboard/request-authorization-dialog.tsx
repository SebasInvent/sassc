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

interface RequestAuthorizationDialogProps {
  prescriptionId: string;
  patientId: string;
  medicationName: string;
  practitionerId: string;
  onSuccess?: () => void;
}

export function RequestAuthorizationDialog({
  prescriptionId,
  patientId,
  medicationName,
  practitionerId,
  onSuccess
}: RequestAuthorizationDialogProps) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    justification: '',
    diagnosis: '',
    treatmentPlan: '',
    priority: 'routine',
    estimatedCost: '',
    insuranceEntity: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        prescriptionId,
        patientId,
        requesterId: practitionerId,
        justification: formData.justification,
        diagnosis: formData.diagnosis,
        treatmentPlan: formData.treatmentPlan || null,
        priority: formData.priority,
        estimatedCost: formData.estimatedCost ? parseFloat(formData.estimatedCost) : null,
        insuranceEntity: formData.insuranceEntity || null,
        notes: formData.notes || null
      };

      const res = await fetch(`${API_URL}/fhir/Authorization`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Error al solicitar autorización');

      const result = await res.json();
      toast.success(`Autorización solicitada. N°: ${result.authorizationNumber}`);
      setFormData({
        justification: '',
        diagnosis: '',
        treatmentPlan: '',
        priority: 'routine',
        estimatedCost: '',
        insuranceEntity: '',
        notes: ''
      });
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      toast.error('Error al solicitar autorización');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Solicitar Autorización</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Solicitar Autorización de Medicamento</DialogTitle>
          <p className="text-sm text-gray-500 mt-2">{medicationName}</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="diagnosis">Diagnóstico *</Label>
            <Input
              id="diagnosis"
              value={formData.diagnosis}
              onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
              placeholder="ej: Hipertensión arterial no controlada"
              required
            />
          </div>

          <div>
            <Label htmlFor="justification">Justificación Médica *</Label>
            <Textarea
              id="justification"
              value={formData.justification}
              onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
              placeholder="Explique por qué es necesario este medicamento..."
              rows={4}
              required
            />
          </div>

          <div>
            <Label htmlFor="treatmentPlan">Plan de Tratamiento</Label>
            <Textarea
              id="treatmentPlan"
              value={formData.treatmentPlan}
              onChange={(e) => setFormData({ ...formData, treatmentPlan: e.target.value })}
              placeholder="Describa el plan de tratamiento propuesto..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Prioridad *</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="routine">Rutina</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="estimatedCost">Costo Estimado (COP)</Label>
              <Input
                id="estimatedCost"
                type="number"
                step="0.01"
                value={formData.estimatedCost}
                onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="insuranceEntity">Entidad Aseguradora (EPS)</Label>
            <Input
              id="insuranceEntity"
              value={formData.insuranceEntity}
              onChange={(e) => setFormData({ ...formData, insuranceEntity: e.target.value })}
              placeholder="ej: Sura EPS, Nueva EPS, etc."
            />
          </div>

          <div>
            <Label htmlFor="notes">Notas Adicionales</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Información adicional relevante..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Solicitando...' : 'Solicitar Autorización'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { Plus, X, Beaker } from 'lucide-react';
import useSWR from 'swr';

const fetcher = async (url: string, token: string) => {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Error');
  return res.json();
};

// Catálogo de exámenes comunes
const COMMON_TESTS = [
  { code: 'CBC', name: 'Hemograma Completo' },
  { code: 'GLU', name: 'Glucosa en Ayunas' },
  { code: 'HbA1c', name: 'Hemoglobina Glicosilada' },
  { code: 'CREA', name: 'Creatinina' },
  { code: 'BUN', name: 'Nitrógeno Ureico' },
  { code: 'ALT', name: 'Alanina Aminotransferasa' },
  { code: 'AST', name: 'Aspartato Aminotransferasa' },
  { code: 'CHOL', name: 'Colesterol Total' },
  { code: 'HDL', name: 'Colesterol HDL' },
  { code: 'LDL', name: 'Colesterol LDL' },
  { code: 'TRIG', name: 'Triglicéridos' },
  { code: 'TSH', name: 'Hormona Estimulante Tiroides' },
  { code: 'T3', name: 'Triyodotironina' },
  { code: 'T4', name: 'Tiroxina' },
  { code: 'UREA', name: 'Urea' },
  { code: 'UA', name: 'Ácido Úrico' },
  { code: 'PSA', name: 'Antígeno Prostático' },
  { code: 'URINE', name: 'Examen General de Orina' },
  { code: 'ESR', name: 'Velocidad de Sedimentación' },
  { code: 'CRP', name: 'Proteína C Reactiva' },
];

interface CreateLabOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateLabOrderDialog({
  open,
  onOpenChange,
  onSuccess
}: CreateLabOrderDialogProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [customTest, setCustomTest] = useState('');

  const { data: patients } = useSWR(
    token ? 'http://localhost:3001/fhir/Patient' : null,
    (url: string) => fetcher(url, token!)
  );

  const [formData, setFormData] = useState({
    patientId: '',
    priority: 'routine',
    notes: ''
  });

  const toggleTest = (testCode: string) => {
    if (selectedTests.includes(testCode)) {
      setSelectedTests(selectedTests.filter(t => t !== testCode));
    } else {
      setSelectedTests([...selectedTests, testCode]);
    }
  };

  const addCustomTest = () => {
    if (customTest.trim() && !selectedTests.includes(customTest.trim().toUpperCase())) {
      setSelectedTests([...selectedTests, customTest.trim().toUpperCase()]);
      setCustomTest('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedTests.length === 0) {
      toast.error('Selecciona al menos un examen');
      return;
    }

    setLoading(true);

    try {
      // Crear un encounter simple primero
      const encounterRes = await fetch('http://localhost:3001/fhir/Encounter', {
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

      // Crear la orden de laboratorio
      const orderPayload = {
        patientId: formData.patientId,
        encounterId: encounter.id,
        practitionerId: 'default-practitioner-id',
        testCodes: selectedTests,
        priority: formData.priority,
        notes: formData.notes,
        status: 'pending'
      };

      const res = await fetch('http://localhost:3001/fhir/Laboratory/order', {
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

      toast.success('Orden de laboratorio creada exitosamente');
      
      // Reset form
      setFormData({
        patientId: '',
        priority: 'routine',
        notes: ''
      });
      setSelectedTests([]);
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Beaker className="h-6 w-6" />
            Nueva Orden de Laboratorio
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          {/* Prioridad */}
          <div>
            <Label>Prioridad *</Label>
            <div className="flex gap-3 mt-2">
              <Button
                type="button"
                variant={formData.priority === 'routine' ? 'default' : 'outline'}
                onClick={() => setFormData({ ...formData, priority: 'routine' })}
                className="flex-1"
              >
                📋 Rutina
              </Button>
              <Button
                type="button"
                variant={formData.priority === 'urgent' ? 'destructive' : 'outline'}
                onClick={() => setFormData({ ...formData, priority: 'urgent' })}
                className="flex-1"
              >
                🚨 Urgente
              </Button>
            </div>
          </div>

          {/* Exámenes Seleccionados */}
          <div>
            <Label>Exámenes Seleccionados ({selectedTests.length})</Label>
            <div className="mt-2 flex flex-wrap gap-2 min-h-[50px] p-3 border rounded-md bg-slate-50">
              {selectedTests.length === 0 ? (
                <p className="text-sm text-muted-foreground">Selecciona exámenes del catálogo</p>
              ) : (
                selectedTests.map(test => (
                  <Badge key={test} variant="default" className="text-sm px-3 py-1">
                    {test}
                    <button
                      type="button"
                      onClick={() => toggleTest(test)}
                      className="ml-2 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
            </div>
          </div>

          {/* Catálogo de Exámenes Comunes */}
          <div>
            <Label>Catálogo de Exámenes</Label>
            <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto p-3 border rounded-md">
              {COMMON_TESTS.map(test => (
                <button
                  key={test.code}
                  type="button"
                  onClick={() => toggleTest(test.code)}
                  className={`text-left p-2 rounded border text-sm transition-colors ${
                    selectedTests.includes(test.code)
                      ? 'bg-blue-500 text-white border-blue-600'
                      : 'bg-white hover:bg-slate-50 border-gray-200'
                  }`}
                >
                  <div className="font-semibold">{test.code}</div>
                  <div className="text-xs opacity-90">{test.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Agregar Examen Personalizado */}
          <div>
            <Label htmlFor="customTest">Agregar Examen Personalizado</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="customTest"
                value={customTest}
                onChange={(e) => setCustomTest(e.target.value)}
                placeholder="Código del examen (ej: BNP, VIT-D)"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomTest();
                  }
                }}
              />
              <Button type="button" onClick={addCustomTest} variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Notas */}
          <div>
            <Label htmlFor="notes">Notas del Médico</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Indicaciones clínicas, historia relevante, observaciones..."
              rows={3}
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

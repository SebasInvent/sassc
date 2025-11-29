"use client";

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { API_URL } from '@/lib/api';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export interface AddObservationDialogProps {
  encounterId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  appointment: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mutate: () => void | Promise<any>;
}

export function AddObservationDialog({ encounterId, appointment, mutate }: AddObservationDialogProps) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('');
  const [code, setCode] = useState('');
  const [valueQuantity, setValueQuantity] = useState('');
  const [valueUnit, setValueUnit] = useState('');

  const handleSave = async () => {
    if (!category || !code || !valueQuantity) {
      toast.error('Todos los campos son obligatorios.');
      return;
    }

    const newObservation = {
      id: `temp-${Date.now()}`,
      category,
      code,
      valueQuantity: parseFloat(valueQuantity),
      valueUnit,
      valueString: null,
    };

    const optimisticData = {
      ...appointment,
      encounter: {
        ...appointment.encounter!,
        observations: [...appointment.encounter!.observations, newObservation],
      },
    };

    try {
      // Update the cache immediately
      await mutate();

      // Close dialog and reset form
      setOpen(false);
      resetForm();

      // Send the request to the server
      const response = await fetch(`${API_URL}/fhir/Observation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          encounterId,
          category,
          code,
          valueQuantity: parseFloat(valueQuantity),
          valueUnit,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'No se pudo guardar la observación.');
      }

      toast.success('Observación guardada con éxito.');

    } catch (err: any) {
      toast.error(err.message);
      // If the request fails, revert the optimistic update
      await mutate();
    }
  };

  const resetForm = () => {
    setCategory('');
    setCode('');
    setValueQuantity('');
    setValueUnit('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Añadir Observación</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Añadir Nueva Observación</DialogTitle>
          <DialogDescription>
            Registre un nuevo signo vital, síntoma u otra observación para este encuentro.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="text-right">
              Categoría
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Seleccione una categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vital-signs">Signos Vitales</SelectItem>
                <SelectItem value="symptoms">Síntomas</SelectItem>
                <SelectItem value="laboratory">Laboratorio</SelectItem>
                <SelectItem value="imaging">Imágenes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="code" className="text-right">
              Código
            </Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="col-span-3"
              placeholder="Ej: 8310-5 (Temperatura Corporal)"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="valueQuantity" className="text-right">
              Valor
            </Label>
            <div className="col-span-3 grid grid-cols-2 gap-2">
              <Input
                id="valueQuantity"
                type="number"
                value={valueQuantity}
                onChange={(e) => setValueQuantity(e.target.value)}
                placeholder="Ej: 37.5"
              />
              <Input
                id="valueUnit"
                value={valueUnit}
                onChange={(e) => setValueUnit(e.target.value)}
                placeholder="Ej: °C"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSave}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
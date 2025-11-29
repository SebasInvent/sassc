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

interface AddConditionDialogProps {
  encounterId: string;
  onConditionAdded: () => void;
}

export function AddConditionDialog({ encounterId, onConditionAdded }: AddConditionDialogProps) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [clinicalStatus, setClinicalStatus] = useState('active');
  const [verificationStatus, setVerificationStatus] = useState('confirmed');
  const [code, setCode] = useState('');

  const handleSave = async () => {
    if (!code) {
      toast.error('El código del diagnóstico es obligatorio.');
      return;
    }

    try {
      const response = await fetch('${API_URL}/fhir/Condition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          encounterId,
          clinicalStatus,
          verificationStatus,
          code,
          category: 'encounter-diagnosis',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'No se pudo guardar el diagnóstico.');
      }

      setOpen(false);
      onConditionAdded();
      toast.success('Diagnóstico guardado con éxito.');

    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Añadir Diagnóstico</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Añadir Nuevo Diagnóstico</DialogTitle>
          <DialogDescription>
            Registre un nuevo diagnóstico (ej. CIE-10) para este encuentro.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="code" className="text-right">
              Código (CIE-10)
            </Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="col-span-3"
              placeholder="Ej: J06.9"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="clinicalStatus" className="text-right">
              Estado Clínico
            </Label>
            <Select value={clinicalStatus} onValueChange={setClinicalStatus}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Seleccione un estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Activo</SelectItem>
                <SelectItem value="resolved">Resuelto</SelectItem>
                <SelectItem value="inactive">Inactivo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="verificationStatus" className="text-right">
              Verificación
            </Label>
            <Select value={verificationStatus} onValueChange={setVerificationStatus}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Seleccione una verificación" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="confirmed">Confirmado</SelectItem>
                <SelectItem value="provisional">Provisional</SelectItem>
                <SelectItem value="differential">Diferencial</SelectItem>
                <SelectItem value="unconfirmed">Sin confirmar</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSave}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
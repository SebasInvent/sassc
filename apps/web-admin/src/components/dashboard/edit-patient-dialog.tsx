"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { API_URL } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Edit } from 'lucide-react';
import { toast } from 'sonner';

type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  docNumber: string;
  docType?: string;
  birthDate: string;
  email?: string | null;
  phone?: string | null;
};

type EditPatientDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient;
  onSuccess: () => void;
};

export function EditPatientDialog({
  open,
  onOpenChange,
  patient,
  onSuccess,
}: EditPatientDialogProps) {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: patient.firstName,
    lastName: patient.lastName,
    docNumber: patient.docNumber,
    birthDate: patient.birthDate.split('T')[0],
    email: patient.email || '',
    phone: patient.phone || '',
  });

  useEffect(() => {
    setFormData({
      firstName: patient.firstName,
      lastName: patient.lastName,
      docNumber: patient.docNumber,
      birthDate: patient.birthDate.split('T')[0],
      email: patient.email || '',
      phone: patient.phone || '',
    });
  }, [patient]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/fhir/Patient/${patient.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          docNumber: formData.docNumber,
          birthDate: new Date(formData.birthDate).toISOString(),
          email: formData.email || null,
          phone: formData.phone || null,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al actualizar paciente');
      }

      toast.success('Paciente actualizado correctamente');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al actualizar el paciente');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Edit className="h-5 w-5 text-gray-500" />
            Editar Paciente
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            Actualiza la información de {patient.firstName} {patient.lastName}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm text-gray-600">Nombres</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm text-gray-600">Apellidos</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="h-11"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="docNumber" className="text-sm text-gray-600">Documento</Label>
            <Input
              id="docNumber"
              value={formData.docNumber}
              onChange={(e) => setFormData({ ...formData, docNumber: e.target.value })}
              className="h-11 font-mono"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="birthDate" className="text-sm text-gray-600">Fecha de Nacimiento</Label>
            <Input
              id="birthDate"
              type="date"
              value={formData.birthDate}
              onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
              className="h-11"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-gray-600">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="correo@ejemplo.com"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm text-gray-600">Teléfono</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="300 123 4567"
                className="h-11"
              />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="border-gray-200"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="bg-gray-900 hover:bg-gray-800 min-w-[140px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

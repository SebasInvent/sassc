"use client";

import { useState } from 'react';
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
import { Loader2, AlertTriangle, User } from 'lucide-react';
import { toast } from 'sonner';

type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  docNumber: string;
};

type DeletePatientDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient;
  onSuccess: () => void;
};

export function DeletePatientDialog({
  open,
  onOpenChange,
  patient,
  onSuccess,
}: DeletePatientDialogProps) {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/fhir/Patient/${patient.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al eliminar paciente');
      }

      toast.success('Paciente eliminado correctamente');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al eliminar el paciente');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader className="text-center pb-4">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <DialogTitle className="text-xl font-semibold">Eliminar Paciente</DialogTitle>
          <DialogDescription className="text-gray-500 pt-2">
            Esta acción no se puede deshacer. Se eliminará permanentemente el registro del paciente.
          </DialogDescription>
        </DialogHeader>

        {/* Patient Info Card */}
        <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-semibold">
            {patient.firstName[0]}{patient.lastName[0]}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{patient.firstName} {patient.lastName}</p>
            <p className="text-sm text-gray-500 font-mono">{patient.docNumber}</p>
          </div>
        </div>

        <DialogFooter className="pt-4 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="flex-1 border-gray-200"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleDelete}
            disabled={isLoading}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Eliminando...
              </>
            ) : (
              'Eliminar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

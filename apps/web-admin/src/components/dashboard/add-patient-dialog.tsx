"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { dateUtils } from '@/lib/date-utils';
import { UserPlus, Loader2 } from 'lucide-react';
import { API_URL } from '@/lib/api';

interface AddPatientDialogProps {
  onSuccess?: () => void;
}

export function AddPatientDialog({ onSuccess }: AddPatientDialogProps) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    docType: 'CC',
    docNumber: '',
    birthDate: '',
    email: '',
    phone: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        birthDate: dateUtils.toISO(formData.birthDate)
      };

      const res = await fetch(`${API_URL}/fhir/Patient`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Error desconocido' }));
        console.error('Error del backend:', errorData);
        throw new Error(errorData.message || 'Error al crear paciente');
      }

      toast.success('Paciente creado exitosamente');
      setOpen(false);
      setFormData({
        firstName: '',
        lastName: '',
        docType: 'CC',
        docNumber: '',
        birthDate: '',
        email: '',
        phone: ''
      });
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Error al crear paciente');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gray-900 hover:bg-gray-800">
          <UserPlus className="h-4 w-4 mr-2" />
          Nuevo Paciente
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-xl font-semibold">Registrar Nuevo Paciente</DialogTitle>
          <DialogDescription className="text-gray-500">
            Completa la información del paciente para registrarlo en el sistema
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información Personal */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Información Personal</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm text-gray-600">Nombres *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  placeholder="Juan"
                  className="h-11"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm text-gray-600">Apellidos *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Pérez García"
                  className="h-11"
                  required
                />
              </div>
            </div>
          </div>

          {/* Documento */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Documento de Identidad</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="docType" className="text-sm text-gray-600">Tipo *</Label>
                <Select value={formData.docType} onValueChange={(value) => setFormData({ ...formData, docType: value })}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CC">Cédula de Ciudadanía</SelectItem>
                    <SelectItem value="TI">Tarjeta de Identidad</SelectItem>
                    <SelectItem value="CE">Cédula de Extranjería</SelectItem>
                    <SelectItem value="PA">Pasaporte</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="docNumber" className="text-sm text-gray-600">Número *</Label>
                <Input
                  id="docNumber"
                  value={formData.docNumber}
                  onChange={(e) => setFormData({ ...formData, docNumber: e.target.value })}
                  placeholder="1234567890"
                  className="h-11 font-mono"
                  required
                />
              </div>
            </div>
          </div>

          {/* Fecha de Nacimiento */}
          <div className="space-y-2">
            <Label htmlFor="birthDate" className="text-sm text-gray-600">Fecha de Nacimiento *</Label>
            <Input
              id="birthDate"
              type="date"
              value={formData.birthDate}
              onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
              className="h-11"
              required
            />
          </div>

          {/* Contacto */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Información de Contacto</h3>
            <div className="grid grid-cols-2 gap-4">
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
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              className="border-gray-200"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="bg-gray-900 hover:bg-gray-800 min-w-[140px]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar Paciente'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

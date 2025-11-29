"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { XCircle } from 'lucide-react';
import { API_URL } from '@/lib/api';

interface DenyAuthorizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authorization: any;
  onSuccess?: () => void;
}

export function DenyAuthorizationDialog({
  open,
  onOpenChange,
  authorization,
  onSuccess
}: DenyAuthorizationDialogProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [denialReason, setDenialReason] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/fhir/Authorization/${authorization.id}/deny`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reviewerId: 'default-reviewer-id',
          denialReason
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Error desconocido' }));
        throw new Error(errorData.message || 'Error al negar');
      }

      toast.success('Autorización negada');
      setDenialReason('');
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Error al negar autorización');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto w-[95vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            Negar Autorización
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          <div className="bg-slate-50 p-4 rounded-lg space-y-2">
            <p className="text-sm"><strong>Paciente:</strong> {authorization?.patient?.firstName} {authorization?.patient?.lastName}</p>
            <p className="text-sm"><strong>Medicamento:</strong> {authorization?.prescription?.medicationName}</p>
            <p className="text-sm"><strong>Diagnóstico:</strong> {authorization?.diagnosis}</p>
          </div>

          <div>
            <Label htmlFor="denialReason">Razón de Negación *</Label>
            <Textarea
              id="denialReason"
              value={denialReason}
              onChange={(e) => setDenialReason(e.target.value)}
              placeholder="Explique por qué se niega esta autorización..."
              rows={4}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} variant="destructive">
              {loading ? 'Negando...' : 'Negar Autorización'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

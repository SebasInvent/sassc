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
import { FileUp, Image as ImageIcon } from 'lucide-react';
import { dateUtils } from '@/lib/date-utils';

interface UploadImagingResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  onSuccess?: () => void;
}

export function UploadImagingResultDialog({
  open,
  onOpenChange,
  order,
  onSuccess
}: UploadImagingResultDialogProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    studyDate: new Date().toISOString().split('T')[0],
    findings: '',
    impression: '',
    recommendation: '',
    status: 'final',
    imageUrls: '',
    reportedBy: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.findings || !formData.impression) {
      toast.error('Los hallazgos e impresión son obligatorios');
      return;
    }

    setLoading(true);

    try {
      const imageUrlsArray = formData.imageUrls
        .split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0);

      const resultPayload = {
        orderId: order.id,
        studyDate: dateUtils.toISO(formData.studyDate),
        findings: formData.findings,
        impression: formData.impression,
        recommendation: formData.recommendation || null,
        status: formData.status,
        imageUrls: imageUrlsArray.length > 0 ? imageUrlsArray : null,
        reportedBy: formData.reportedBy || 'Radiologist'
      };

      const res = await fetch('http://localhost:3001/fhir/Imaging/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(resultPayload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Error desconocido' }));
        throw new Error(errorData.message || 'Error al subir reporte');
      }

      toast.success('Reporte radiológico cargado exitosamente');
      
      // Reset form
      setFormData({
        studyDate: new Date().toISOString().split('T')[0],
        findings: '',
        impression: '',
        recommendation: '',
        status: 'final',
        imageUrls: '',
        reportedBy: ''
      });
      
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Error al subir reporte');
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
            <FileUp className="h-6 w-6" />
            Subir Reporte Radiológico
          </DialogTitle>
        </DialogHeader>

        {/* Info de la Orden */}
        <div className="bg-slate-50 p-4 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">
                <strong>Paciente:</strong> {order?.patient?.firstName} {order?.patient?.lastName}
              </p>
              <p className="text-sm">
                <strong>Documento:</strong> {order?.patient?.docNumber}
              </p>
            </div>
            <Badge variant="outline" className="text-lg">
              {order?.studyType}
            </Badge>
          </div>
          <p className="text-sm">
            <strong>Región:</strong> {order?.bodyRegion}
          </p>
          <p className="text-sm">
            <strong>Fecha Orden:</strong> {new Date(order?.orderDate).toLocaleDateString('es-CO')}
          </p>
          {order?.clinicalInfo && (
            <div className="pt-2 border-t">
              <p className="text-sm font-semibold">Indicación Clínica:</p>
              <p className="text-sm text-muted-foreground">{order.clinicalInfo}</p>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Fecha del Estudio */}
          <div>
            <Label htmlFor="studyDate">Fecha del Estudio *</Label>
            <Input
              id="studyDate"
              type="date"
              value={formData.studyDate}
              onChange={(e) => setFormData({ ...formData, studyDate: e.target.value })}
              required
            />
          </div>

          {/* Hallazgos Radiológicos */}
          <div>
            <Label htmlFor="findings">Hallazgos Radiológicos *</Label>
            <Textarea
              id="findings"
              value={formData.findings}
              onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
              placeholder="Descripción detallada de los hallazgos observados en el estudio..."
              rows={6}
              required
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Describe los hallazgos normales y anormales observados
            </p>
          </div>

          {/* Impresión Diagnóstica */}
          <div>
            <Label htmlFor="impression">Impresión Diagnóstica *</Label>
            <Textarea
              id="impression"
              value={formData.impression}
              onChange={(e) => setFormData({ ...formData, impression: e.target.value })}
              placeholder="Conclusión diagnóstica basada en los hallazgos..."
              rows={4}
              required
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Resume la conclusión diagnóstica principal
            </p>
          </div>

          {/* Recomendaciones */}
          <div>
            <Label htmlFor="recommendation">Recomendaciones</Label>
            <Textarea
              id="recommendation"
              value={formData.recommendation}
              onChange={(e) => setFormData({ ...formData, recommendation: e.target.value })}
              placeholder="Recomendaciones de seguimiento, estudios adicionales, etc..."
              rows={3}
            />
          </div>

          {/* Estado del Reporte */}
          <div>
            <Label>Estado del Reporte *</Label>
            <div className="flex gap-3 mt-2">
              <Button
                type="button"
                variant={formData.status === 'preliminary' ? 'default' : 'outline'}
                onClick={() => setFormData({ ...formData, status: 'preliminary' })}
              >
                📝 Preliminar
              </Button>
              <Button
                type="button"
                variant={formData.status === 'final' ? 'default' : 'outline'}
                onClick={() => setFormData({ ...formData, status: 'final' })}
              >
                ✅ Final
              </Button>
              <Button
                type="button"
                variant={formData.status === 'amended' ? 'default' : 'outline'}
                onClick={() => setFormData({ ...formData, status: 'amended' })}
              >
                📋 Enmendado
              </Button>
            </div>
          </div>

          {/* URLs de Imágenes */}
          <div>
            <Label htmlFor="imageUrls">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                URLs de Imágenes (Opcional)
              </div>
            </Label>
            <Textarea
              id="imageUrls"
              value={formData.imageUrls}
              onChange={(e) => setFormData({ ...formData, imageUrls: e.target.value })}
              placeholder="https://ejemplo.com/imagen1.jpg&#10;https://ejemplo.com/imagen2.jpg&#10;https://pacs.hospital.com/study/123"
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Una URL por línea (DICOM viewer, PACS, o imágenes JPEG/PNG)
            </p>
          </div>

          {/* Radiólogo que Reporta */}
          <div>
            <Label htmlFor="reportedBy">Radiólogo que Reporta</Label>
            <Input
              id="reportedBy"
              value={formData.reportedBy}
              onChange={(e) => setFormData({ ...formData, reportedBy: e.target.value })}
              placeholder="Nombre del radiólogo"
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar Reporte'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

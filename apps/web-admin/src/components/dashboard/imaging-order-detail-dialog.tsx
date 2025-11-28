"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  User, 
  Calendar, 
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Scan,
  Image as ImageIcon,
  ExternalLink
} from 'lucide-react';

interface ImagingOrderDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
}

export function ImagingOrderDetailDialog({
  open,
  onOpenChange,
  order
}: ImagingOrderDetailDialogProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-orange-600" />;
      case 'scheduled':
      case 'in_progress':
        return <Scan className="h-5 w-5 text-blue-600" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: { variant: 'destructive', label: 'PENDIENTE' },
      scheduled: { variant: 'default', label: 'PROGRAMADO' },
      in_progress: { variant: 'default', label: 'EN PROCESO' },
      completed: { variant: 'secondary', label: 'COMPLETADO' },
      cancelled: { variant: 'outline', label: 'CANCELADO' },
    };

    const config = variants[status] || { variant: 'outline', label: status.toUpperCase() };
    return <Badge variant={config.variant} className="text-lg">{config.label}</Badge>;
  };

  const hasResult = order?.results && order.results.length > 0;
  const result = hasResult ? order.results[0] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Scan className="h-6 w-6" />
              Detalle de Orden de Imagen
            </DialogTitle>
          </div>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="study">Estudio</TabsTrigger>
            <TabsTrigger value="report">
              Reporte {hasResult && <CheckCircle2 className="ml-1 h-4 w-4 text-green-600" />}
            </TabsTrigger>
          </TabsList>

          {/* Tab General */}
          <TabsContent value="general" className="space-y-4">
            {/* Estado */}
            <div className="p-4 border rounded-lg bg-slate-50">
              <div className="flex items-center gap-2 mb-2">
                {getStatusIcon(order?.status)}
                <h3 className="font-semibold">Estado Actual</h3>
              </div>
              {getStatusBadge(order?.status)}
            </div>

            <Separator />

            {/* Información del Paciente */}
            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <User className="h-5 w-5" />
                Información del Paciente
              </h3>
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Nombre Completo</p>
                  <p className="font-medium">
                    {order?.patient?.firstName} {order?.patient?.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Documento</p>
                  <p className="font-medium">{order?.patient?.docNumber}</p>
                </div>
              </div>
            </div>

            {/* Información de la Orden */}
            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <Calendar className="h-5 w-5" />
                Información de la Orden
              </h3>
              <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-gray-500">Fecha de Orden</p>
                    <p className="font-medium">{formatDate(order?.orderDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Prioridad</p>
                    <Badge variant={
                      order?.priority === 'stat' ? 'destructive' :
                      order?.priority === 'urgent' ? 'destructive' :
                      'default'
                    }>
                      {order?.priority === 'stat' ? '🚨 STAT' :
                       order?.priority === 'urgent' ? '⚡ URGENTE' :
                       '📋 RUTINA'}
                    </Badge>
                  </div>
                </div>
                {order?.scheduledDate && (
                  <div>
                    <p className="text-sm text-gray-500">Fecha Programada</p>
                    <p className="font-medium">{formatDate(order?.scheduledDate)}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Médico Solicitante</p>
                  <p className="font-medium">
                    Dr. {order?.practitioner?.firstName} {order?.practitioner?.lastName}
                  </p>
                  {order?.practitioner?.specialty && (
                    <p className="text-sm text-muted-foreground">{order?.practitioner?.specialty}</p>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab Estudio */}
          <TabsContent value="study" className="space-y-4">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg">
              <div className="flex items-center gap-4">
                <div className="text-5xl">
                  {order?.studyType?.toLowerCase().includes('x-ray') ? '📷' :
                   order?.studyType?.toLowerCase().includes('ct') || order?.studyType?.toLowerCase().includes('tac') ? '🔄' :
                   order?.studyType?.toLowerCase().includes('mri') || order?.studyType?.toLowerCase().includes('resonancia') ? '🧲' :
                   order?.studyType?.toLowerCase().includes('ultrasound') || order?.studyType?.toLowerCase().includes('eco') ? '📡' :
                   order?.studyType?.toLowerCase().includes('mammo') ? '🩺' :
                   '🔬'}
                </div>
                <div>
                  <h3 className="text-2xl font-bold">{order?.studyType}</h3>
                  <p className="text-lg text-muted-foreground">Región: {order?.bodyRegion}</p>
                </div>
              </div>
            </div>

            {order?.clinicalInfo && (
              <div>
                <h4 className="font-semibold mb-2">Indicación Clínica</h4>
                <div className="bg-white p-4 rounded border">
                  <p className="text-sm whitespace-pre-wrap">{order.clinicalInfo}</p>
                </div>
              </div>
            )}

            {order?.notes && (
              <div>
                <h4 className="font-semibold mb-2">Notas Adicionales</h4>
                <div className="bg-white p-4 rounded border">
                  <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Tab Reporte */}
          <TabsContent value="report" className="space-y-4">
            {hasResult ? (
              <>
                {/* Información del Reporte */}
                <div className="bg-green-50 border-2 border-green-200 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg">Reporte Radiológico</h3>
                    <Badge variant={
                      result.status === 'final' ? 'secondary' :
                      result.status === 'preliminary' ? 'default' :
                      'outline'
                    }>
                      {result.status === 'final' ? '✅ Final' :
                       result.status === 'preliminary' ? '📝 Preliminar' :
                       '📋 Enmendado'}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">Fecha de Estudio:</span>
                      <p className="font-medium">{formatDate(result.studyDate)}</p>
                    </div>
                    {result.reportedBy && (
                      <div>
                        <span className="text-gray-500">Reportado por:</span>
                        <p className="font-medium">{result.reportedBy}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Hallazgos */}
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Hallazgos Radiológicos
                  </h4>
                  <div className="bg-white p-4 rounded border font-mono text-sm">
                    <p className="whitespace-pre-wrap">{result.findings}</p>
                  </div>
                </div>

                {/* Impresión */}
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Impresión Diagnóstica
                  </h4>
                  <div className="bg-blue-50 p-4 rounded border-2 border-blue-200 font-mono text-sm">
                    <p className="whitespace-pre-wrap font-semibold">{result.impression}</p>
                  </div>
                </div>

                {/* Recomendaciones */}
                {result.recommendation && (
                  <div>
                    <h4 className="font-semibold mb-2">Recomendaciones</h4>
                    <div className="bg-white p-4 rounded border">
                      <p className="text-sm whitespace-pre-wrap">{result.recommendation}</p>
                    </div>
                  </div>
                )}

                {/* Imágenes */}
                {result.imageUrls && result.imageUrls.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <ImageIcon className="h-4 w-4" />
                      Imágenes del Estudio ({result.imageUrls.length})
                    </h4>
                    <div className="space-y-2">
                      {result.imageUrls.map((url: string, index: number) => (
                        <a
                          key={index}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-3 border rounded hover:bg-slate-50 transition-colors"
                        >
                          <ImageIcon className="h-4 w-4 text-blue-600" />
                          <span className="text-sm flex-1 truncate">{url}</span>
                          <ExternalLink className="h-4 w-4 text-gray-400" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <Scan className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-4 text-muted-foreground">
                  Aún no hay reporte disponible
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  El reporte será visible una vez que el radiólogo lo haya completado
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

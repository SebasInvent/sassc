"use client";

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  User, 
  Calendar, 
  DollarSign, 
  MessageSquare, 
  FileCheck,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

interface AuthorizationDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authorization: any;
  onUpdate?: () => void;
}

export function AuthorizationDetailDialog({
  open,
  onOpenChange,
  authorization,
  onUpdate
}: AuthorizationDetailDialogProps) {
  const { token } = useAuth();
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

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

  const calculateSLA = () => {
    if (!authorization.requestDate) return { days: 0, hours: 0, status: 'unknown' };
    
    const requestDate = new Date(authorization.requestDate);
    const now = authorization.responseDate ? new Date(authorization.responseDate) : new Date();
    const diffMs = now.getTime() - requestDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    let status = 'on-time';
    if (authorization.priority === 'urgent' && diffHours > 4) status = 'overdue';
    if (authorization.priority === 'routine' && diffDays > 3) status = 'overdue';
    
    return { days: diffDays, hours: diffHours % 24, status };
  };

  const sla = calculateSLA();

  const addComment = async () => {
    if (!comment.trim()) return;
    
    setLoading(true);
    try {
      // Aquí iría la API para agregar comentarios
      toast.success('Comentario agregado');
      setComment('');
    } catch (error) {
      toast.error('Error al agregar comentario');
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    toast.info('Exportando a PDF... (Función en desarrollo)');
    // Aquí iría la lógica de exportación a PDF
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'denied':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-orange-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="h-6 w-6" />
              Detalle de Autorización
              <Badge variant="outline" className="ml-2">
                {authorization?.authorizationNumber || 'Sin número'}
              </Badge>
            </DialogTitle>
            <Button variant="outline" size="sm" onClick={exportToPDF}>
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="clinical">Información Clínica</TabsTrigger>
            <TabsTrigger value="timeline">Línea de Tiempo</TabsTrigger>
            <TabsTrigger value="comments">Comentarios</TabsTrigger>
          </TabsList>

          {/* Tab General */}
          <TabsContent value="general" className="space-y-4">
            {/* Estado y SLA */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(authorization?.status)}
                  <h3 className="font-semibold">Estado Actual</h3>
                </div>
                <Badge 
                  variant={
                    authorization?.status === 'approved' ? 'default' :
                    authorization?.status === 'denied' ? 'destructive' :
                    'outline'
                  }
                  className="text-lg"
                >
                  {authorization?.status === 'approved' ? 'APROBADA' :
                   authorization?.status === 'denied' ? 'NEGADA' :
                   authorization?.status === 'pending' ? 'PENDIENTE' :
                   'DESCONOCIDO'}
                </Badge>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-5 w-5" />
                  <h3 className="font-semibold">Tiempo de Respuesta</h3>
                </div>
                <div className="text-2xl font-bold">
                  {sla.days}d {sla.hours}h
                </div>
                <Badge variant={sla.status === 'overdue' ? 'destructive' : 'default'}>
                  {sla.status === 'overdue' ? 'Fuera de SLA' : 'Dentro de SLA'}
                </Badge>
              </div>
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
                    {authorization?.patient?.firstName} {authorization?.patient?.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Documento</p>
                  <p className="font-medium">{authorization?.patient?.docNumber}</p>
                </div>
              </div>
            </div>

            {/* Información del Medicamento */}
            <div>
              <h3 className="font-semibold flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5" />
                Medicamento Solicitado
              </h3>
              <div className="bg-slate-50 p-4 rounded-lg space-y-2">
                <div>
                  <p className="text-sm text-gray-500">Medicamento</p>
                  <p className="font-medium text-lg">{authorization?.prescription?.medicationName}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-gray-500">Dosis</p>
                    <p className="font-medium">{authorization?.prescription?.dosage}</p>
                  </div>
                  {authorization?.estimatedCost && (
                    <div>
                      <p className="text-sm text-gray-500">Costo Estimado</p>
                      <p className="font-medium flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        ${authorization?.estimatedCost?.toLocaleString('es-CO')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* EPS/Aseguradora */}
            {authorization?.insuranceEntity && (
              <div>
                <h3 className="font-semibold mb-2">Entidad Aseguradora</h3>
                <Badge variant="outline" className="text-base p-2">
                  {authorization.insuranceEntity}
                </Badge>
              </div>
            )}
          </TabsContent>

          {/* Tab Información Clínica */}
          <TabsContent value="clinical" className="space-y-4">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Diagnóstico</h3>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                  <p className="text-sm">{authorization?.diagnosis}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Justificación Médica</h3>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{authorization?.justification}</p>
                </div>
              </div>

              {authorization?.treatmentPlan && (
                <div>
                  <h3 className="font-semibold mb-2">Plan de Tratamiento</h3>
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{authorization?.treatmentPlan}</p>
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-semibold mb-2">Prioridad</h3>
                <Badge variant={authorization?.priority === 'urgent' ? 'destructive' : 'default'}>
                  {authorization?.priority === 'urgent' ? '🚨 URGENTE' : '📋 RUTINA'}
                </Badge>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-2">Médico Solicitante</h3>
                <div className="bg-slate-50 p-3 rounded-lg">
                  <p className="font-medium">
                    Dr. {authorization?.requester?.firstName} {authorization?.requester?.lastName}
                  </p>
                  <p className="text-sm text-gray-500">Fecha de Solicitud: {formatDate(authorization?.requestDate)}</p>
                </div>
              </div>

              {authorization?.reviewer && (
                <div>
                  <h3 className="font-semibold mb-2">Revisor</h3>
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="font-medium">
                      Dr. {authorization?.reviewer?.firstName} {authorization?.reviewer?.lastName}
                    </p>
                    <p className="text-sm text-gray-500">Fecha de Respuesta: {formatDate(authorization?.responseDate)}</p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tab Línea de Tiempo */}
          <TabsContent value="timeline" className="space-y-4">
            <div className="relative">
              {/* Timeline items */}
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="rounded-full bg-blue-500 p-2">
                      <Calendar className="h-4 w-4 text-white" />
                    </div>
                    <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
                  </div>
                  <div className="flex-1 pb-6">
                    <h4 className="font-semibold">Solicitud Creada</h4>
                    <p className="text-sm text-gray-500">{formatDate(authorization?.requestDate)}</p>
                    <p className="text-sm mt-1">
                      Solicitada por Dr. {authorization?.requester?.firstName} {authorization?.requester?.lastName}
                    </p>
                  </div>
                </div>

                {authorization?.responseDate && (
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`rounded-full p-2 ${
                        authorization?.status === 'approved' ? 'bg-green-500' :
                        authorization?.status === 'denied' ? 'bg-red-500' :
                        'bg-gray-500'
                      }`}>
                        {authorization?.status === 'approved' ? (
                          <CheckCircle2 className="h-4 w-4 text-white" />
                        ) : (
                          <XCircle className="h-4 w-4 text-white" />
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">
                        {authorization?.status === 'approved' ? 'Autorización Aprobada' : 'Autorización Negada'}
                      </h4>
                      <p className="text-sm text-gray-500">{formatDate(authorization?.responseDate)}</p>
                      {authorization?.reviewer && (
                        <p className="text-sm mt-1">
                          Revisada por Dr. {authorization.reviewer.firstName} {authorization.reviewer.lastName}
                        </p>
                      )}
                      {authorization?.approvedQuantity && (
                        <Badge variant="default" className="mt-2">
                          Cantidad: {authorization.approvedQuantity} unidades
                        </Badge>
                      )}
                      {authorization?.denialReason && (
                        <div className="mt-2 p-2 bg-red-50 border-l-4 border-red-500 rounded">
                          <p className="text-sm font-medium">Razón de negación:</p>
                          <p className="text-sm">{authorization.denialReason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Tab Comentarios */}
          <TabsContent value="comments" className="space-y-4">
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Comunicación Interna
              </h3>
              
              {/* Lista de comentarios (mock) */}
              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-medium text-sm">Dr. {authorization?.requester?.firstName}</p>
                    <p className="text-xs text-gray-500">{formatDate(authorization?.requestDate)}</p>
                  </div>
                  <p className="text-sm">{authorization?.justification?.substring(0, 100)}...</p>
                </div>
                
                {/* Placeholder para más comentarios */}
                <p className="text-sm text-center text-gray-500 py-4">
                  No hay comentarios adicionales
                </p>
              </div>

              {/* Agregar comentario */}
              <div className="space-y-2">
                <Label>Agregar Comentario</Label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Escribe un comentario o pregunta sobre esta autorización..."
                  rows={3}
                />
                <Button onClick={addComment} disabled={loading || !comment.trim()}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  {loading ? 'Enviando...' : 'Agregar Comentario'}
                </Button>
              </div>
            </div>
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

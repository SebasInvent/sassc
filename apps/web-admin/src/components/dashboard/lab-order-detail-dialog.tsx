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
  Beaker
} from 'lucide-react';

interface LabOrderDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
}

export function LabOrderDetailDialog({
  open,
  onOpenChange,
  order
}: LabOrderDetailDialogProps) {
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
      case 'in_progress':
        return <Beaker className="h-5 w-5 text-blue-600" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getInterpretationBadge = (interpretation: string) => {
    switch (interpretation) {
      case 'normal':
        return <Badge className="bg-green-500">Normal</Badge>;
      case 'abnormal':
        return <Badge className="bg-yellow-500">Anormal</Badge>;
      case 'critical':
        return <Badge variant="destructive">Crítico</Badge>;
      default:
        return <Badge variant="outline">{interpretation}</Badge>;
    }
  };

  const completedTests = order?.results?.length || 0;
  const totalTests = order?.testCodes?.length || 0;
  const progressPercentage = totalTests > 0 ? (completedTests / totalTests) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Beaker className="h-6 w-6" />
              Detalle de Orden de Laboratorio
            </DialogTitle>
          </div>
        </DialogHeader>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="tests">Exámenes ({totalTests})</TabsTrigger>
            <TabsTrigger value="results">Resultados ({completedTests})</TabsTrigger>
          </TabsList>

          {/* Tab General */}
          <TabsContent value="general" className="space-y-4">
            {/* Estado y Progreso */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(order?.status)}
                  <h3 className="font-semibold">Estado Actual</h3>
                </div>
                <Badge 
                  variant={
                    order?.status === 'completed' ? 'secondary' :
                    order?.status === 'in_progress' ? 'default' :
                    order?.status === 'pending' ? 'destructive' :
                    'outline'
                  }
                  className="text-lg"
                >
                  {order?.status === 'completed' ? 'COMPLETADO' :
                   order?.status === 'in_progress' ? 'EN PROCESO' :
                   order?.status === 'pending' ? 'PENDIENTE' :
                   'DESCONOCIDO'}
                </Badge>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-5 w-5" />
                  <h3 className="font-semibold">Progreso</h3>
                </div>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">
                    {completedTests} / {totalTests}
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {progressPercentage.toFixed(0)}% completado
                  </p>
                </div>
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
                    <Badge variant={order?.priority === 'urgent' ? 'destructive' : 'default'}>
                      {order?.priority === 'urgent' ? '🚨 URGENTE' : '📋 RUTINA'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Médico Solicitante</p>
                  <p className="font-medium">
                    Dr. {order?.practitioner?.firstName} {order?.practitioner?.lastName}
                  </p>
                  {order?.practitioner?.specialty && (
                    <p className="text-sm text-muted-foreground">{order?.practitioner?.specialty}</p>
                  )}
                </div>
                {order?.notes && (
                  <div>
                    <p className="text-sm text-gray-500">Notas del Médico</p>
                    <p className="text-sm bg-white p-3 rounded border">
                      {order?.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Tab Exámenes */}
          <TabsContent value="tests" className="space-y-4">
            <div>
              <h3 className="font-semibold mb-3">Exámenes Solicitados</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {order?.testCodes?.map((code: string) => {
                  const hasResult = order?.results?.some((r: any) => r.testCode === code);
                  return (
                    <div 
                      key={code}
                      className={`p-4 border-2 rounded-lg ${
                        hasResult ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-bold text-lg">{code}</p>
                        {hasResult && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {hasResult ? 'Resultado disponible' : 'Pendiente'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* Tab Resultados */}
          <TabsContent value="results" className="space-y-4">
            {order?.results && order.results.length > 0 ? (
              <div className="space-y-4">
                {order.results.map((result: any) => (
                  <div key={result.id} className="border rounded-lg p-4 bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-lg">{result.testCode}</h4>
                        <p className="text-sm text-muted-foreground">{result.testName}</p>
                      </div>
                      {getInterpretationBadge(result.interpretation)}
                    </div>
                    
                    <Separator className="my-3" />
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Resultado</p>
                        <p className="font-bold text-xl text-blue-600">
                          {result.result} {result.unit}
                        </p>
                      </div>
                      {result.referenceRange && (
                        <div>
                          <p className="text-sm text-gray-500">Rango de Referencia</p>
                          <p className="font-medium">{result.referenceRange}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-gray-500">Fecha</p>
                        <p className="font-medium text-sm">
                          {new Date(result.resultDate).toLocaleDateString('es-CO')}
                        </p>
                      </div>
                      {result.reportedBy && (
                        <div>
                          <p className="text-sm text-gray-500">Reportado por</p>
                          <p className="font-medium text-sm">{result.reportedBy}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Beaker className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-4 text-muted-foreground">
                  Aún no hay resultados disponibles
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

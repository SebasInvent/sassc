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
import { FileUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { dateUtils } from '@/lib/date-utils';
import { API_URL } from '@/lib/api';

interface UploadLabResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any;
  onSuccess?: () => void;
}

export function UploadLabResultDialog({
  open,
  onOpenChange,
  order,
  onSuccess
}: UploadLabResultDialogProps) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedTest, setSelectedTest] = useState('');
  
  const [formData, setFormData] = useState({
    testName: '',
    result: '',
    unit: '',
    referenceRange: '',
    interpretation: 'normal',
    resultDate: new Date().toISOString().split('T')[0],
    reportedBy: ''
  });

  // Tests que aún no tienen resultados
  const pendingTests = order?.testCodes?.filter((code: string) => 
    !order?.results?.some((r: any) => r.testCode === code)
  ) || [];

  const handleTestSelect = (testCode: string) => {
    setSelectedTest(testCode);
    setFormData({
      ...formData,
      testName: getTestName(testCode)
    });
  };

  const getTestName = (code: string): string => {
    const testNames: Record<string, string> = {
      'CBC': 'Hemograma Completo',
      'GLU': 'Glucosa en Ayunas',
      'HbA1c': 'Hemoglobina Glicosilada',
      'CREA': 'Creatinina',
      'BUN': 'Nitrógeno Ureico',
      'ALT': 'Alanina Aminotransferasa',
      'AST': 'Aspartato Aminotransferasa',
      'CHOL': 'Colesterol Total',
      'HDL': 'Colesterol HDL',
      'LDL': 'Colesterol LDL',
      'TRIG': 'Triglicéridos',
      'TSH': 'Hormona Estimulante Tiroides',
      'UREA': 'Urea',
      'UA': 'Ácido Úrico',
    };
    return testNames[code] || code;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTest) {
      toast.error('Selecciona un examen');
      return;
    }

    setLoading(true);

    try {
      const resultPayload = {
        orderId: order.id,
        testCode: selectedTest,
        testName: formData.testName,
        result: formData.result,
        unit: formData.unit || null,
        referenceRange: formData.referenceRange || null,
        status: 'final',
        interpretation: formData.interpretation,
        resultDate: dateUtils.toISO(formData.resultDate),
        reportedBy: formData.reportedBy || 'Lab Technician'
      };

      const res = await fetch(`${API_URL}/fhir/Laboratory/result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(resultPayload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: 'Error desconocido' }));
        throw new Error(errorData.message || 'Error al subir resultado');
      }

      toast.success(`Resultado de ${selectedTest} cargado exitosamente`);
      
      // Reset form
      setSelectedTest('');
      setFormData({
        testName: '',
        result: '',
        unit: '',
        referenceRange: '',
        interpretation: 'normal',
        resultDate: new Date().toISOString().split('T')[0],
        reportedBy: ''
      });
      
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || 'Error al subir resultado');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-6 w-6" />
            Subir Resultado de Laboratorio
          </DialogTitle>
        </DialogHeader>

        {/* Info de la Orden */}
        <div className="bg-slate-50 p-4 rounded-lg space-y-2">
          <p className="text-sm">
            <strong>Paciente:</strong> {order?.patient?.firstName} {order?.patient?.lastName}
          </p>
          <p className="text-sm">
            <strong>Fecha Orden:</strong> {new Date(order?.orderDate).toLocaleDateString('es-CO')}
          </p>
          <div className="flex items-center gap-2">
            <strong className="text-sm">Exámenes:</strong>
            <div className="flex flex-wrap gap-1">
              {order?.testCodes?.map((code: string) => (
                <Badge 
                  key={code} 
                  variant={order?.results?.some((r: any) => r.testCode === code) ? 'secondary' : 'default'}
                >
                  {code}
                  {order?.results?.some((r: any) => r.testCode === code) && (
                    <CheckCircle2 className="ml-1 h-3 w-3" />
                  )}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {/* Seleccionar Examen Pendiente */}
          <div>
            <Label>Seleccionar Examen *</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {pendingTests.length === 0 ? (
                <div className="col-span-3 text-center py-4 text-muted-foreground">
                  ✅ Todos los exámenes ya tienen resultados
                </div>
              ) : (
                pendingTests.map((code: string) => (
                  <Button
                    key={code}
                    type="button"
                    variant={selectedTest === code ? 'default' : 'outline'}
                    onClick={() => handleTestSelect(code)}
                    className="h-auto py-3"
                  >
                    <div>
                      <div className="font-bold">{code}</div>
                      <div className="text-xs">{getTestName(code)}</div>
                    </div>
                  </Button>
                ))
              )}
            </div>
          </div>

          {selectedTest && (
            <>
              {/* Nombre del Examen */}
              <div>
                <Label htmlFor="testName">Nombre del Examen</Label>
                <Input
                  id="testName"
                  value={formData.testName}
                  onChange={(e) => setFormData({ ...formData, testName: e.target.value })}
                  placeholder="Nombre completo del examen"
                />
              </div>

              {/* Resultado y Unidad */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="result">Resultado *</Label>
                  <Input
                    id="result"
                    value={formData.result}
                    onChange={(e) => setFormData({ ...formData, result: e.target.value })}
                    placeholder="Valor del resultado"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="unit">Unidad</Label>
                  <Input
                    id="unit"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="ej: mg/dL, g/dL, %"
                  />
                </div>
              </div>

              {/* Rango de Referencia */}
              <div>
                <Label htmlFor="referenceRange">Rango de Referencia</Label>
                <Input
                  id="referenceRange"
                  value={formData.referenceRange}
                  onChange={(e) => setFormData({ ...formData, referenceRange: e.target.value })}
                  placeholder="ej: 70-100 mg/dL"
                />
              </div>

              {/* Interpretación */}
              <div>
                <Label>Interpretación *</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <Button
                    type="button"
                    variant={formData.interpretation === 'normal' ? 'default' : 'outline'}
                    onClick={() => setFormData({ ...formData, interpretation: 'normal' })}
                    className="bg-green-500 hover:bg-green-600 text-white"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Normal
                  </Button>
                  <Button
                    type="button"
                    variant={formData.interpretation === 'abnormal' ? 'default' : 'outline'}
                    onClick={() => setFormData({ ...formData, interpretation: 'abnormal' })}
                    className="bg-yellow-500 hover:bg-yellow-600 text-white"
                  >
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Anormal
                  </Button>
                  <Button
                    type="button"
                    variant={formData.interpretation === 'critical' ? 'destructive' : 'outline'}
                    onClick={() => setFormData({ ...formData, interpretation: 'critical' })}
                  >
                    <AlertCircle className="mr-2 h-4 w-4" />
                    Crítico
                  </Button>
                </div>
              </div>

              {/* Fecha y Reportado Por */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label htmlFor="resultDate">Fecha del Resultado *</Label>
                  <Input
                    id="resultDate"
                    type="date"
                    value={formData.resultDate}
                    onChange={(e) => setFormData({ ...formData, resultDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="reportedBy">Reportado Por</Label>
                  <Input
                    id="reportedBy"
                    value={formData.reportedBy}
                    onChange={(e) => setFormData({ ...formData, reportedBy: e.target.value })}
                    placeholder="Nombre del profesional"
                  />
                </div>
              </div>
            </>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
            {selectedTest && (
              <Button type="submit" disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar Resultado'}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

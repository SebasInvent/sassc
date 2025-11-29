"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Shield,
  ScanFace,
  ArrowRightLeft,
  DollarSign,
  Heart,
  Clock,
  RefreshCw,
  User,
  Calendar,
  FileText,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import { API_URL } from '@/lib/api';
import { toast } from 'sonner';

interface Resumen {
  firmas: { total: number; mes: number; semana: number };
  remisiones: { total: number; mes: number };
  pagos: { total: number; mes: number };
  seguimientos: { total: number; mes: number };
  topFirmantes: { practitioner: any; cantidad: number }[];
}

interface TimelineItem {
  id: string;
  tipo: string;
  titulo: string;
  descripcion: string;
  fecha: string;
  icono: string;
  color: string;
}

const iconMap: Record<string, any> = {
  ScanFace,
  ArrowRightLeft,
  DollarSign,
  Heart,
};

const colorMap: Record<string, string> = {
  purple: 'bg-purple-100 text-purple-600',
  indigo: 'bg-indigo-100 text-indigo-600',
  emerald: 'bg-emerald-100 text-emerald-600',
  rose: 'bg-rose-100 text-rose-600',
};

export default function AuditoriaPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [firmas, setFirmas] = useState<any[]>([]);
  const [pagos, setPagos] = useState<any[]>([]);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);

    try {
      const [resumenRes, timelineRes, firmasRes, pagosRes] = await Promise.all([
        fetch(`${API_URL}/auditoria/resumen`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/auditoria/timeline?limit=30`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/auditoria/firmas?limit=20`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/auditoria/pagos?limit=20`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (resumenRes.ok) setResumen(await resumenRes.json());
      if (timelineRes.ok) setTimeline(await timelineRes.json());
      if (firmasRes.ok) setFirmas(await firmasRes.json());
      if (pagosRes.ok) setPagos(await pagosRes.json());
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Shield className="h-5 w-5 sm:h-7 sm:w-7 text-slate-600" />
            Auditoría del Sistema
          </h1>
          <p className="text-gray-500 mt-1">Trazabilidad completa de acciones y firmas biométricas</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Firmas Biométricas</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-purple-900">{resumen?.firmas.total || 0}</p>
                <p className="text-xs text-purple-600 mt-1">
                  {resumen?.firmas.mes || 0} este mes
                </p>
              </div>
              <ScanFace className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-50 to-indigo-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-indigo-600 font-medium">Remisiones</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-indigo-900">{resumen?.remisiones.total || 0}</p>
                <p className="text-xs text-indigo-600 mt-1">
                  {resumen?.remisiones.mes || 0} este mes
                </p>
              </div>
              <ArrowRightLeft className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 font-medium">Pagos Procesados</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-emerald-900">{resumen?.pagos.total || 0}</p>
                <p className="text-xs text-emerald-600 mt-1">
                  {resumen?.pagos.mes || 0} este mes
                </p>
              </div>
              <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-rose-50 to-rose-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-rose-600 font-medium">Seguimientos</p>
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-rose-900">{resumen?.seguimientos.total || 0}</p>
                <p className="text-xs text-rose-600 mt-1">
                  {resumen?.seguimientos.mes || 0} este mes
                </p>
              </div>
              <Heart className="h-6 w-6 sm:h-8 sm:w-8 text-rose-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="timeline" className="space-y-4">
        <TabsList className="bg-gray-100">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="firmas">Firmas Biométricas</TabsTrigger>
          <TabsTrigger value="pagos">Pagos</TabsTrigger>
          <TabsTrigger value="firmantes">Top Firmantes</TabsTrigger>
        </TabsList>

        {/* Timeline */}
        <TabsContent value="timeline">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-400" />
                Actividad Reciente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timeline.map((item, index) => {
                  const Icon = iconMap[item.icono] || FileText;
                  const colorClass = colorMap[item.color] || 'bg-gray-100 text-gray-600';

                  return (
                    <div key={item.id} className="flex gap-4">
                      {/* Línea vertical */}
                      <div className="flex flex-col items-center">
                        <div className={`p-2 rounded-lg ${colorClass}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        {index < timeline.length - 1 && (
                          <div className="w-0.5 h-full bg-gray-200 mt-2" />
                        )}
                      </div>

                      {/* Contenido */}
                      <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-900">{item.titulo}</p>
                          <span className="text-xs text-gray-500">{formatDate(item.fecha)}</span>
                        </div>
                        <p className="text-sm text-gray-600">{item.descripcion}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Firmas Biométricas */}
        <TabsContent value="firmas">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScanFace className="h-5 w-5 text-purple-500" />
                Historial de Firmas Biométricas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {firmas.map((firma) => (
                  <div key={firma.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                        <ScanFace className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {firma.practitioner?.firstName} {firma.practitioner?.lastName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {firma.tipoAccion} - {firma.entidadTipo}
                        </p>
                        <p className="text-xs text-gray-400">
                          Lic: {firma.practitioner?.license}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={firma.confianza >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                        {firma.confianza?.toFixed(0) || 0}% confianza
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">{formatDate(firma.fechaFirma)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pagos */}
        <TabsContent value="pagos">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-500" />
                Historial de Pagos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pagos.map((pago) => (
                  <div key={pago.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        pago.estado === 'procesado' ? 'bg-emerald-100' : 
                        pago.estado === 'pendiente' ? 'bg-amber-100' : 'bg-red-100'
                      }`}>
                        {pago.estado === 'procesado' ? (
                          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                        ) : pago.estado === 'pendiente' ? (
                          <Clock className="h-6 w-6 text-amber-600" />
                        ) : (
                          <AlertTriangle className="h-6 w-6 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{pago.concepto}</p>
                        <p className="text-sm text-gray-500">
                          {pago.adresRegional?.nombre} - {pago.adresRegional?.departamento}
                        </p>
                        {pago.firmaBiometrica && (
                          <p className="text-xs text-purple-600 flex items-center gap-1">
                            <ScanFace className="h-3 w-3" />
                            Firmado por {pago.firmaBiometrica.practitioner?.firstName} {pago.firmaBiometrica.practitioner?.lastName}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600">{formatCurrency(pago.monto)}</p>
                      <Badge className={
                        pago.estado === 'procesado' ? 'bg-emerald-100 text-emerald-700' :
                        pago.estado === 'pendiente' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }>
                        {pago.estado}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">{formatDate(pago.fechaPago)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Firmantes */}
        <TabsContent value="firmantes">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Top Firmantes del Mes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {resumen?.topFirmantes.map((item, index) => (
                  <div key={item.practitioner?.id || index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-gray-200 text-gray-700' :
                        index === 2 ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {item.practitioner?.firstName} {item.practitioner?.lastName}
                        </p>
                        <p className="text-sm text-gray-500">Profesional de salud</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl sm:text-2xl font-bold text-purple-600">{item.cantidad}</p>
                      <p className="text-xs text-gray-500">firmas</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

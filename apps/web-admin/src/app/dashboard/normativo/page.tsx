"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  Send,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  FileCheck,
  Pill,
  ClipboardCheck,
  Receipt,
  Building2,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { API_URL } from '@/lib/api';
import { toast } from 'sonner';

interface Stats {
  rips: { total: number; porEstado: any[]; valorTotal: number };
  mipres: { total: number; porEstado: any[] };
  consentimiento: { total: number; firmados: number; pendientes: number };
  facturacion: { total: number; montoTotal: number; conGlosas: number };
}

export default function NormativoPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [rips, setRips] = useState<any[]>([]);
  const [mipres, setMipres] = useState<any[]>([]);
  const [facturas, setFacturas] = useState<any[]>([]);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);

    try {
      const [ripsStats, mipresStats, consentStats, factStats, ripsList, mipresList, facturasList] = await Promise.all([
        fetch('${API_URL}/rips/stats', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('${API_URL}/mipres/stats', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('${API_URL}/consentimiento/stats', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('${API_URL}/facturacion/stats', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('${API_URL}/rips?limit=20', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('${API_URL}/mipres?limit=20', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('${API_URL}/facturacion?limit=20', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const ripsData = ripsStats.ok ? await ripsStats.json() : {};
      const mipresData = mipresStats.ok ? await mipresStats.json() : {};
      const consentData = consentStats.ok ? await consentStats.json() : {};
      const factData = factStats.ok ? await factStats.json() : {};

      setStats({
        rips: ripsData,
        mipres: mipresData,
        consentimiento: consentData,
        facturacion: factData,
      });

      if (ripsList.ok) setRips(await ripsList.json());
      if (mipresList.ok) setMipres(await mipresList.json());
      if (facturasList.ok) setFacturas(await facturasList.json());
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <FileCheck className="h-7 w-7 text-blue-600" />
            Cumplimiento Normativo
          </h1>
          <p className="text-gray-500 mt-1">RIPS, MIPRES, Consentimientos y Facturación Electrónica</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">RIPS</p>
                <p className="text-3xl font-bold text-blue-900">{stats?.rips?.total || 0}</p>
                <p className="text-xs text-blue-600 mt-1">
                  {formatCurrency(stats?.rips?.valorTotal || 0)}
                </p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">MIPRES</p>
                <p className="text-3xl font-bold text-purple-900">{stats?.mipres?.total || 0}</p>
                <p className="text-xs text-purple-600 mt-1">Prescripciones NO PBS</p>
              </div>
              <Pill className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 font-medium">Consentimientos</p>
                <p className="text-3xl font-bold text-emerald-900">{stats?.consentimiento?.firmados || 0}</p>
                <p className="text-xs text-emerald-600 mt-1">
                  {stats?.consentimiento?.pendientes || 0} pendientes
                </p>
              </div>
              <ClipboardCheck className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600 font-medium">Facturas</p>
                <p className="text-3xl font-bold text-amber-900">{stats?.facturacion?.total || 0}</p>
                <p className="text-xs text-amber-600 mt-1">
                  {formatCurrency(stats?.facturacion?.montoTotal || 0)}
                </p>
              </div>
              <Receipt className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="rips" className="space-y-4">
        <TabsList className="bg-gray-100">
          <TabsTrigger value="rips">RIPS</TabsTrigger>
          <TabsTrigger value="mipres">MIPRES</TabsTrigger>
          <TabsTrigger value="facturacion">Facturación</TabsTrigger>
          <TabsTrigger value="info">Normativa</TabsTrigger>
        </TabsList>

        {/* RIPS */}
        <TabsContent value="rips">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-500" />
                Registro Individual de Prestación de Servicios
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rips.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p>No hay registros RIPS</p>
                  <p className="text-sm">Los registros se generan automáticamente desde los encuentros</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rips.slice(0, 10).map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${
                          r.estado === 'validado' ? 'bg-emerald-100' :
                          r.estado === 'enviado' ? 'bg-blue-100' :
                          r.estado === 'rechazado' ? 'bg-red-100' :
                          'bg-gray-100'
                        }`}>
                          <FileText className={`h-5 w-5 ${
                            r.estado === 'validado' ? 'text-emerald-600' :
                            r.estado === 'enviado' ? 'text-blue-600' :
                            r.estado === 'rechazado' ? 'text-red-600' :
                            'text-gray-600'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {r.tipoArchivo} - {r.codigoServicio}
                          </p>
                          <p className="text-sm text-gray-500">
                            Doc: {r.numeroDocumento} | Dx: {r.diagnosticoPrincipal}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{formatCurrency(r.valorTotal)}</p>
                        <Badge className={
                          r.estado === 'validado' ? 'bg-emerald-100 text-emerald-700' :
                          r.estado === 'enviado' ? 'bg-blue-100 text-blue-700' :
                          r.estado === 'rechazado' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }>
                          {r.estado}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* MIPRES */}
        <TabsContent value="mipres">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pill className="h-5 w-5 text-purple-500" />
                Mi Prescripción - Medicamentos NO PBS
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mipres.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Pill className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p>No hay prescripciones MIPRES</p>
                  <p className="text-sm">Se crean para medicamentos fuera del Plan de Beneficios</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {mipres.slice(0, 10).map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${
                          m.estado === 'aprobado' ? 'bg-emerald-100' :
                          m.estado === 'dispensado' ? 'bg-blue-100' :
                          m.estado === 'rechazado' ? 'bg-red-100' :
                          'bg-amber-100'
                        }`}>
                          <Pill className={`h-5 w-5 ${
                            m.estado === 'aprobado' ? 'text-emerald-600' :
                            m.estado === 'dispensado' ? 'text-blue-600' :
                            m.estado === 'rechazado' ? 'text-red-600' :
                            'text-amber-600'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{m.descripcion}</p>
                          <p className="text-sm text-gray-500">
                            {m.patient?.firstName} {m.patient?.lastName} | {m.cantidadPrescrita} unidades
                          </p>
                          {m.numeroPrescripcion && (
                            <p className="text-xs text-purple-600">{m.numeroPrescripcion}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={
                          m.estado === 'aprobado' ? 'bg-emerald-100 text-emerald-700' :
                          m.estado === 'dispensado' ? 'bg-blue-100 text-blue-700' :
                          m.estado === 'rechazado' ? 'bg-red-100 text-red-700' :
                          'bg-amber-100 text-amber-700'
                        }>
                          {m.estado}
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(m.fechaPrescripcion)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Facturación */}
        <TabsContent value="facturacion">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-amber-500" />
                Facturación Electrónica en Salud
              </CardTitle>
            </CardHeader>
            <CardContent>
              {facturas.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Receipt className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p>No hay facturas electrónicas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {facturas.slice(0, 10).map((f: any) => (
                    <div key={f.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${
                          f.estadoDian === 'aceptada' ? 'bg-emerald-100' :
                          f.estadoDian === 'rechazada' ? 'bg-red-100' :
                          'bg-amber-100'
                        }`}>
                          <Receipt className={`h-5 w-5 ${
                            f.estadoDian === 'aceptada' ? 'text-emerald-600' :
                            f.estadoDian === 'rechazada' ? 'text-red-600' :
                            'text-amber-600'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{f.prefijo}-{f.numero}</p>
                          <p className="text-sm text-gray-500">{f.razonSocialReceptor || 'ADRES'}</p>
                          {f.tieneGlosas && (
                            <Badge className="bg-red-100 text-red-700 text-xs">Con glosas</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{formatCurrency(f.total)}</p>
                        <div className="flex gap-1 justify-end mt-1">
                          <Badge className={
                            f.estadoDian === 'aceptada' ? 'bg-emerald-100 text-emerald-700' :
                            f.estadoDian === 'rechazada' ? 'bg-red-100 text-red-700' :
                            'bg-amber-100 text-amber-700'
                          }>
                            DIAN: {f.estadoDian}
                          </Badge>
                          <Badge className={
                            f.estadoPago === 'pagada' ? 'bg-emerald-100 text-emerald-700' :
                            f.estadoPago === 'parcial' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }>
                            {f.estadoPago}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Info Normativa */}
        <TabsContent value="info">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">RIPS - Resolución 3374/2000</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600">
                  Registro Individual de Prestación de Servicios de Salud. Obligatorio para todas las IPS.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm">AF - Archivo de Afiliados</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm">AC - Archivo de Consultas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm">AP - Archivo de Procedimientos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm">AM - Archivo de Medicamentos</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">MIPRES - Resolución 1885/2018</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600">
                  Plataforma para prescripción de tecnologías NO incluidas en el Plan de Beneficios (PBS).
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Pill className="h-4 w-4 text-purple-600" />
                    <span className="text-sm">Medicamentos NO PBS</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Pill className="h-4 w-4 text-purple-600" />
                    <span className="text-sm">Procedimientos especiales</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Pill className="h-4 w-4 text-purple-600" />
                    <span className="text-sm">Dispositivos médicos</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Consentimiento - Ley 1581/2012</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600">
                  Habeas Data y consentimiento informado para tratamiento de datos y procedimientos médicos.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm">Datos personales</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm">Tratamientos médicos</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm">Telemedicina</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Facturación - DIAN + ADRES</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600">
                  Facturación electrónica en salud con validación DIAN y gestión de glosas.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-amber-600" />
                    <span className="text-sm">CUFE - Código Único</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-amber-600" />
                    <span className="text-sm">Validación DIAN</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-amber-600" />
                    <span className="text-sm">Gestión de Glosas</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

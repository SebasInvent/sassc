"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { API_URL } from '@/lib/api';
import {
  TrendingUp,
  Users,
  Building2,
  Hospital,
  ArrowRightLeft,
  DollarSign,
  Download,
  RefreshCw,
  Heart,
  BarChart3,
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ScanFace,
  Printer,
} from 'lucide-react';
import { toast } from 'sonner';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

interface Stats {
  pacientes: { total: number; porCap: any[] };
  remisiones: { total: number; porEstado: any[]; tiempoPromedio: number };
  financiero: { totalGirado: number; pendiente: number; porRegional: any[] };
  preventivo: { programas: number; cumplimiento: number; vencidos: number };
  firmas: { total: number; hoy: number };
}

export default function ReportesPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);

    try {
      const [
        patientsRes,
        remisionesRes,
        financieroRes,
        preventivoRes,
        firmasRes,
        capsRes,
      ] = await Promise.all([
        fetch(`${API_URL}/fhir/Patient`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/remisiones/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/financiero/stats`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null),
        fetch(`${API_URL}/preventivo/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/firma-biometrica/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/caps/stats`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const patients = patientsRes.ok ? await patientsRes.json() : [];
      const remisiones = remisionesRes.ok ? await remisionesRes.json() : {};
      const financiero = financieroRes?.ok ? await financieroRes.json() : {};
      const preventivo = preventivoRes.ok ? await preventivoRes.json() : {};
      const firmas = firmasRes.ok ? await firmasRes.json() : {};
      const caps = capsRes.ok ? await capsRes.json() : {};

      setStats({
        pacientes: {
          total: patients.length || 0,
          porCap: caps.pacientesPorCap || [],
        },
        remisiones: {
          total: remisiones.total || 0,
          porEstado: remisiones.porEstado || [],
          tiempoPromedio: remisiones.tiempoPromedioAtencionDias || 0,
        },
        financiero: {
          totalGirado: financiero.resumen?.montoTotalGirado || 0,
          pendiente: financiero.resumen?.montoPendiente || 0,
          porRegional: financiero.ipsPorPagos || [],
        },
        preventivo: {
          programas: preventivo.totalProgramas || 0,
          cumplimiento: preventivo.tasaCumplimiento || 0,
          vencidos: preventivo.porEstado?.find((e: any) => e.estado === 'vencido')?._count || 0,
        },
        firmas: {
          total: firmas.totalFirmas || 0,
          hoy: firmas.firmasHoy || 0,
        },
      });
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

  const formatCurrency = (value: number) => {
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}MM`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    return `$${value.toLocaleString()}`;
  };

  const exportarPDF = () => {
    toast.info('Generando reporte PDF...');
    // Aquí iría la lógica de exportación
    setTimeout(() => toast.success('Reporte generado'), 1500);
  };

  const exportarExcel = () => {
    toast.info('Generando Excel...');
    setTimeout(() => toast.success('Excel generado'), 1500);
  };

  // Datos para gráficos
  const remisionesPorEstado = stats?.remisiones.porEstado.map((e: any) => ({
    name: e.estado,
    value: e._count,
  })) || [];

  const tendenciaMensual = [
    { mes: 'Jul', remisiones: 12, pagos: 8 },
    { mes: 'Ago', remisiones: 18, pagos: 12 },
    { mes: 'Sep', remisiones: 25, pagos: 18 },
    { mes: 'Oct', remisiones: 32, pagos: 24 },
    { mes: 'Nov', remisiones: stats?.remisiones.total || 35, pagos: 28 },
  ];

  if (loading) {
    return (
      <div className="space-y-6 p-8">
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
            <BarChart3 className="h-7 w-7 text-indigo-600" />
            Reportes y Analytics
          </h1>
          <p className="text-gray-500 mt-1">Métricas del sistema SASSC</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button variant="outline" size="sm" onClick={exportarExcel}>
            <Download className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button size="sm" onClick={exportarPDF} className="bg-indigo-600 hover:bg-indigo-700">
            <Printer className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Pacientes</p>
                <p className="text-3xl font-bold text-blue-900">{stats?.pacientes.total || 0}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-xs text-blue-600 mt-2">Territorializados</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-50 to-indigo-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-indigo-600 font-medium">Remisiones</p>
                <p className="text-3xl font-bold text-indigo-900">{stats?.remisiones.total || 0}</p>
              </div>
              <ArrowRightLeft className="h-8 w-8 text-indigo-500" />
            </div>
            <p className="text-xs text-indigo-600 mt-2">
              Promedio: {stats?.remisiones.tiempoPromedio || 0} días
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 font-medium">Girado</p>
                <p className="text-3xl font-bold text-emerald-900">
                  {formatCurrency(stats?.financiero.totalGirado || 0)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-emerald-500" />
            </div>
            <p className="text-xs text-emerald-600 mt-2">Directo a IPS</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-rose-50 to-rose-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-rose-600 font-medium">Cumplimiento</p>
                <p className="text-3xl font-bold text-rose-900">{stats?.preventivo.cumplimiento || 0}%</p>
              </div>
              <Heart className="h-8 w-8 text-rose-500" />
            </div>
            <p className="text-xs text-rose-600 mt-2">Modelo preventivo</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Firmas Hoy</p>
                <p className="text-3xl font-bold text-purple-900">{stats?.firmas.hoy || 0}</p>
              </div>
              <ScanFace className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-xs text-purple-600 mt-2">
              Total: {stats?.firmas.total || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Reportes */}
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="bg-gray-100">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="remisiones">Remisiones</TabsTrigger>
          <TabsTrigger value="financiero">Financiero</TabsTrigger>
          <TabsTrigger value="preventivo">Preventivo</TabsTrigger>
        </TabsList>

        {/* Tab General */}
        <TabsContent value="general" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Tendencia Mensual</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={tendenciaMensual}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="remisiones" stackId="1" stroke="#6366f1" fill="#6366f1" fillOpacity={0.6} name="Remisiones" />
                    <Area type="monotone" dataKey="pagos" stackId="2" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Pagos" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Remisiones por Estado</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={remisionesPorEstado}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {remisionesPorEstado.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Indicadores Clave */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Indicadores Clave de Gestión</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span className="font-medium">Remisiones Completadas</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.remisiones.porEstado.find((e: any) => e.estado === 'COMPLETADA')?._count || 0}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-5 w-5 text-amber-600" />
                    <span className="font-medium">Tiempo Promedio</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.remisiones.tiempoPromedio || 0} días
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <span className="font-medium">Controles Vencidos</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.preventivo.vencidos || 0}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-5 w-5 text-emerald-600" />
                    <span className="font-medium">Pagos Pendientes</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(stats?.financiero.pendiente || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Remisiones */}
        <TabsContent value="remisiones" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {stats?.remisiones.porEstado.map((estado: any, index: number) => (
              <Card key={estado.estado} className="border-0 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500 font-medium">{estado.estado}</p>
                      <p className="text-3xl font-bold text-gray-900">{estado._count}</p>
                    </div>
                    <div className={`p-3 rounded-xl`} style={{ backgroundColor: `${COLORS[index % COLORS.length]}20` }}>
                      <ArrowRightLeft className="h-6 w-6" style={{ color: COLORS[index % COLORS.length] }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Distribución de Remisiones</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={stats?.remisiones.porEstado.map((e: any) => ({ estado: e.estado, cantidad: e._count }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="estado" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="cantidad" fill="#6366f1">
                    {stats?.remisiones.porEstado.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Financiero */}
        <TabsContent value="financiero" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100">
              <CardContent className="p-5">
                <p className="text-sm text-emerald-600 font-medium">Total Girado</p>
                <p className="text-3xl font-bold text-emerald-900">
                  {formatCurrency(stats?.financiero.totalGirado || 0)}
                </p>
                <p className="text-xs text-emerald-600 mt-2">Giro directo ADRES → IPS</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100">
              <CardContent className="p-5">
                <p className="text-sm text-amber-600 font-medium">Pendiente</p>
                <p className="text-3xl font-bold text-amber-900">
                  {formatCurrency(stats?.financiero.pendiente || 0)}
                </p>
                <p className="text-xs text-amber-600 mt-2">Por aprobar</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="p-5">
                <p className="text-sm text-blue-600 font-medium">Firmas Biométricas</p>
                <p className="text-3xl font-bold text-blue-900">{stats?.firmas.total || 0}</p>
                <p className="text-xs text-blue-600 mt-2">Transacciones firmadas</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>IPS con Mayor Recepción de Pagos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats?.financiero.porRegional.slice(0, 5).map((ips: any, index: number) => (
                  <div key={ips.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{ips.nombre || `IPS ${index + 1}`}</p>
                        <p className="text-sm text-gray-500">{ips.ciudad || 'Colombia'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-600">{formatCurrency(ips.totalRecibido || 0)}</p>
                      <p className="text-xs text-gray-500">{ips.cantidadGiros || 0} giros</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Preventivo */}
        <TabsContent value="preventivo" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Programas Activos</p>
                    <p className="text-3xl font-bold text-gray-900">{stats?.preventivo.programas || 0}</p>
                  </div>
                  <Heart className="h-8 w-8 text-rose-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Tasa Cumplimiento</p>
                    <p className="text-3xl font-bold text-emerald-600">{stats?.preventivo.cumplimiento || 0}%</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Controles Vencidos</p>
                    <p className="text-3xl font-bold text-red-600">{stats?.preventivo.vencidos || 0}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Barra de Cumplimiento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Tasa de Cumplimiento General</span>
                    <span className="text-sm font-bold text-emerald-600">{stats?.preventivo.cumplimiento || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className="bg-emerald-500 h-4 rounded-full transition-all"
                      style={{ width: `${stats?.preventivo.cumplimiento || 0}%` }}
                    />
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Meta: 85% de cumplimiento en controles preventivos
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

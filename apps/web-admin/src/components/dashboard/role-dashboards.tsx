"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Building2,
  Hospital,
  ArrowRightLeft,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Activity,
  FileText,
  Stethoscope,
  MapPin,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { API_URL } from '@/lib/api';

// ============================================
// DASHBOARD PARA MÉDICO DE CAP
// ============================================
export function MedicoCapDashboard() {
  const { token, user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [remisionesPendientes, setRemisionesPendientes] = useState<any[]>([]);
  const [pacientesHoy, setPacientesHoy] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    try {
      // Obtener estadísticas del CAP del médico
      const [remisionesRes, citasRes] = await Promise.all([
        fetch(`${API_URL}/remisiones?estado=SOLICITADA`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/fhir/Appointment`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (remisionesRes.ok) {
        const data = await remisionesRes.json();
        setRemisionesPendientes(data.slice(0, 5));
      }

      if (citasRes.ok) {
        const data = await citasRes.json();
        setPacientesHoy(data.slice(0, 5));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header personalizado */}
      <div className="bg-gradient-to-r from-cyan-600 to-teal-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-xl">
            <Building2 className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Centro de Atención Primaria</h1>
            <p className="text-cyan-100">Dr. {user?.name} - {user?.specialty}</p>
          </div>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/dashboard/remisiones/nueva">
          <Card className="border-0 shadow-sm hover:shadow-lg transition-all cursor-pointer bg-gradient-to-br from-indigo-50 to-indigo-100 group">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-indigo-500 rounded-xl group-hover:scale-110 transition-transform">
                <ArrowRightLeft className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-indigo-900">Nueva Remisión</p>
                <p className="text-sm text-indigo-600">Remitir paciente a IPS</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/patients">
          <Card className="border-0 shadow-sm hover:shadow-lg transition-all cursor-pointer bg-gradient-to-br from-blue-50 to-blue-100 group">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-blue-500 rounded-xl group-hover:scale-110 transition-transform">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-blue-900">Mis Pacientes</p>
                <p className="text-sm text-blue-600">Ver pacientes asignados</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/appointments">
          <Card className="border-0 shadow-sm hover:shadow-lg transition-all cursor-pointer bg-gradient-to-br from-emerald-50 to-emerald-100 group">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="p-3 bg-emerald-500 rounded-xl group-hover:scale-110 transition-transform">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-emerald-900">Agenda del Día</p>
                <p className="text-sm text-emerald-600">Ver citas programadas</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Remisiones pendientes de seguimiento */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-600" />
            Remisiones Pendientes de Aprobación
          </CardTitle>
          <Link href="/dashboard/remisiones">
            <Button variant="outline" size="sm">
              Ver todas <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {remisionesPendientes.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No hay remisiones pendientes</p>
          ) : (
            <div className="space-y-3">
              {remisionesPendientes.map((rem: any) => (
                <div key={rem.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {rem.patient?.firstName} {rem.patient?.lastName}
                      </p>
                      <p className="text-sm text-gray-500">{rem.diagnostico}</p>
                    </div>
                  </div>
                  <Badge className={rem.prioridad === 'urgente' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>
                    {rem.prioridad}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// DASHBOARD PARA DIRECTOR DE IPS
// ============================================
export function DirectorIpsDashboard() {
  const { token, user } = useAuth();
  const [remisionesEntrantes, setRemisionesEntrantes] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    try {
      const [remisionesRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/remisiones`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/remisiones/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (remisionesRes.ok) {
        const data = await remisionesRes.json();
        // Filtrar las que están aprobadas o en proceso (entrantes a la IPS)
        setRemisionesEntrantes(data.filter((r: any) => 
          r.estado === 'APROBADA' || r.estado === 'EN_PROCESO'
        ).slice(0, 5));
      }

      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header personalizado */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-xl">
            <Hospital className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Institución Prestadora de Servicios</h1>
            <p className="text-purple-100">Director: {user?.name}</p>
          </div>
        </div>
      </div>

      {/* KPIs de la IPS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600 font-medium">Remisiones Entrantes</p>
                <p className="text-2xl font-bold text-amber-900">
                  {remisionesEntrantes.length}
                </p>
              </div>
              <div className="p-3 bg-amber-500 rounded-xl">
                <ArrowRightLeft className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Urgentes</p>
                <p className="text-2xl font-bold text-red-900">
                  {remisionesEntrantes.filter((r: any) => r.prioridad === 'urgente').length}
                </p>
              </div>
              <div className="p-3 bg-red-500 rounded-xl">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 font-medium">Completadas Hoy</p>
                <p className="text-2xl font-bold text-emerald-900">
                  {stats?.porEstado?.find((s: any) => s.estado === 'COMPLETADA')?._count || 0}
                </p>
              </div>
              <div className="p-3 bg-emerald-500 rounded-xl">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Tiempo Promedio</p>
                <p className="text-2xl font-bold text-blue-900">
                  {stats?.tiempoPromedioAtencionDias || '0'} días
                </p>
              </div>
              <div className="p-3 bg-blue-500 rounded-xl">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Remisiones entrantes */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-purple-600" />
            Pacientes Remitidos a esta IPS
          </CardTitle>
          <Link href="/dashboard/remisiones">
            <Button variant="outline" size="sm">
              Ver todas <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {remisionesEntrantes.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No hay remisiones entrantes</p>
          ) : (
            <div className="space-y-3">
              {remisionesEntrantes.map((rem: any) => (
                <Link key={rem.id} href={`/dashboard/remisiones/${rem.id}`}>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        rem.prioridad === 'urgente' ? 'bg-red-100' :
                        rem.prioridad === 'prioritario' ? 'bg-amber-100' : 'bg-blue-100'
                      }`}>
                        <Stethoscope className={`h-6 w-6 ${
                          rem.prioridad === 'urgente' ? 'text-red-600' :
                          rem.prioridad === 'prioritario' ? 'text-amber-600' : 'text-blue-600'
                        }`} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {rem.patient?.firstName} {rem.patient?.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{rem.especialidadRequerida}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                          <Building2 className="h-3 w-3" />
                          Desde: {rem.capOrigen?.nombre}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={
                        rem.prioridad === 'urgente' ? 'bg-red-500 text-white' :
                        rem.prioridad === 'prioritario' ? 'bg-amber-500 text-white' : 
                        'bg-gray-200 text-gray-700'
                      }>
                        {rem.prioridad.toUpperCase()}
                      </Badge>
                      <p className="text-xs text-gray-500 mt-2">
                        {rem.estado === 'APROBADA' ? 'Pendiente atención' : 'En proceso'}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// DASHBOARD PARA ADMINISTRADOR
// ============================================
export function AdminDashboard() {
  const { token } = useAuth();
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    try {
      const [kpisRes, remisionesStatsRes, capsRes, ipsRes] = await Promise.all([
        fetch(`${API_URL}/dashboard/kpis`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/remisiones/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/caps/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/ips/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const data: any = {};
      if (kpisRes.ok) data.kpis = await kpisRes.json();
      if (remisionesStatsRes.ok) data.remisiones = await remisionesStatsRes.json();
      if (capsRes.ok) data.caps = await capsRes.json();
      if (ipsRes.ok) data.ips = await ipsRes.json();

      setGlobalStats(data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Admin */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Activity className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Panel de Administración</h1>
              <p className="text-gray-300">Vista global del sistema SASSC</p>
            </div>
          </div>
          <Badge className="bg-emerald-500 text-white px-3 py-1">
            Sistema Operativo
          </Badge>
        </div>
      </div>

      {/* KPIs Globales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Pacientes</p>
                <p className="text-2xl font-bold text-blue-900">
                  {globalStats?.kpis?.totalPatients || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-500 rounded-xl">
                <Users className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-cyan-50 to-cyan-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-cyan-600 font-medium">CAPs Activos</p>
                <p className="text-2xl font-bold text-cyan-900">
                  {globalStats?.caps?.totalCaps || 0}
                </p>
              </div>
              <div className="p-3 bg-cyan-500 rounded-xl">
                <Building2 className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">IPS Registradas</p>
                <p className="text-2xl font-bold text-purple-900">
                  {globalStats?.ips?.totalIps || 0}
                </p>
              </div>
              <div className="p-3 bg-purple-500 rounded-xl">
                <Hospital className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-50 to-indigo-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-indigo-600 font-medium">Remisiones Activas</p>
                <p className="text-2xl font-bold text-indigo-900">
                  {globalStats?.remisiones?.total || 0}
                </p>
              </div>
              <div className="p-3 bg-indigo-500 rounded-xl">
                <ArrowRightLeft className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accesos rápidos Admin */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/dashboard/caps">
          <Card className="border-0 shadow-sm hover:shadow-lg transition-all cursor-pointer group">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-cyan-100 rounded-xl group-hover:bg-cyan-200 transition-colors">
                  <Building2 className="h-6 w-6 text-cyan-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">Gestionar CAPs</p>
                  <p className="text-sm text-gray-500">Centros de Atención Primaria</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/ips">
          <Card className="border-0 shadow-sm hover:shadow-lg transition-all cursor-pointer group">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition-colors">
                  <Hospital className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">Gestionar IPS</p>
                  <p className="text-sm text-gray-500">Hospitales y Clínicas</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/remisiones">
          <Card className="border-0 shadow-sm hover:shadow-lg transition-all cursor-pointer group">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-100 rounded-xl group-hover:bg-indigo-200 transition-colors">
                  <ArrowRightLeft className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">Ver Remisiones</p>
                  <p className="text-sm text-gray-500">Sistema de territorialización</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Alertas del sistema */}
      {globalStats?.remisiones?.alertasPaseoMuerte > 0 && (
        <Card className="border-0 shadow-sm border-l-4 border-l-red-500 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <div>
                <p className="font-semibold text-red-900">
                  ⚠️ Alerta: {globalStats.remisiones.alertasPaseoMuerte} remisiones con riesgo de "paseo de la muerte"
                </p>
                <p className="text-sm text-red-700">
                  Pacientes con más de 48 horas sin atención después de ser remitidos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

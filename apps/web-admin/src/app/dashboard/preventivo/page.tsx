"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  Users, 
  Calendar, 
  Syringe, 
  AlertTriangle, 
  CheckCircle2,
  Clock,
  Phone,
  User,
  Building2,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { API_URL } from '@/lib/api';
import { toast } from 'sonner';

interface Programa {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  tipo: string;
  frecuenciaMeses: number;
  _count: { seguimientos: number };
}

interface Seguimiento {
  id: string;
  fechaProgramada: string;
  fechaRealizada?: string;
  estado: string;
  programa: { nombre: string; tipo: string };
  patient?: {
    firstName: string;
    lastName: string;
    docNumber: string;
    phone?: string;
    capAsignado?: { nombre: string };
  };
}

interface Alertas {
  vencidos: Seguimiento[];
  proximos: Seguimiento[];
  resumen: { totalVencidos: number; totalProximos: number };
}

interface Stats {
  totalProgramas: number;
  totalSeguimientos: number;
  tasaCumplimiento: number;
  porEstado: { estado: string; _count: number }[];
}

const tipoIcons: Record<string, any> = {
  vacunacion: Syringe,
  control_prenatal: Heart,
  tamizaje_cancer: Users,
  control_cronico: Clock,
  salud_oral: CheckCircle2,
  crecimiento_desarrollo: User,
};

const tipoColors: Record<string, string> = {
  vacunacion: 'bg-blue-100 text-blue-700',
  control_prenatal: 'bg-pink-100 text-pink-700',
  tamizaje_cancer: 'bg-purple-100 text-purple-700',
  control_cronico: 'bg-amber-100 text-amber-700',
  salud_oral: 'bg-cyan-100 text-cyan-700',
  crecimiento_desarrollo: 'bg-emerald-100 text-emerald-700',
};

export default function PreventivoPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [programas, setProgramas] = useState<Programa[]>([]);
  const [alertas, setAlertas] = useState<Alertas | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [programasRes, alertasRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/preventivo/programas`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/preventivo/alertas`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/preventivo/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (programasRes.ok) setProgramas(await programasRes.json());
      if (alertasRes.ok) setAlertas(await alertasRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const completarSeguimiento = async (id: string) => {
    try {
      const res = await fetch(`${API_URL}/preventivo/seguimientos/${id}/completar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ resultado: 'Normal', notas: 'Control realizado' }),
      });
      if (res.ok) {
        toast.success('Seguimiento completado');
        fetchData();
      }
    } catch (error) {
      toast.error('Error al completar');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
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

  const pendientes = stats?.porEstado.find(e => e.estado === 'pendiente')?._count || 0;
  const vencidos = stats?.porEstado.find(e => e.estado === 'vencido')?._count || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Heart className="h-7 w-7 text-rose-600" />
            Modelo Preventivo
          </h1>
          <p className="text-gray-500 mt-1">Programas de prevención y seguimiento poblacional</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-rose-50 to-pink-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-rose-600 font-medium">Programas Activos</p>
                <p className="text-3xl font-bold text-rose-900">{stats?.totalProgramas || 0}</p>
              </div>
              <div className="p-3 bg-rose-500 rounded-xl">
                <Heart className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-green-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-emerald-600 font-medium">Tasa Cumplimiento</p>
                <p className="text-3xl font-bold text-emerald-900">{stats?.tasaCumplimiento || 0}%</p>
              </div>
              <div className="p-3 bg-emerald-500 rounded-xl">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-orange-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-amber-600 font-medium">Controles Pendientes</p>
                <p className="text-3xl font-bold text-amber-900">{pendientes}</p>
              </div>
              <div className="p-3 bg-amber-500 rounded-xl">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Controles Vencidos</p>
                <p className="text-3xl font-bold text-red-900">{vencidos}</p>
              </div>
              <div className="p-3 bg-red-500 rounded-xl">
                <AlertTriangle className="h-6 w-6 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {alertas && (alertas.vencidos.length > 0 || alertas.proximos.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Vencidos */}
          {alertas.vencidos.length > 0 && (
            <Card className="border-0 shadow-sm border-l-4 border-l-red-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-red-700">
                  <AlertTriangle className="h-5 w-5" />
                  Controles Vencidos ({alertas.vencidos.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-80 overflow-y-auto">
                {alertas.vencidos.map((seg) => (
                  <div key={seg.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                        <User className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {seg.patient?.firstName} {seg.patient?.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{seg.programa.nombre}</p>
                        <p className="text-xs text-red-600">Vencido: {formatDate(seg.fechaProgramada)}</p>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="text-emerald-600 border-emerald-200"
                      onClick={() => completarSeguimiento(seg.id)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Completar
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Próximos */}
          {alertas.proximos.length > 0 && (
            <Card className="border-0 shadow-sm border-l-4 border-l-amber-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-amber-700">
                  <Calendar className="h-5 w-5" />
                  Próximos 7 Días ({alertas.proximos.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-80 overflow-y-auto">
                {alertas.proximos.map((seg) => (
                  <div key={seg.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                        <User className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {seg.patient?.firstName} {seg.patient?.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{seg.programa.nombre}</p>
                        <p className="text-xs text-amber-600">Fecha: {formatDate(seg.fechaProgramada)}</p>
                      </div>
                    </div>
                    {seg.patient?.phone && (
                      <Button size="sm" variant="outline">
                        <Phone className="h-4 w-4 mr-1" />
                        Llamar
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Programas */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Syringe className="h-5 w-5 text-gray-400" />
            Programas de Prevención
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {programas.map((p) => {
              const Icon = tipoIcons[p.tipo] || Heart;
              const colorClass = tipoColors[p.tipo] || 'bg-gray-100 text-gray-700';
              
              return (
                <div key={p.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className={`p-3 rounded-xl ${colorClass.split(' ')[0]}`}>
                    <Icon className={`h-6 w-6 ${colorClass.split(' ')[1]}`} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{p.nombre}</p>
                    <p className="text-sm text-gray-500">{p.descripcion}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        Cada {p.frecuenciaMeses} meses
                      </Badge>
                      <Badge className={colorClass}>
                        {p._count?.seguimientos || 0} seguimientos
                      </Badge>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

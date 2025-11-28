"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRightLeft,
  Search,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  User,
  Building2,
  Hospital,
  Filter,
} from 'lucide-react';

interface Remision {
  id: string;
  codigo: string;
  diagnostico: string;
  motivoRemision: string;
  especialidadRequerida: string;
  prioridad: string;
  estado: string;
  fechaSolicitud: string;
  fechaAprobacion?: string;
  fechaAtencion?: string;
  notas?: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    docNumber: string;
  };
  capOrigen: {
    id: string;
    nombre: string;
    ciudad: string;
  };
  ipsDestino: {
    id: string;
    nombre: string;
    ciudad: string;
    nivelComplejidad: string;
  };
}

interface Stats {
  total: number;
  porEstado: { estado: string; _count: number }[];
  porPrioridad: { prioridad: string; _count: number }[];
  tiempoPromedioAtencionDias: string;
  alertasPaseoMuerte: number;
}

const estadoConfig: Record<string, { label: string; color: string; icon: any }> = {
  SOLICITADA: { label: 'Solicitada', color: 'bg-blue-100 text-blue-700', icon: Clock },
  APROBADA: { label: 'Aprobada', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  RECHAZADA: { label: 'Rechazada', color: 'bg-red-100 text-red-700', icon: XCircle },
  EN_PROCESO: { label: 'En Proceso', color: 'bg-amber-100 text-amber-700', icon: ArrowRightLeft },
  COMPLETADA: { label: 'Completada', color: 'bg-gray-100 text-gray-700', icon: CheckCircle2 },
  CANCELADA: { label: 'Cancelada', color: 'bg-gray-100 text-gray-500', icon: XCircle },
};

const prioridadConfig: Record<string, { label: string; color: string }> = {
  urgente: { label: 'Urgente', color: 'bg-red-500 text-white' },
  prioritario: { label: 'Prioritario', color: 'bg-amber-500 text-white' },
  normal: { label: 'Normal', color: 'bg-gray-200 text-gray-700' },
};

export default function RemisionesPage() {
  const { token } = useAuth();
  const [remisiones, setRemisiones] = useState<Remision[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterPrioridad, setFilterPrioridad] = useState('');

  useEffect(() => {
    fetchRemisiones();
    fetchStats();
  }, [token]);

  const fetchRemisiones = async () => {
    try {
      const response = await fetch('http://localhost:3001/remisiones', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setRemisiones(data);
      }
    } catch (error) {
      console.error('Error fetching remisiones:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:3001/remisiones/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const filteredRemisiones = remisiones.filter(rem => {
    const matchesSearch = 
      rem.codigo.toLowerCase().includes(search.toLowerCase()) ||
      rem.patient.firstName.toLowerCase().includes(search.toLowerCase()) ||
      rem.patient.lastName.toLowerCase().includes(search.toLowerCase()) ||
      rem.patient.docNumber.includes(search);
    const matchesEstado = !filterEstado || rem.estado === filterEstado;
    const matchesPrioridad = !filterPrioridad || rem.prioridad === filterPrioridad;
    return matchesSearch && matchesEstado && matchesPrioridad;
  });

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
        <div className="flex items-center justify-between">
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />
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
            <ArrowRightLeft className="h-7 w-7 text-indigo-600" />
            Sistema de Remisiones
          </h1>
          <p className="text-gray-500 mt-1">Gestión de remisiones CAP → IPS (Territorialización)</p>
        </div>
        <Link href="/dashboard/remisiones/nueva">
          <Button className="bg-gray-900 hover:bg-gray-800">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Remisión
          </Button>
        </Link>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-50 to-indigo-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-indigo-600 font-medium">Total Remisiones</p>
                  <p className="text-2xl font-bold text-indigo-900">{stats.total}</p>
                </div>
                <div className="p-3 bg-indigo-500 rounded-xl">
                  <ArrowRightLeft className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-600 font-medium">Tiempo Promedio</p>
                  <p className="text-2xl font-bold text-emerald-900">{stats.tiempoPromedioAtencionDias} días</p>
                </div>
                <div className="p-3 bg-emerald-500 rounded-xl">
                  <Clock className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="text-xs text-emerald-600 mt-2">
                Desde solicitud hasta atención
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-600 font-medium">Por Estado</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {stats.porEstado.slice(0, 3).map(e => (
                      <Badge key={e.estado} variant="outline" className="text-xs">
                        {estadoConfig[e.estado]?.label || e.estado}: {e._count}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alerta Paseo de la Muerte */}
          <Card className={`border-0 shadow-sm ${stats.alertasPaseoMuerte > 0 ? 'bg-gradient-to-br from-red-50 to-red-100' : 'bg-gradient-to-br from-gray-50 to-gray-100'}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${stats.alertasPaseoMuerte > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    ⚠️ Paseo de la Muerte
                  </p>
                  <p className={`text-2xl font-bold ${stats.alertasPaseoMuerte > 0 ? 'text-red-900' : 'text-gray-900'}`}>
                    {stats.alertasPaseoMuerte}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${stats.alertasPaseoMuerte > 0 ? 'bg-red-500' : 'bg-gray-400'}`}>
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className={`text-xs mt-2 ${stats.alertasPaseoMuerte > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                Remisiones pendientes +7 días
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por código o paciente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11"
          />
        </div>
        <select
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value)}
          className="h-11 px-4 rounded-lg border border-gray-200 bg-white text-sm"
        >
          <option value="">Todos los estados</option>
          {Object.entries(estadoConfig).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          value={filterPrioridad}
          onChange={(e) => setFilterPrioridad(e.target.value)}
          className="h-11 px-4 rounded-lg border border-gray-200 bg-white text-sm"
        >
          <option value="">Todas las prioridades</option>
          {Object.entries(prioridadConfig).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Remisiones List */}
      {filteredRemisiones.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <ArrowRightLeft className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay remisiones</h3>
            <p className="text-gray-500 mb-4">Las remisiones de CAP a IPS aparecerán aquí</p>
            <Button className="bg-gray-900 hover:bg-gray-800">
              <Plus className="h-4 w-4 mr-2" />
              Crear Remisión
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRemisiones.map((rem) => {
            const estadoInfo = estadoConfig[rem.estado] || { label: rem.estado, color: 'bg-gray-100 text-gray-700', icon: Clock };
            const prioridadInfo = prioridadConfig[rem.prioridad] || { label: rem.prioridad, color: 'bg-gray-200 text-gray-700' };
            const EstadoIcon = estadoInfo.icon;

            return (
              <Card key={rem.id} className="border-0 shadow-sm hover:shadow-md transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Prioridad indicator */}
                    <div className={`w-1 h-16 rounded-full ${
                      rem.prioridad === 'urgente' ? 'bg-red-500' :
                      rem.prioridad === 'prioritario' ? 'bg-amber-500' : 'bg-gray-300'
                    }`} />

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-sm text-gray-500">{rem.codigo}</span>
                        <Badge className={estadoInfo.color}>
                          <EstadoIcon className="h-3 w-3 mr-1" />
                          {estadoInfo.label}
                        </Badge>
                        <Badge className={prioridadInfo.color}>
                          {prioridadInfo.label}
                        </Badge>
                      </div>

                      {/* Patient */}
                      <div className="flex items-center gap-2 text-sm mb-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-gray-900">
                          {rem.patient.firstName} {rem.patient.lastName}
                        </span>
                        <span className="text-gray-400">·</span>
                        <span className="text-gray-500 font-mono">{rem.patient.docNumber}</span>
                      </div>

                      {/* CAP → IPS */}
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Building2 className="h-4 w-4 text-blue-500" />
                        <span>{rem.capOrigen.nombre}</span>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                        <Hospital className="h-4 w-4 text-purple-500" />
                        <span>{rem.ipsDestino.nombre}</span>
                        <Badge variant="outline" className="text-xs ml-1">
                          {rem.ipsDestino.nivelComplejidad.replace('NIVEL_', 'Nivel ')}
                        </Badge>
                      </div>

                      {/* Especialidad y diagnóstico */}
                      <div className="mt-2 text-sm">
                        <span className="text-gray-500">Especialidad:</span>{' '}
                        <span className="font-medium capitalize">{rem.especialidadRequerida}</span>
                        <span className="text-gray-400 mx-2">·</span>
                        <span className="text-gray-500">Dx:</span>{' '}
                        <span className="text-gray-700">{rem.diagnostico}</span>
                      </div>
                    </div>

                    {/* Date and actions */}
                    <div className="text-right">
                      <p className="text-sm text-gray-500">{formatDate(rem.fechaSolicitud)}</p>
                      <Button variant="outline" size="sm" className="mt-2">
                        Ver detalle
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

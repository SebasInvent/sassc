"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Building2,
  Search,
  Plus,
  MapPin,
  Users,
  Phone,
  Clock,
  Stethoscope,
  Activity,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface CAP {
  id: string;
  codigo: string;
  nombre: string;
  direccion: string;
  ciudad: string;
  departamento: string;
  telefono?: string;
  horarioApertura?: string;
  horarioCierre?: string;
  poblacionAsignada: number;
  poblacionActual: number;
  activo: boolean;
  tieneOdontologia: boolean;
  tieneVacunacion: boolean;
  tieneLaboratorio: boolean;
  tieneUrgencias: boolean;
  _count?: {
    pacientes: number;
    personal: number;
    citas: number;
  };
}

interface Stats {
  totalCaps: number;
  capsActivos: number;
  capsInactivos: number;
  totalPacientesAsignados: number;
  totalPersonal: number;
  citasHoy: number;
}

export default function CapsPage() {
  const { token } = useAuth();
  const [caps, setCaps] = useState<CAP[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDepartamento, setFilterDepartamento] = useState('');

  useEffect(() => {
    fetchCaps();
    fetchStats();
  }, [token]);

  const fetchCaps = async () => {
    try {
      const response = await fetch('http://localhost:3001/caps', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCaps(data);
      }
    } catch (error) {
      console.error('Error fetching CAPs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:3001/caps/stats', {
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

  const filteredCaps = caps.filter(cap => {
    const matchesSearch = 
      cap.nombre.toLowerCase().includes(search.toLowerCase()) ||
      cap.codigo.toLowerCase().includes(search.toLowerCase()) ||
      cap.ciudad.toLowerCase().includes(search.toLowerCase());
    const matchesDepartamento = !filterDepartamento || cap.departamento === filterDepartamento;
    return matchesSearch && matchesDepartamento;
  });

  const departamentos = [...new Set(caps.map(c => c.departamento))].sort();

  const getOcupacion = (cap: CAP) => {
    return ((cap.poblacionActual / cap.poblacionAsignada) * 100).toFixed(0);
  };

  const getOcupacionColor = (cap: CAP) => {
    const ocupacion = (cap.poblacionActual / cap.poblacionAsignada) * 100;
    if (ocupacion >= 90) return 'text-red-600 bg-red-50';
    if (ocupacion >= 70) return 'text-amber-600 bg-amber-50';
    return 'text-emerald-600 bg-emerald-50';
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-48 bg-gray-200 rounded-xl animate-pulse" />
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
            <Building2 className="h-7 w-7 text-blue-600" />
            Centros de Atención Primaria
          </h1>
          <p className="text-gray-500 mt-1">Gestión de CAPs - Puerta de entrada al sistema de salud</p>
        </div>
        <Button className="bg-gray-900 hover:bg-gray-800">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo CAP
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Total CAPs</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.totalCaps}</p>
                </div>
                <div className="p-3 bg-blue-500 rounded-xl">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                {stats.capsActivos} activos · {stats.capsInactivos} inactivos
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-600 font-medium">Pacientes Asignados</p>
                  <p className="text-2xl font-bold text-emerald-900">{stats.totalPacientesAsignados.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-emerald-500 rounded-xl">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="text-xs text-emerald-600 mt-2">
                Territorializados en CAPs
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">Personal de Salud</p>
                  <p className="text-2xl font-bold text-purple-900">{stats.totalPersonal}</p>
                </div>
                <div className="p-3 bg-purple-500 rounded-xl">
                  <Stethoscope className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="text-xs text-purple-600 mt-2">
                Médicos, enfermeros, odontólogos
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-600 font-medium">Citas Hoy</p>
                  <p className="text-2xl font-bold text-amber-900">{stats.citasHoy}</p>
                </div>
                <div className="p-3 bg-amber-500 rounded-xl">
                  <Activity className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="text-xs text-amber-600 mt-2">
                Atenciones programadas
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
            placeholder="Buscar por nombre, código o ciudad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11"
          />
        </div>
        <select
          value={filterDepartamento}
          onChange={(e) => setFilterDepartamento(e.target.value)}
          className="h-11 px-4 rounded-lg border border-gray-200 bg-white text-sm"
        >
          <option value="">Todos los departamentos</option>
          {departamentos.map(dep => (
            <option key={dep} value={dep}>{dep}</option>
          ))}
        </select>
      </div>

      {/* CAPs Grid */}
      {filteredCaps.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay CAPs registrados</h3>
            <p className="text-gray-500 mb-4">Comienza creando el primer Centro de Atención Primaria</p>
            <Button className="bg-gray-900 hover:bg-gray-800">
              <Plus className="h-4 w-4 mr-2" />
              Crear CAP
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCaps.map((cap) => (
            <Link key={cap.id} href={`/dashboard/caps/${cap.id}`}>
              <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                <CardContent className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-400">{cap.codigo}</span>
                        <Badge 
                          variant="outline" 
                          className={cap.activo ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 'border-gray-200 text-gray-500'}
                        >
                          {cap.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {cap.nombre}
                      </h3>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-blue-500 transition-colors" />
                  </div>

                  {/* Location */}
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                    <MapPin className="h-4 w-4" />
                    <span>{cap.ciudad}, {cap.departamento}</span>
                  </div>

                  {/* Ocupación */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-500">Ocupación</span>
                      <span className={`font-medium px-2 py-0.5 rounded ${getOcupacionColor(cap)}`}>
                        {getOcupacion(cap)}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          parseInt(getOcupacion(cap)) >= 90 ? 'bg-red-500' :
                          parseInt(getOcupacion(cap)) >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(parseInt(getOcupacion(cap)), 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {cap.poblacionActual.toLocaleString()} / {cap.poblacionAsignada.toLocaleString()} pacientes
                    </p>
                  </div>

                  {/* Services */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {cap.tieneOdontologia && (
                      <Badge variant="secondary" className="text-xs bg-blue-50 text-blue-700">Odontología</Badge>
                    )}
                    {cap.tieneVacunacion && (
                      <Badge variant="secondary" className="text-xs bg-green-50 text-green-700">Vacunación</Badge>
                    )}
                    {cap.tieneLaboratorio && (
                      <Badge variant="secondary" className="text-xs bg-purple-50 text-purple-700">Laboratorio</Badge>
                    )}
                    {cap.tieneUrgencias && (
                      <Badge variant="secondary" className="text-xs bg-red-50 text-red-700">Urgencias</Badge>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-500">
                    {cap.telefono && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {cap.telefono}
                      </div>
                    )}
                    {cap.horarioApertura && cap.horarioCierre && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {cap.horarioApertura} - {cap.horarioCierre}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

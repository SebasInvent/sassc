"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Hospital,
  Search,
  Plus,
  MapPin,
  Users,
  Phone,
  Bed,
  Stethoscope,
  Activity,
  ChevronRight,
  Layers,
} from 'lucide-react';

interface IPS {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  nivelComplejidad: string;
  direccion: string;
  ciudad: string;
  departamento: string;
  telefono?: string;
  numeroCamas?: number;
  numeroQuirofanos?: number;
  numeroUCI?: number;
  activo: boolean;
  servicios?: string[];
  _count?: {
    remisionesDestino: number;
    personalIPS: number;
  };
}

interface Stats {
  totalIps: number;
  ipsActivas: number;
  ipsInactivas: number;
  remisionesPendientes: number;
  porNivel: { nivelComplejidad: string; _count: number }[];
  porTipo: { tipo: string; _count: number }[];
}

const nivelLabels: Record<string, string> = {
  NIVEL_1: 'Nivel I',
  NIVEL_2: 'Nivel II',
  NIVEL_3: 'Nivel III',
  NIVEL_4: 'Nivel IV',
};

const nivelColors: Record<string, string> = {
  NIVEL_1: 'bg-green-100 text-green-700 border-green-200',
  NIVEL_2: 'bg-blue-100 text-blue-700 border-blue-200',
  NIVEL_3: 'bg-purple-100 text-purple-700 border-purple-200',
  NIVEL_4: 'bg-red-100 text-red-700 border-red-200',
};

export default function IpsPage() {
  const { token } = useAuth();
  const [ipsList, setIpsList] = useState<IPS[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterNivel, setFilterNivel] = useState('');
  const [filterTipo, setFilterTipo] = useState('');

  useEffect(() => {
    fetchIps();
    fetchStats();
  }, [token]);

  const fetchIps = async () => {
    try {
      const response = await fetch('http://localhost:3001/ips', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setIpsList(data);
      }
    } catch (error) {
      console.error('Error fetching IPS:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:3001/ips/stats', {
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

  const filteredIps = ipsList.filter(ips => {
    const matchesSearch = 
      ips.nombre.toLowerCase().includes(search.toLowerCase()) ||
      ips.codigo.toLowerCase().includes(search.toLowerCase()) ||
      ips.ciudad.toLowerCase().includes(search.toLowerCase());
    const matchesNivel = !filterNivel || ips.nivelComplejidad === filterNivel;
    const matchesTipo = !filterTipo || ips.tipo === filterTipo;
    return matchesSearch && matchesNivel && matchesTipo;
  });

  const tipos = [...new Set(ipsList.map(i => i.tipo))].sort();

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
            <Hospital className="h-7 w-7 text-purple-600" />
            Instituciones Prestadoras de Salud
          </h1>
          <p className="text-gray-500 mt-1">Hospitales, clínicas y centros especializados</p>
        </div>
        <Button className="bg-gray-900 hover:bg-gray-800">
          <Plus className="h-4 w-4 mr-2" />
          Nueva IPS
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">Total IPS</p>
                  <p className="text-2xl font-bold text-purple-900">{stats.totalIps}</p>
                </div>
                <div className="p-3 bg-purple-500 rounded-xl">
                  <Hospital className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="text-xs text-purple-600 mt-2">
                {stats.ipsActivas} activas · {stats.ipsInactivas} inactivas
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-600 font-medium">Remisiones Pendientes</p>
                  <p className="text-2xl font-bold text-amber-900">{stats.remisionesPendientes}</p>
                </div>
                <div className="p-3 bg-amber-500 rounded-xl">
                  <Activity className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="text-xs text-amber-600 mt-2">
                Esperando atención
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Por Nivel</p>
                  <div className="flex gap-2 mt-1">
                    {stats.porNivel.map(n => (
                      <Badge key={n.nivelComplejidad} variant="outline" className="text-xs">
                        {nivelLabels[n.nivelComplejidad]}: {n._count}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="p-3 bg-blue-500 rounded-xl">
                  <Layers className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-600 font-medium">Por Tipo</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {stats.porTipo.slice(0, 3).map(t => (
                      <Badge key={t.tipo} variant="outline" className="text-xs capitalize">
                        {t.tipo}: {t._count}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="p-3 bg-emerald-500 rounded-xl">
                  <Stethoscope className="h-6 w-6 text-white" />
                </div>
              </div>
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
          value={filterNivel}
          onChange={(e) => setFilterNivel(e.target.value)}
          className="h-11 px-4 rounded-lg border border-gray-200 bg-white text-sm"
        >
          <option value="">Todos los niveles</option>
          <option value="NIVEL_1">Nivel I</option>
          <option value="NIVEL_2">Nivel II</option>
          <option value="NIVEL_3">Nivel III</option>
          <option value="NIVEL_4">Nivel IV</option>
        </select>
        <select
          value={filterTipo}
          onChange={(e) => setFilterTipo(e.target.value)}
          className="h-11 px-4 rounded-lg border border-gray-200 bg-white text-sm"
        >
          <option value="">Todos los tipos</option>
          {tipos.map(tipo => (
            <option key={tipo} value={tipo} className="capitalize">{tipo}</option>
          ))}
        </select>
      </div>

      {/* IPS Grid */}
      {filteredIps.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-12 text-center">
            <Hospital className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay IPS registradas</h3>
            <p className="text-gray-500 mb-4">Comienza registrando hospitales y clínicas</p>
            <Button className="bg-gray-900 hover:bg-gray-800">
              <Plus className="h-4 w-4 mr-2" />
              Crear IPS
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredIps.map((ips) => (
            <Link key={ips.id} href={`/dashboard/ips/${ips.id}`}>
              <Card className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group h-full">
                <CardContent className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-400">{ips.codigo}</span>
                        <Badge 
                          variant="outline" 
                          className={nivelColors[ips.nivelComplejidad] || 'border-gray-200'}
                        >
                          {nivelLabels[ips.nivelComplejidad] || ips.nivelComplejidad}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                        {ips.nombre}
                      </h3>
                      <p className="text-xs text-gray-500 capitalize mt-0.5">{ips.tipo}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-purple-500 transition-colors" />
                  </div>

                  {/* Location */}
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                    <MapPin className="h-4 w-4" />
                    <span>{ips.ciudad}, {ips.departamento}</span>
                  </div>

                  {/* Capacity */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {ips.numeroCamas && (
                      <div className="text-center p-2 bg-gray-50 rounded-lg">
                        <Bed className="h-4 w-4 mx-auto text-gray-400 mb-1" />
                        <p className="text-sm font-semibold text-gray-900">{ips.numeroCamas}</p>
                        <p className="text-xs text-gray-500">Camas</p>
                      </div>
                    )}
                    {ips.numeroQuirofanos && (
                      <div className="text-center p-2 bg-gray-50 rounded-lg">
                        <Stethoscope className="h-4 w-4 mx-auto text-gray-400 mb-1" />
                        <p className="text-sm font-semibold text-gray-900">{ips.numeroQuirofanos}</p>
                        <p className="text-xs text-gray-500">Quirófanos</p>
                      </div>
                    )}
                    {ips.numeroUCI && (
                      <div className="text-center p-2 bg-gray-50 rounded-lg">
                        <Activity className="h-4 w-4 mx-auto text-gray-400 mb-1" />
                        <p className="text-sm font-semibold text-gray-900">{ips.numeroUCI}</p>
                        <p className="text-xs text-gray-500">UCI</p>
                      </div>
                    )}
                  </div>

                  {/* Services */}
                  {ips.servicios && ips.servicios.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {ips.servicios.slice(0, 3).map((servicio, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs capitalize">
                          {servicio}
                        </Badge>
                      ))}
                      {ips.servicios.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{ips.servicios.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-500">
                    {ips.telefono && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {ips.telefono}
                      </div>
                    )}
                    <Badge 
                      variant="outline" 
                      className={ips.activo ? 'border-emerald-200 text-emerald-700' : 'border-gray-200 text-gray-500'}
                    >
                      {ips.activo ? 'Activa' : 'Inactiva'}
                    </Badge>
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

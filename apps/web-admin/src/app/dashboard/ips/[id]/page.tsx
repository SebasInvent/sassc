"use client";

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Hospital,
  MapPin,
  Phone,
  Mail,
  Bed,
  Stethoscope,
  ArrowRightLeft,
  Plus,
  ChevronRight,
  Edit,
  Activity,
  AlertCircle,
  Users,
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
  email?: string;
  numeroCamas?: number;
  numeroQuirofanos?: number;
  numeroUCI?: number;
  activo: boolean;
  servicios?: string[];
  personalIPS: any[];
  remisionesDestino: any[];
  adresRegional?: {
    nombre: string;
    departamento: string;
  };
  _count: {
    remisionesDestino: number;
    personalIPS: number;
  };
}

const nivelLabels: Record<string, string> = {
  NIVEL_1: 'Nivel I - Básico',
  NIVEL_2: 'Nivel II - Intermedio',
  NIVEL_3: 'Nivel III - Alta Complejidad',
  NIVEL_4: 'Nivel IV - Especializado',
};

const nivelColors: Record<string, string> = {
  NIVEL_1: 'bg-green-100 text-green-700',
  NIVEL_2: 'bg-blue-100 text-blue-700',
  NIVEL_3: 'bg-purple-100 text-purple-700',
  NIVEL_4: 'bg-red-100 text-red-700',
};

export default function IpsDetailPage() {
  const { token } = useAuth();
  const params = useParams();
  const router = useRouter();
  const ipsId = params.id as string;
  const [ips, setIps] = useState<IPS | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchIps();
  }, [ipsId, token]);

  const fetchIps = async () => {
    try {
      const response = await fetch(`http://localhost:3001/ips/${ipsId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('No se pudo cargar la IPS');
      const data = await response.json();
      setIps(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-100 rounded w-32" />
          <div className="h-48 bg-gray-100 rounded-2xl" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error || !ips) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-16 text-center">
            <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Error</h3>
            <p className="text-gray-500 mb-6">{error || 'IPS no encontrada'}</p>
            <Button onClick={() => router.push('/dashboard/ips')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a IPS
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      {/* Back Button */}
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => router.push('/dashboard/ips')}
        className="text-gray-500 hover:text-gray-900 -ml-2"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a IPS
      </Button>

      {/* Header */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="p-8 bg-gradient-to-r from-purple-50 to-pink-50">
            <div className="flex flex-col sm:flex-row sm:items-start gap-6">
              <div className="p-4 bg-purple-500 rounded-2xl">
                <Hospital className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <span className="text-sm font-mono text-purple-600">{ips.codigo}</span>
                  <Badge className={`border-0 ${nivelColors[ips.nivelComplejidad] || 'bg-gray-100 text-gray-700'}`}>
                    <Layers className="h-3 w-3 mr-1" />
                    {nivelLabels[ips.nivelComplejidad] || ips.nivelComplejidad}
                  </Badge>
                  <Badge className={ips.activo ? 'bg-emerald-100 text-emerald-700 border-0' : 'bg-gray-100 text-gray-600 border-0'}>
                    {ips.activo ? 'Activa' : 'Inactiva'}
                  </Badge>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">{ips.nombre}</h1>
                <p className="text-gray-500 capitalize mb-3">{ips.tipo}</p>
                
                <div className="flex flex-wrap gap-4 text-gray-600 text-sm">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {ips.direccion}, {ips.ciudad}, {ips.departamento}
                  </span>
                  {ips.telefono && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-4 w-4" />
                      {ips.telefono}
                    </span>
                  )}
                  {ips.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-4 w-4" />
                      {ips.email}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="border-purple-200">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </div>
            </div>
          </div>

          {/* Capacity Stats */}
          <div className="grid grid-cols-4 divide-x border-t">
            <div className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Bed className="h-4 w-4 text-gray-400" />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{ips.numeroCamas || '-'}</p>
              <p className="text-xs text-gray-500">Camas</p>
            </div>
            <div className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Stethoscope className="h-4 w-4 text-gray-400" />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{ips.numeroQuirofanos || '-'}</p>
              <p className="text-xs text-gray-500">Quirófanos</p>
            </div>
            <div className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Activity className="h-4 w-4 text-gray-400" />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{ips.numeroUCI || '-'}</p>
              <p className="text-xs text-gray-500">UCI</p>
            </div>
            <div className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <ArrowRightLeft className="h-4 w-4 text-gray-400" />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{ips._count.remisionesDestino}</p>
              <p className="text-xs text-gray-500">Remisiones</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Servicios */}
      {ips.servicios && ips.servicios.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Servicios Disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {ips.servicios.map((servicio, idx) => (
                <Badge key={idx} variant="outline" className="capitalize px-3 py-1">
                  {servicio.replace('_', ' ')}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="personal">
        <TabsList className="bg-gray-100/50 p-1 rounded-xl">
          <TabsTrigger value="personal" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Personal
          </TabsTrigger>
          <TabsTrigger value="remisiones" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Remisiones Recibidas
          </TabsTrigger>
        </TabsList>

        {/* Personal Tab */}
        <TabsContent value="personal" className="mt-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Personal de la IPS</CardTitle>
              <Button size="sm" className="bg-gray-900 hover:bg-gray-800">
                <Plus className="h-4 w-4 mr-2" />
                Asignar Personal
              </Button>
            </CardHeader>
            <CardContent>
              {ips.personalIPS.length > 0 ? (
                <div className="space-y-3">
                  {ips.personalIPS.map((p: any) => (
                    <div key={p.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                      <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                        {p.practitioner.firstName[0]}{p.practitioner.lastName[0]}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {p.practitioner.firstName} {p.practitioner.lastName}
                          {p.esDirector && <Badge className="ml-2 bg-amber-100 text-amber-700 border-0">Director</Badge>}
                        </p>
                        <p className="text-sm text-gray-500">
                          {p.cargo.replace('_', ' ')}
                          {p.especialidad && ` · ${p.especialidad}`}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 font-mono">{p.practitioner.license}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay personal asignado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Remisiones Tab */}
        <TabsContent value="remisiones" className="mt-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Remisiones Recibidas de CAPs</CardTitle>
            </CardHeader>
            <CardContent>
              {ips.remisionesDestino.length > 0 ? (
                <div className="space-y-3">
                  {ips.remisionesDestino.map((r: any) => (
                    <div key={r.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <ArrowRightLeft className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {r.patient.firstName} {r.patient.lastName}
                        </p>
                        <p className="text-sm text-gray-500">
                          Desde: {r.capOrigen.nombre}, {r.capOrigen.ciudad}
                        </p>
                        <p className="text-xs text-gray-400 font-mono mt-1">{r.patient.docNumber}</p>
                      </div>
                      <div className="text-right">
                        <Badge className={`border-0 ${
                          r.estado === 'COMPLETADA' ? 'bg-emerald-100 text-emerald-700' :
                          r.estado === 'EN_PROCESO' ? 'bg-amber-100 text-amber-700' :
                          r.estado === 'APROBADA' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {r.estado.replace('_', ' ')}
                        </Badge>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(r.fechaSolicitud).toLocaleDateString('es-CO', {
                            day: '2-digit',
                            month: 'short'
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <ArrowRightLeft className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay remisiones recibidas</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

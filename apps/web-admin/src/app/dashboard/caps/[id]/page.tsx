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
  Building2,
  MapPin,
  Phone,
  Mail,
  Clock,
  Users,
  Stethoscope,
  Calendar,
  ArrowRightLeft,
  Plus,
  ChevronRight,
  Edit,
  Activity,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';

interface CAP {
  id: string;
  codigo: string;
  nombre: string;
  direccion: string;
  ciudad: string;
  departamento: string;
  codigoPostal?: string;
  telefono?: string;
  email?: string;
  horarioApertura?: string;
  horarioCierre?: string;
  diasOperacion?: string;
  poblacionAsignada: number;
  poblacionActual: number;
  activo: boolean;
  tieneOdontologia: boolean;
  tieneVacunacion: boolean;
  tieneLaboratorio: boolean;
  tieneUrgencias: boolean;
  pacientes: any[];
  personal: any[];
  citas: any[];
  remisionesOrigen: any[];
  adresRegional?: {
    nombre: string;
    departamento: string;
  };
  _count: {
    pacientes: number;
    personal: number;
    citas: number;
    remisionesOrigen: number;
  };
}

export default function CapDetailPage() {
  const { token } = useAuth();
  const params = useParams();
  const router = useRouter();
  const capId = params.id as string;
  const [cap, setCap] = useState<CAP | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCap();
  }, [capId, token]);

  const fetchCap = async () => {
    try {
      const response = await fetch(`http://localhost:3001/caps/${capId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('No se pudo cargar el CAP');
      const data = await response.json();
      setCap(data);
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

  if (error || !cap) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-16 text-center">
            <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Error</h3>
            <p className="text-gray-500 mb-6">{error || 'CAP no encontrado'}</p>
            <Button onClick={() => router.push('/dashboard/caps')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a CAPs
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const ocupacion = ((cap.poblacionActual / cap.poblacionAsignada) * 100).toFixed(0);
  const ocupacionColor = parseInt(ocupacion) >= 90 ? 'text-red-600' : parseInt(ocupacion) >= 70 ? 'text-amber-600' : 'text-emerald-600';

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      {/* Back Button */}
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => router.push('/dashboard/caps')}
        className="text-gray-500 hover:text-gray-900 -ml-2"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a CAPs
      </Button>

      {/* Header */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="p-8 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex flex-col sm:flex-row sm:items-start gap-6">
              <div className="p-4 bg-blue-500 rounded-2xl">
                <Building2 className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <span className="text-sm font-mono text-blue-600">{cap.codigo}</span>
                  <Badge className={cap.activo ? 'bg-emerald-100 text-emerald-700 border-0' : 'bg-gray-100 text-gray-600 border-0'}>
                    {cap.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">{cap.nombre}</h1>
                
                <div className="flex flex-wrap gap-4 text-gray-600 text-sm">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {cap.direccion}, {cap.ciudad}, {cap.departamento}
                  </span>
                  {cap.telefono && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-4 w-4" />
                      {cap.telefono}
                    </span>
                  )}
                  {cap.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-4 w-4" />
                      {cap.email}
                    </span>
                  )}
                </div>

                {cap.horarioApertura && cap.horarioCierre && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    <span>{cap.horarioApertura} - {cap.horarioCierre}</span>
                    {cap.diasOperacion && <span className="text-gray-400">· {cap.diasOperacion}</span>}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="border-blue-200">
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-5 divide-x border-t">
            <div className="p-4 text-center">
              <p className={`text-2xl font-bold ${ocupacionColor}`}>{ocupacion}%</p>
              <p className="text-xs text-gray-500">Ocupación</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{cap._count.pacientes.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Pacientes</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{cap._count.personal}</p>
              <p className="text-xs text-gray-500">Personal</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{cap._count.citas}</p>
              <p className="text-xs text-gray-500">Citas</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{cap._count.remisionesOrigen}</p>
              <p className="text-xs text-gray-500">Remisiones</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Servicios */}
      <div className="flex flex-wrap gap-2">
        {cap.tieneOdontologia && (
          <Badge className="bg-blue-100 text-blue-700 border-0 px-3 py-1">🦷 Odontología</Badge>
        )}
        {cap.tieneVacunacion && (
          <Badge className="bg-green-100 text-green-700 border-0 px-3 py-1">💉 Vacunación</Badge>
        )}
        {cap.tieneLaboratorio && (
          <Badge className="bg-purple-100 text-purple-700 border-0 px-3 py-1">🔬 Laboratorio</Badge>
        )}
        {cap.tieneUrgencias && (
          <Badge className="bg-red-100 text-red-700 border-0 px-3 py-1">🚨 Urgencias</Badge>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="personal">
        <TabsList className="bg-gray-100/50 p-1 rounded-xl">
          <TabsTrigger value="personal" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Personal
          </TabsTrigger>
          <TabsTrigger value="pacientes" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Pacientes
          </TabsTrigger>
          <TabsTrigger value="citas" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Citas
          </TabsTrigger>
          <TabsTrigger value="remisiones" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Remisiones
          </TabsTrigger>
        </TabsList>

        {/* Personal Tab */}
        <TabsContent value="personal" className="mt-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Personal del CAP</CardTitle>
              <Button size="sm" className="bg-gray-900 hover:bg-gray-800">
                <Plus className="h-4 w-4 mr-2" />
                Asignar Personal
              </Button>
            </CardHeader>
            <CardContent>
              {cap.personal.length > 0 ? (
                <div className="space-y-3">
                  {cap.personal.map((p: any) => (
                    <div key={p.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                      <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center text-white font-bold">
                        {p.practitioner.firstName[0]}{p.practitioner.lastName[0]}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {p.practitioner.firstName} {p.practitioner.lastName}
                          {p.esDirector && <Badge className="ml-2 bg-amber-100 text-amber-700 border-0">Director</Badge>}
                        </p>
                        <p className="text-sm text-gray-500">{p.cargo.replace('_', ' ')} · {p.practitioner.specialty}</p>
                      </div>
                      <span className="text-xs text-gray-400 font-mono">{p.practitioner.license}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Stethoscope className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay personal asignado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pacientes Tab */}
        <TabsContent value="pacientes" className="mt-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Pacientes Asignados</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  {cap.poblacionActual.toLocaleString()} / {cap.poblacionAsignada.toLocaleString()}
                </span>
                <Button size="sm" className="bg-gray-900 hover:bg-gray-800">
                  <Plus className="h-4 w-4 mr-2" />
                  Afiliar Paciente
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {cap.pacientes.length > 0 ? (
                <div className="space-y-2">
                  {cap.pacientes.map((p: any) => (
                    <Link key={p.id} href={`/dashboard/patients/${p.id}`}>
                      <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 text-sm font-medium">
                          {p.firstName[0]}{p.lastName[0]}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{p.firstName} {p.lastName}</p>
                        </div>
                        <span className="text-xs text-gray-400 font-mono">{p.docNumber}</span>
                        <ChevronRight className="h-4 w-4 text-gray-300" />
                      </div>
                    </Link>
                  ))}
                  {cap._count.pacientes > cap.pacientes.length && (
                    <p className="text-center text-sm text-gray-400 pt-2">
                      Mostrando {cap.pacientes.length} de {cap._count.pacientes} pacientes
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Users className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay pacientes asignados</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Citas Tab */}
        <TabsContent value="citas" className="mt-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Citas del CAP</CardTitle>
              <Button size="sm" className="bg-gray-900 hover:bg-gray-800">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Cita
              </Button>
            </CardHeader>
            <CardContent>
              {cap.citas.length > 0 ? (
                <div className="space-y-3">
                  {cap.citas.map((c: any) => (
                    <div key={c.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Calendar className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 capitalize">{c.tipoConsulta.replace('_', ' ')}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(c.fechaHora).toLocaleDateString('es-CO', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <Badge className={`border-0 ${
                        c.estado === 'completada' ? 'bg-emerald-100 text-emerald-700' :
                        c.estado === 'programada' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {c.estado}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Calendar className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay citas registradas</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Remisiones Tab */}
        <TabsContent value="remisiones" className="mt-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Remisiones Generadas</CardTitle>
              <Button size="sm" className="bg-gray-900 hover:bg-gray-800">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Remisión
              </Button>
            </CardHeader>
            <CardContent>
              {cap.remisionesOrigen.length > 0 ? (
                <div className="space-y-3">
                  {cap.remisionesOrigen.map((r: any) => (
                    <div key={r.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <ArrowRightLeft className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {r.patient.firstName} {r.patient.lastName}
                        </p>
                        <p className="text-sm text-gray-500">
                          → {r.ipsDestino.nombre}, {r.ipsDestino.ciudad}
                        </p>
                      </div>
                      <Badge className={`border-0 ${
                        r.estado === 'COMPLETADA' ? 'bg-emerald-100 text-emerald-700' :
                        r.estado === 'EN_PROCESO' ? 'bg-amber-100 text-amber-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {r.estado.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <ArrowRightLeft className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay remisiones generadas</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

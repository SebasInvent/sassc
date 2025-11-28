"use client";

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EditPatientDialog } from '@/components/dashboard/edit-patient-dialog';
import {
  ArrowLeft,
  User,
  Calendar,
  Phone,
  Mail,
  FileText,
  Activity,
  Pill,
  Scan,
  Edit,
  Stethoscope,
  Heart,
  Clock,
  Plus,
  ChevronRight,
  AlertCircle,
  Building2,
  MapPin,
  ArrowRightLeft,
  Hospital,
  Shield,
  Droplets,
} from 'lucide-react';

// --- Tipos de Datos ---
type Appointment = { id: string; start: string; modality: string; status: string; };
type Condition = { id: string; code: string; clinicalStatus: string; };
type Observation = { id: string; code: string; valueQuantity: number; valueUnit: string; effectiveDateTime?: string; };
type Prescription = { id: string; medication: string; status: string; };
type CAP = {
  id: string;
  codigo: string;
  nombre: string;
  direccion: string;
  ciudad: string;
  departamento: string;
  telefono?: string;
};
type Remision = {
  id: string;
  codigo: string;
  estado: string;
  fechaSolicitud: string;
  especialidadRequerida: string;
  capOrigen: { nombre: string; ciudad: string };
  ipsDestino: { nombre: string; ciudad: string; nivelComplejidad: string };
};
type PatientDetails = {
  id: string;
  firstName: string;
  lastName: string;
  docType?: string;
  docNumber: string;
  birthDate: string;
  gender?: string;
  email: string | null;
  phone: string | null;
  address?: string;
  city?: string;
  department?: string;
  regimen?: string;
  bloodType?: string;
  allergies?: string;
  biometricRegistered?: boolean;
  capAsignado?: CAP;
  appointments: Appointment[];
  conditions: Condition[];
  observations: Observation[];
  prescriptions?: Prescription[];
  remisiones?: Remision[];
};

const regimenLabels: Record<string, string> = {
  CONTRIBUTIVO: 'Contributivo',
  SUBSIDIADO: 'Subsidiado',
  ESPECIAL: 'Especial',
  VINCULADO: 'Vinculado',
};

const estadoRemisionColors: Record<string, string> = {
  SOLICITADA: 'bg-blue-100 text-blue-700',
  APROBADA: 'bg-emerald-100 text-emerald-700',
  RECHAZADA: 'bg-red-100 text-red-700',
  EN_PROCESO: 'bg-amber-100 text-amber-700',
  COMPLETADA: 'bg-gray-100 text-gray-700',
  CANCELADA: 'bg-gray-100 text-gray-500',
};

const fetcher = async (url: string, token: string) => {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    throw new Error('No se pudo cargar el detalle del paciente.');
  }
  return res.json();
};

export default function PatientDetailPage() {
  const { token } = useAuth();
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;
  const [mounted, setMounted] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: patient, error, isLoading, mutate } = useSWR<PatientDetails>(
    token ? `http://localhost:3001/fhir/Patient/${patientId}` : null,
    (url: string) => fetcher(url, token!)
  );

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // Loading skeleton elegante
  if (isLoading) {
    return (
      <div className="p-8 space-y-8 max-w-6xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-100 rounded w-32" />
          <div className="h-48 bg-gray-100 rounded-2xl" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
          </div>
          <div className="h-64 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-16 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Error al cargar</h3>
            <p className="text-gray-500 mb-6">{error.message}</p>
            <Button onClick={() => router.push('/dashboard/patients')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Pacientes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-16 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="h-8 w-8 text-gray-300" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Paciente no encontrado</h3>
            <Button onClick={() => router.push('/dashboard/patients')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Pacientes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = {
    appointments: patient.appointments?.length || 0,
    conditions: patient.conditions?.length || 0,
    observations: patient.observations?.length || 0,
    prescriptions: patient.prescriptions?.length || 0,
    remisiones: patient.remisiones?.length || 0,
  };

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      {/* Back Button */}
      <div className={`transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.push('/dashboard/patients')}
          className="text-gray-500 hover:text-gray-900 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a Pacientes
        </Button>
      </div>

      {/* Patient Header - Elegante y minimalista */}
      <Card className={`border-0 shadow-sm overflow-hidden transition-all duration-500 delay-100 ${
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}>
        <CardContent className="p-0">
          <div className="p-8">
            <div className="flex flex-col sm:flex-row sm:items-start gap-6">
              {/* Avatar */}
              <div className="w-20 h-20 bg-gray-900 rounded-2xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                {patient.firstName[0]}{patient.lastName[0]}
              </div>
              
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {patient.firstName} {patient.lastName}
                  </h1>
                  {patient.regimen && (
                    <Badge className={`border-0 ${
                      patient.regimen === 'CONTRIBUTIVO' ? 'bg-blue-100 text-blue-700' :
                      patient.regimen === 'SUBSIDIADO' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      <Shield className="h-3 w-3 mr-1" />
                      {regimenLabels[patient.regimen] || patient.regimen}
                    </Badge>
                  )}
                  {patient.biometricRegistered ? (
                    <Badge className="bg-emerald-50 text-emerald-700 border-0">
                      <Scan className="h-3 w-3 mr-1" />
                      Verificado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-500 border-gray-200">
                      Sin biometría
                    </Badge>
                  )}
                </div>
                
                {/* Datos básicos */}
                <div className="flex flex-wrap gap-4 text-gray-500 text-sm mb-3">
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-4 w-4" />
                    {patient.docType || 'CC'} {patient.docNumber}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {calculateAge(patient.birthDate)} años
                  </span>
                  {patient.gender && (
                    <span className="flex items-center gap-1.5">
                      <User className="h-4 w-4" />
                      {patient.gender === 'M' ? 'Masculino' : patient.gender === 'F' ? 'Femenino' : 'Otro'}
                    </span>
                  )}
                  {patient.bloodType && (
                    <span className="flex items-center gap-1.5">
                      <Droplets className="h-4 w-4 text-red-400" />
                      {patient.bloodType}
                    </span>
                  )}
                </div>

                {/* Contacto y ubicación */}
                <div className="flex flex-wrap gap-4 text-gray-500 text-sm">
                  {patient.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-4 w-4" />
                      {patient.phone}
                    </span>
                  )}
                  {patient.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-4 w-4" />
                      {patient.email}
                    </span>
                  )}
                  {(patient.city || patient.department) && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      {[patient.city, patient.department].filter(Boolean).join(', ')}
                    </span>
                  )}
                </div>

                {/* Alergias */}
                {patient.allergies && (
                  <div className="mt-3 p-2 bg-red-50 rounded-lg border border-red-100">
                    <p className="text-xs text-red-600 font-medium flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Alergias: {patient.allergies}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-shrink-0">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="border-gray-200"
                  onClick={() => setEditDialogOpen(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                {!patient.biometricRegistered && (
                  <Button 
                    size="sm" 
                    className="bg-gray-900 hover:bg-gray-800"
                    onClick={() => router.push(`/dashboard/patients/${patient.id}/register-biometric`)}
                  >
                    <Scan className="h-4 w-4 mr-2" />
                    Registrar Biometría
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-5 divide-x border-t bg-gray-50/50">
            <div className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{stats.appointments}</p>
              <p className="text-xs text-gray-500">Citas</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{stats.conditions}</p>
              <p className="text-xs text-gray-500">Diagnósticos</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{stats.prescriptions}</p>
              <p className="text-xs text-gray-500">Prescripciones</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{stats.observations}</p>
              <p className="text-xs text-gray-500">Observaciones</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{stats.remisiones}</p>
              <p className="text-xs text-gray-500">Remisiones</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CAP Asignado - Territorialización */}
      {patient.capAsignado ? (
        <Card className={`border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50 transition-all duration-500 delay-150 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500 rounded-xl">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-blue-600 font-medium mb-0.5">CAP Asignado (Territorialización)</p>
                <p className="font-semibold text-gray-900">{patient.capAsignado.nombre}</p>
                <p className="text-sm text-gray-600 flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3" />
                  {patient.capAsignado.direccion}, {patient.capAsignado.ciudad}
                </p>
              </div>
              {patient.capAsignado.telefono && (
                <div className="text-right">
                  <p className="text-xs text-gray-500">Teléfono</p>
                  <p className="text-sm font-medium text-gray-900">{patient.capAsignado.telefono}</p>
                </div>
              )}
              <Link href={`/dashboard/caps/${patient.capAsignado.id}`}>
                <Button variant="outline" size="sm" className="border-blue-200 text-blue-700 hover:bg-blue-100">
                  Ver CAP
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className={`border-0 shadow-sm border-dashed border-2 border-amber-200 bg-amber-50/50 transition-all duration-500 delay-150 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-amber-100 rounded-xl">
                <Building2 className="h-6 w-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-amber-800">Sin CAP Asignado</p>
                <p className="text-sm text-amber-600">Este paciente no tiene un Centro de Atención Primaria asignado</p>
              </div>
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700">
                <Plus className="h-4 w-4 mr-2" />
                Asignar CAP
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs - Estilo minimalista */}
      <Tabs defaultValue="overview" className={`transition-all duration-500 delay-200 ${
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}>
        <TabsList className="bg-gray-100/50 p-1 rounded-xl">
          <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Resumen
          </TabsTrigger>
          <TabsTrigger value="remisiones" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Remisiones
          </TabsTrigger>
          <TabsTrigger value="appointments" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Citas
          </TabsTrigger>
          <TabsTrigger value="clinical" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Historia Clínica
          </TabsTrigger>
          <TabsTrigger value="vitals" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Signos Vitales
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Próximas Citas */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-base font-semibold">Próximas Citas</CardTitle>
                <Button variant="ghost" size="sm" className="text-gray-500">
                  <Plus className="h-4 w-4 mr-1" />
                  Nueva
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {patient.appointments?.length > 0 ? (
                  patient.appointments.slice(0, 3).map((apt) => (
                    <div key={apt.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <Calendar className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-900">{apt.modality}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(apt.start).toLocaleDateString('es-CO', { 
                            weekday: 'short', 
                            day: 'numeric', 
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <Badge variant="outline" className={`text-xs ${
                        apt.status === 'fulfilled' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        apt.status === 'booked' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-gray-50 text-gray-600 border-gray-200'
                      }`}>
                        {apt.status === 'fulfilled' ? 'Completada' : apt.status === 'booked' ? 'Programada' : apt.status}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No hay citas programadas</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Condiciones Activas */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-base font-semibold">Condiciones Activas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {patient.conditions?.length > 0 ? (
                  patient.conditions.map((cond) => (
                    <div key={cond.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <Stethoscope className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm text-gray-900">{cond.code}</p>
                      </div>
                      <Badge variant="outline" className={`text-xs ${
                        cond.clinicalStatus === 'active' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {cond.clinicalStatus === 'active' ? 'Activo' : 'Resuelto'}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Stethoscope className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No hay condiciones registradas</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Últimas Observaciones */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">Últimas Observaciones</CardTitle>
            </CardHeader>
            <CardContent>
              {patient.observations?.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {patient.observations.slice(0, 4).map((obs) => (
                    <div key={obs.id} className="p-4 bg-gray-50 rounded-xl text-center">
                      <p className="text-xs text-gray-500 mb-1">{obs.code}</p>
                      <p className="text-xl font-bold text-gray-900">
                        {obs.valueQuantity}
                        <span className="text-sm font-normal text-gray-500 ml-1">{obs.valueUnit}</span>
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No hay observaciones registradas</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Remisiones Tab */}
        <TabsContent value="remisiones" className="mt-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Historial de Remisiones</CardTitle>
              <Button size="sm" className="bg-gray-900 hover:bg-gray-800">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Remisión
              </Button>
            </CardHeader>
            <CardContent>
              {patient.remisiones && patient.remisiones.length > 0 ? (
                <div className="space-y-3">
                  {patient.remisiones.map((rem) => (
                    <div key={rem.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                      <div className="p-3 bg-indigo-100 rounded-xl">
                        <ArrowRightLeft className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-gray-400">{rem.codigo}</span>
                          <Badge className={`text-xs border-0 ${estadoRemisionColors[rem.estado] || 'bg-gray-100 text-gray-600'}`}>
                            {rem.estado.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="font-medium text-gray-900 capitalize">{rem.especialidadRequerida}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                          <Building2 className="h-3 w-3" />
                          <span>{rem.capOrigen.nombre}</span>
                          <ChevronRight className="h-3 w-3" />
                          <Hospital className="h-3 w-3" />
                          <span>{rem.ipsDestino.nombre}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">
                          {new Date(rem.fechaSolicitud).toLocaleDateString('es-CO', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                        <Badge variant="outline" className="text-xs mt-1">
                          {rem.ipsDestino.nivelComplejidad.replace('NIVEL_', 'Nivel ')}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <ArrowRightLeft className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p className="mb-2">No hay remisiones registradas</p>
                  <p className="text-sm">Las remisiones a especialistas aparecerán aquí</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appointments Tab */}
        <TabsContent value="appointments" className="mt-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Historial de Citas</CardTitle>
              <Button size="sm" className="bg-gray-900 hover:bg-gray-800">
                <Plus className="h-4 w-4 mr-2" />
                Nueva Cita
              </Button>
            </CardHeader>
            <CardContent>
              {patient.appointments?.length > 0 ? (
                <div className="space-y-3">
                  {patient.appointments.map((apt) => (
                    <div key={apt.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                      <div className={`p-3 rounded-xl ${
                        apt.status === 'fulfilled' ? 'bg-emerald-100' : 'bg-blue-100'
                      }`}>
                        <Calendar className={`h-5 w-5 ${
                          apt.status === 'fulfilled' ? 'text-emerald-600' : 'text-blue-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">{apt.modality}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(apt.start).toLocaleDateString('es-CO', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <Badge className={`${
                        apt.status === 'fulfilled' ? 'bg-emerald-100 text-emerald-700' :
                        apt.status === 'booked' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      } border-0`}>
                        {apt.status === 'fulfilled' ? 'Completada' : apt.status === 'booked' ? 'Programada' : apt.status}
                      </Badge>
                      <ChevronRight className="h-5 w-5 text-gray-300" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay citas registradas</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clinical Tab */}
        <TabsContent value="clinical" className="mt-6">
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Historia Clínica</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-400">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="mb-4">La historia clínica detallada estará disponible próximamente</p>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Nota Clínica
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vitals Tab */}
        <TabsContent value="vitals" className="mt-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Signos Vitales</CardTitle>
              <Button size="sm" className="bg-gray-900 hover:bg-gray-800">
                <Plus className="h-4 w-4 mr-2" />
                Registrar
              </Button>
            </CardHeader>
            <CardContent>
              {patient.observations?.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {patient.observations.map((obs) => (
                    <div key={obs.id} className="p-6 bg-gray-50 rounded-xl text-center hover:bg-gray-100 transition-colors">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                        <Heart className="h-5 w-5 text-gray-600" />
                      </div>
                      <p className="text-xs text-gray-500 mb-1">{obs.code}</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {obs.valueQuantity}
                      </p>
                      <p className="text-xs text-gray-400">{obs.valueUnit}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay signos vitales registrados</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      {patient && (
        <EditPatientDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          patient={patient}
          onSuccess={() => {
            mutate();
            setEditDialogOpen(false);
          }}
        />
      )}
    </div>
  );
}
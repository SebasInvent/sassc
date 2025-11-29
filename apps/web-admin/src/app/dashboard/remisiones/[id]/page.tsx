"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  ArrowRightLeft,
  User,
  Building2,
  Hospital,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Calendar,
  Stethoscope,
  MapPin,
  Phone,
} from 'lucide-react';
import Link from 'next/link';

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
  resultadoAtencion?: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    docNumber: string;
    phone?: string;
    email?: string;
  };
  capOrigen: {
    id: string;
    codigo: string;
    nombre: string;
    direccion: string;
    ciudad: string;
    departamento: string;
    telefono?: string;
  };
  ipsDestino: {
    id: string;
    codigo: string;
    nombre: string;
    direccion: string;
    ciudad: string;
    departamento: string;
    nivelComplejidad: string;
    telefono?: string;
  };
}

const estadoConfig: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  SOLICITADA: { label: 'Solicitada', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: Clock },
  APROBADA: { label: 'Aprobada', color: 'text-emerald-700', bgColor: 'bg-emerald-100', icon: CheckCircle2 },
  RECHAZADA: { label: 'Rechazada', color: 'text-red-700', bgColor: 'bg-red-100', icon: XCircle },
  EN_PROCESO: { label: 'En Proceso', color: 'text-amber-700', bgColor: 'bg-amber-100', icon: ArrowRightLeft },
  COMPLETADA: { label: 'Completada', color: 'text-gray-700', bgColor: 'bg-gray-100', icon: CheckCircle2 },
  CANCELADA: { label: 'Cancelada', color: 'text-gray-500', bgColor: 'bg-gray-100', icon: XCircle },
};

const prioridadConfig: Record<string, { label: string; color: string }> = {
  urgente: { label: 'URGENTE', color: 'bg-red-500 text-white' },
  prioritario: { label: 'Prioritario', color: 'bg-amber-500 text-white' },
  normal: { label: 'Normal', color: 'bg-gray-200 text-gray-700' },
};

const nivelLabels: Record<string, string> = {
  NIVEL_1: 'Nivel I - Básico',
  NIVEL_2: 'Nivel II - Intermedio',
  NIVEL_3: 'Nivel III - Alta Complejidad',
  NIVEL_4: 'Nivel IV - Especializado',
};

export default function RemisionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAuth();
  const [remision, setRemision] = useState<Remision | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (params.id && token) {
      fetchRemision();
    }
  }, [params.id, token]);

  const fetchRemision = async () => {
    try {
      const response = await fetch(`http://localhost:3001/remisiones/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setRemision(data);
      } else {
        setError('Remisión no encontrada');
      }
    } catch (err) {
      setError('Error al cargar la remisión');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
            <div className="h-32 bg-gray-200 rounded-xl animate-pulse" />
          </div>
          <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !remision) {
    return (
      <div className="text-center py-12">
        <XCircle className="h-10 w-10 sm:h-12 sm:w-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">{error || 'Remisión no encontrada'}</h2>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
      </div>
    );
  }

  const estado = estadoConfig[remision.estado] || estadoConfig.SOLICITADA;
  const prioridad = prioridadConfig[remision.prioridad] || prioridadConfig.normal;
  const EstadoIcon = estado.icon;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{remision.codigo}</h1>
              <Badge className={prioridad.color}>{prioridad.label}</Badge>
              <Badge className={`${estado.bgColor} ${estado.color}`}>
                <EstadoIcon className="h-3 w-3 mr-1" />
                {estado.label}
              </Badge>
            </div>
            <p className="text-gray-500 mt-1">Remisión de {remision.capOrigen.nombre} a {remision.ipsDestino.nombre}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Información Clínica */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5 text-blue-600" />
                Información Clínica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Diagnóstico</label>
                <p className="text-gray-900 font-medium mt-1">{remision.diagnostico}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Motivo de Remisión</label>
                <p className="text-gray-900 mt-1">{remision.motivoRemision}</p>
              </div>
              <div className="flex gap-8">
                <div>
                  <label className="text-sm font-medium text-gray-500">Especialidad Requerida</label>
                  <p className="text-gray-900 font-medium mt-1 flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-purple-600" />
                    {remision.especialidadRequerida}
                  </p>
                </div>
              </div>
              {remision.notas && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <label className="text-sm font-medium text-amber-700">Notas</label>
                  <p className="text-amber-800 mt-1">{remision.notas}</p>
                </div>
              )}
              {remision.resultadoAtencion && (
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <label className="text-sm font-medium text-emerald-700">Resultado de Atención</label>
                  <p className="text-emerald-800 mt-1">{remision.resultadoAtencion}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Flujo CAP → IPS */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ArrowRightLeft className="h-5 w-5 text-indigo-600" />
                Flujo de Remisión
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                {/* CAP Origen */}
                <div className="flex-1 p-4 bg-cyan-50 rounded-xl border border-cyan-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-5 w-5 text-cyan-600" />
                    <span className="text-xs font-medium text-cyan-600">CAP ORIGEN</span>
                  </div>
                  <h3 className="font-semibold text-gray-900">{remision.capOrigen.nombre}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" />
                    {remision.capOrigen.ciudad}, {remision.capOrigen.departamento}
                  </p>
                  {remision.capOrigen.telefono && (
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <Phone className="h-3 w-3" />
                      {remision.capOrigen.telefono}
                    </p>
                  )}
                </div>

                {/* Arrow */}
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                    <ArrowRightLeft className="h-6 w-6 text-indigo-600" />
                  </div>
                </div>

                {/* IPS Destino */}
                <div className="flex-1 p-4 bg-purple-50 rounded-xl border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Hospital className="h-5 w-5 text-purple-600" />
                    <span className="text-xs font-medium text-purple-600">IPS DESTINO</span>
                  </div>
                  <h3 className="font-semibold text-gray-900">{remision.ipsDestino.nombre}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" />
                    {remision.ipsDestino.ciudad}, {remision.ipsDestino.departamento}
                  </p>
                  <Badge variant="outline" className="mt-2 text-xs">
                    {nivelLabels[remision.ipsDestino.nivelComplejidad] || remision.ipsDestino.nivelComplejidad}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4 sm:space-y-6">
          {/* Paciente */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5 text-emerald-600" />
                Paciente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500">Nombre</label>
                  <p className="font-semibold text-gray-900">
                    {remision.patient.firstName} {remision.patient.lastName}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500">Documento</label>
                  <p className="text-gray-900 font-mono">{remision.patient.docNumber}</p>
                </div>
                {remision.patient.phone && (
                  <div>
                    <label className="text-xs font-medium text-gray-500">Teléfono</label>
                    <p className="text-gray-900">{remision.patient.phone}</p>
                  </div>
                )}
                <Link href={`/dashboard/patients/${remision.patient.id}`}>
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    Ver Historia Clínica
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5 text-amber-600" />
                Cronología
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Solicitud</p>
                    <p className="text-xs text-gray-500">{formatDate(remision.fechaSolicitud)}</p>
                  </div>
                </div>
                {remision.fechaAprobacion && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-emerald-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Aprobación</p>
                      <p className="text-xs text-gray-500">{formatDate(remision.fechaAprobacion)}</p>
                    </div>
                  </div>
                )}
                {remision.fechaAtencion && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-purple-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Atención</p>
                      <p className="text-xs text-gray-500">{formatDate(remision.fechaAtencion)}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

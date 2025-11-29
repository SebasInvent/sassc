"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  ArrowRight,
  Search,
  User,
  Building2,
  Hospital,
  Stethoscope,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  MapPin,
  FileText,
} from 'lucide-react';
import { API_URL } from '@/lib/api';
import { toast } from 'sonner';

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  docNumber: string;
  city?: string;
  capAsignado?: {
    id: string;
    nombre: string;
    ciudad: string;
  };
}

interface CAP {
  id: string;
  codigo: string;
  nombre: string;
  ciudad: string;
  departamento: string;
}

interface IPS {
  id: string;
  codigo: string;
  nombre: string;
  ciudad: string;
  departamento: string;
  nivelComplejidad: string;
  servicios: string[];
}

type Step = 'paciente' | 'diagnostico' | 'ips' | 'confirmar';

const especialidades = [
  'Cardiología',
  'Oncología',
  'Neurología',
  'Ortopedia',
  'Cirugía General',
  'Cirugía Plástica',
  'Nefrología',
  'Hematología',
  'Gastroenterología',
  'Neumología',
  'Urología',
  'Ginecología',
  'Pediatría',
  'Medicina Interna',
  'Traumatología',
];

const nivelLabels: Record<string, string> = {
  NIVEL_1: 'Nivel I',
  NIVEL_2: 'Nivel II',
  NIVEL_3: 'Nivel III',
  NIVEL_4: 'Nivel IV',
};

export default function NuevaRemisionPage() {
  const router = useRouter();
  const { token } = useAuth();
  
  const [step, setStep] = useState<Step>('paciente');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Step 1: Paciente
  const [searchPatient, setSearchPatient] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [searchingPatient, setSearchingPatient] = useState(false);
  
  // Step 2: Diagnóstico
  const [diagnostico, setDiagnostico] = useState('');
  const [motivoRemision, setMotivoRemision] = useState('');
  const [especialidad, setEspecialidad] = useState('');
  const [prioridad, setPrioridad] = useState<'normal' | 'prioritario' | 'urgente'>('normal');
  
  // Step 3: IPS
  const [ipsList, setIpsList] = useState<IPS[]>([]);
  const [selectedIps, setSelectedIps] = useState<IPS | null>(null);
  const [searchingIps, setSearchingIps] = useState(false);

  // Buscar pacientes
  const searchPatients = async () => {
    if (!searchPatient.trim() || !token) return;
    
    setSearchingPatient(true);
    try {
      const response = await fetch(
        `${API_URL}/fhir/Patient?search=${encodeURIComponent(searchPatient)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setPatients(data);
      }
    } catch (error) {
      console.error('Error buscando pacientes:', error);
    } finally {
      setSearchingPatient(false);
    }
  };

  // Buscar IPS por especialidad
  const searchIps = async () => {
    if (!especialidad || !token) return;
    
    setSearchingIps(true);
    try {
      // Buscar IPS que tengan la especialidad en sus servicios
      const response = await fetch(
        `${API_URL}/ips`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        // Filtrar por servicios que contengan la especialidad
        const filtered = data.filter((ips: IPS) => 
          ips.servicios?.some((s: string) => 
            s.toLowerCase().includes(especialidad.toLowerCase())
          ) || true // Por ahora mostrar todas
        );
        setIpsList(filtered);
      }
    } catch (error) {
      console.error('Error buscando IPS:', error);
    } finally {
      setSearchingIps(false);
    }
  };

  useEffect(() => {
    if (step === 'ips' && especialidad) {
      searchIps();
    }
  }, [step, especialidad]);

  // Crear remisión
  const createRemision = async () => {
    if (!selectedPatient || !selectedIps || !token) return;
    
    setSubmitting(true);
    try {
      const capOrigenId = selectedPatient.capAsignado?.id;
      
      if (!capOrigenId) {
        toast.error('El paciente no tiene CAP asignado');
        return;
      }

      const response = await fetch('${API_URL}/remisiones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patientId: selectedPatient.id,
          capOrigenId,
          ipsDestinoId: selectedIps.id,
          diagnostico,
          motivoRemision,
          especialidadRequerida: especialidad,
          prioridad,
        }),
      });

      if (response.ok) {
        const remision = await response.json();
        toast.success(`Remisión ${remision.codigo} creada exitosamente`);
        router.push('/dashboard/remisiones');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Error al crear la remisión');
      }
    } catch (error) {
      console.error('Error creando remisión:', error);
      toast.error('Error al crear la remisión');
    } finally {
      setSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 'paciente':
        return selectedPatient !== null;
      case 'diagnostico':
        return diagnostico.trim() && motivoRemision.trim() && especialidad;
      case 'ips':
        return selectedIps !== null;
      case 'confirmar':
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    const steps: Step[] = ['paciente', 'diagnostico', 'ips', 'confirmar'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const steps: Step[] = ['paciente', 'diagnostico', 'ips', 'confirmar'];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nueva Remisión</h1>
          <p className="text-gray-500">Crear una nueva remisión de paciente</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm">
        {[
          { key: 'paciente', label: 'Paciente', icon: User },
          { key: 'diagnostico', label: 'Diagnóstico', icon: FileText },
          { key: 'ips', label: 'IPS Destino', icon: Hospital },
          { key: 'confirmar', label: 'Confirmar', icon: CheckCircle2 },
        ].map((s, i) => {
          const Icon = s.icon;
          const isActive = step === s.key;
          const isPast = ['paciente', 'diagnostico', 'ips', 'confirmar'].indexOf(step) > i;
          
          return (
            <div key={s.key} className="flex items-center">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                isActive ? 'bg-blue-100 text-blue-700' : 
                isPast ? 'bg-emerald-100 text-emerald-700' : 
                'text-gray-400'
              }`}>
                <Icon className="h-5 w-5" />
                <span className="font-medium hidden sm:inline">{s.label}</span>
              </div>
              {i < 3 && (
                <ArrowRight className={`h-5 w-5 mx-2 ${isPast ? 'text-emerald-500' : 'text-gray-300'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          
          {/* Step 1: Seleccionar Paciente */}
          {step === 'paciente' && (
            <div className="space-y-6">
              <div>
                <Label className="text-lg font-semibold">Buscar Paciente</Label>
                <p className="text-gray-500 text-sm mb-4">Busque por nombre o número de documento</p>
                
                <div className="flex gap-2">
                  <Input
                    placeholder="Nombre o documento del paciente..."
                    value={searchPatient}
                    onChange={(e) => setSearchPatient(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchPatients()}
                    className="flex-1"
                  />
                  <Button onClick={searchPatients} disabled={searchingPatient}>
                    {searchingPatient ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Resultados */}
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {patients.map((patient) => (
                  <div
                    key={patient.id}
                    onClick={() => setSelectedPatient(patient)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedPatient?.id === patient.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {patient.firstName} {patient.lastName}
                          </p>
                          <p className="text-sm text-gray-500">CC: {patient.docNumber}</p>
                        </div>
                      </div>
                      {patient.capAsignado && (
                        <Badge variant="outline" className="text-xs">
                          <Building2 className="h-3 w-3 mr-1" />
                          {patient.capAsignado.nombre}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
                
                {patients.length === 0 && searchPatient && !searchingPatient && (
                  <p className="text-center text-gray-500 py-8">
                    No se encontraron pacientes. Intente con otro término.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Diagnóstico */}
          {step === 'diagnostico' && (
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 rounded-xl flex items-center gap-3">
                <User className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-semibold text-blue-900">
                    {selectedPatient?.firstName} {selectedPatient?.lastName}
                  </p>
                  <p className="text-sm text-blue-700">CC: {selectedPatient?.docNumber}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label>Diagnóstico *</Label>
                  <Input
                    placeholder="Ej: Infarto agudo de miocardio"
                    value={diagnostico}
                    onChange={(e) => setDiagnostico(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label>Motivo de Remisión *</Label>
                  <Textarea
                    placeholder="Describa el motivo por el cual se remite al paciente..."
                    value={motivoRemision}
                    onChange={(e) => setMotivoRemision(e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div>
                  <Label>Especialidad Requerida *</Label>
                  <select
                    value={especialidad}
                    onChange={(e) => setEspecialidad(e.target.value)}
                    className="mt-1 w-full rounded-md border border-gray-200 p-2"
                  >
                    <option value="">Seleccione una especialidad</option>
                    {especialidades.map((esp) => (
                      <option key={esp} value={esp}>{esp}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Prioridad</Label>
                  <div className="flex gap-3 mt-2">
                    {[
                      { value: 'normal', label: 'Normal', color: 'bg-gray-100 text-gray-700 border-gray-200' },
                      { value: 'prioritario', label: 'Prioritario', color: 'bg-amber-100 text-amber-700 border-amber-200' },
                      { value: 'urgente', label: 'Urgente', color: 'bg-red-100 text-red-700 border-red-200' },
                    ].map((p) => (
                      <button
                        key={p.value}
                        onClick={() => setPrioridad(p.value as any)}
                        className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                          prioridad === p.value
                            ? p.color + ' border-current'
                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Seleccionar IPS */}
          {step === 'ips' && (
            <div className="space-y-6">
              <div className="p-4 bg-purple-50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Stethoscope className="h-5 w-5 text-purple-600" />
                  <span className="font-semibold text-purple-900">Especialidad: {especialidad}</span>
                </div>
                <p className="text-sm text-purple-700">{diagnostico}</p>
              </div>

              <div>
                <Label className="text-lg font-semibold">Seleccionar IPS de Destino</Label>
                <p className="text-gray-500 text-sm mb-4">
                  Seleccione la institución donde será atendido el paciente
                </p>
              </div>

              {searchingIps ? (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                  <p className="text-gray-500 mt-2">Buscando IPS disponibles...</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {ipsList.map((ips) => (
                    <div
                      key={ips.id}
                      onClick={() => setSelectedIps(ips)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedIps?.id === ips.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <Hospital className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{ips.nombre}</p>
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {ips.ciudad}, {ips.departamento}
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-purple-100 text-purple-700">
                          {nivelLabels[ips.nivelComplejidad] || ips.nivelComplejidad}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Confirmar */}
          {step === 'confirmar' && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Confirmar Remisión</h2>
                <p className="text-gray-500">Revise los datos antes de crear la remisión</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Paciente */}
                <div className="p-4 bg-blue-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-medium text-blue-600">PACIENTE</span>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {selectedPatient?.firstName} {selectedPatient?.lastName}
                  </p>
                  <p className="text-sm text-gray-600">CC: {selectedPatient?.docNumber}</p>
                </div>

                {/* CAP Origen */}
                <div className="p-4 bg-cyan-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-cyan-600" />
                    <span className="text-xs font-medium text-cyan-600">CAP ORIGEN</span>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {selectedPatient?.capAsignado?.nombre || 'Sin CAP asignado'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {selectedPatient?.capAsignado?.ciudad}
                  </p>
                </div>

                {/* IPS Destino */}
                <div className="p-4 bg-purple-50 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Hospital className="h-4 w-4 text-purple-600" />
                    <span className="text-xs font-medium text-purple-600">IPS DESTINO</span>
                  </div>
                  <p className="font-semibold text-gray-900">{selectedIps?.nombre}</p>
                  <p className="text-sm text-gray-600">
                    {selectedIps?.ciudad} - {nivelLabels[selectedIps?.nivelComplejidad || '']}
                  </p>
                </div>

                {/* Prioridad */}
                <div className={`p-4 rounded-xl ${
                  prioridad === 'urgente' ? 'bg-red-50' :
                  prioridad === 'prioritario' ? 'bg-amber-50' : 'bg-gray-50'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className={`h-4 w-4 ${
                      prioridad === 'urgente' ? 'text-red-600' :
                      prioridad === 'prioritario' ? 'text-amber-600' : 'text-gray-600'
                    }`} />
                    <span className={`text-xs font-medium ${
                      prioridad === 'urgente' ? 'text-red-600' :
                      prioridad === 'prioritario' ? 'text-amber-600' : 'text-gray-600'
                    }`}>PRIORIDAD</span>
                  </div>
                  <p className="font-semibold text-gray-900 capitalize">{prioridad}</p>
                  <p className="text-sm text-gray-600">{especialidad}</p>
                </div>
              </div>

              {/* Diagnóstico */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-gray-600" />
                  <span className="text-xs font-medium text-gray-600">DIAGNÓSTICO</span>
                </div>
                <p className="font-semibold text-gray-900">{diagnostico}</p>
                <p className="text-sm text-gray-600 mt-1">{motivoRemision}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={step === 'paciente'}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>

        {step === 'confirmar' ? (
          <Button
            onClick={createRemision}
            disabled={submitting || !selectedPatient?.capAsignado}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Crear Remisión
          </Button>
        ) : (
          <Button
            onClick={nextStep}
            disabled={!canProceed()}
          >
            Siguiente
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}

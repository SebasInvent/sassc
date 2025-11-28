"use client";

import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AddObservationDialog } from '@/components/dashboard/add-observation-dialog';
import { AddConditionDialog } from '@/components/dashboard/add-condition-dialog';
import { AddPrescriptionDialog } from '@/components/dashboard/add-prescription-dialog';
import { EncounterTimer } from '@/components/dashboard/EncounterTimer';
import { toast } from 'sonner';
import { useState } from 'react';

// --- SWR Fetcher ---
const fetcher = async (url: string, token: string) => {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.');
    // Attach extra info to the error object.
    const errorInfo = await res.json();
    (error as any).info = errorInfo;
    (error as any).status = res.status;
    throw error;
  }
  return res.json();
};

// --- Tipos de Datos ---
type Observation = { id: string; category: string; code: string; valueString: string | null; valueQuantity: number | null; valueUnit: string | null; };
type Condition = { id: string; clinicalStatus: string; verificationStatus: string; code: string; };
type Prescription = { id: string; medicationName: string; dosage: string; frequency: string; status: string; };
type Patient = { firstName: string; lastName: string; docNumber: string; birthDate: string; };
type AppointmentDetails = {
  id: string;
  start: string;
  status: string;
  modality: string;
  patient: Patient;
  encounter: {
    id: string;
    status: string;
    start: string;
    end: string | null;
    observations: Observation[];
    conditions: Condition[];
    prescriptions: Prescription[];
  } | null;
  practitioner?: { id: string; firstName: string; lastName: string; };
};

export default function AppointmentDetailPage() {
  const { token, loading: authLoading } = useAuth();
  const params = useParams();
  const appointmentId = params.id as string;
  const [prescriptionDialogOpen, setPrescriptionDialogOpen] = useState(false);

  const apiUrl = `http://localhost:3001/fhir/Appointment/${appointmentId}`;
  const { data: appointment, error, isLoading, mutate } = useSWR<AppointmentDetails>(
    token ? apiUrl : null,
    (url: string) => fetcher(url, token!)
  );

  const handleFinishEncounter = async () => {
    if (!token || !appointment?.encounter) return;

    try {
      const response = await fetch(`http://localhost:3001/fhir/Encounter/${appointment.encounter.id}/finish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'No se pudo finalizar el encuentro.');
      }

      mutate(); // Re-validar para actualizar la UI
      toast.success('Encuentro finalizado con éxito.');

    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleStartEncounter = async () => {
    if (!token || !appointmentId) return;

    try {
      const response = await fetch('http://localhost:3001/fhir/Encounter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ appointmentId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'No se pudo iniciar el encuentro.');
      }

      // Re-validar los datos para actualizar la UI sin recargar
      mutate();

    } catch (err: any) {
      // Aquí podrías manejar el error, por ejemplo, mostrándolo en un toast
      console.error(err);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' });
  };

  if (authLoading || isLoading) return <div className="p-8">Cargando...</div>;
  if (error) return <div className="p-8 text-red-500">Error: {error}</div>;
  if (!appointment) return <div className="p-8">No se encontró la cita.</div>;

  return (
    <div className="container mx-auto p-8 space-y-8">
      <header className="flex justify-between items-start">
        <div>
          <Link href="/dashboard" className="text-blue-500 hover:underline mb-4 block">{'< Volver al Dashboard'}</Link>
          <h1 className="text-3xl font-bold">Ficha de la Cita</h1>
          <p className="text-gray-500">{formatDateTime(appointment.start)}</p>
          {appointment.encounter && <EncounterTimer start={appointment.encounter.start} end={appointment.encounter.end} />}
        </div>
        <div>
          {!appointment.encounter ? (
            <Button onClick={handleStartEncounter} size="lg">Iniciar Encuentro</Button>
          ) : (
            <Button 
              onClick={handleFinishEncounter} 
              disabled={appointment.encounter.status === 'finished'}
              size="lg"
              variant={appointment.encounter.status === 'finished' ? 'outline' : 'default'}
            >
              {appointment.encounter.status === 'finished' ? 'Encuentro Finalizado' : 'Finalizar Encuentro'}
            </Button>
          )}
        </div>
      </header>

      {/* --- Información del Paciente y Cita -- */}
      <Card>
        <CardHeader>
          <CardTitle>Información General</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div><strong>Paciente:</strong> {`${appointment.patient.firstName} ${appointment.patient.lastName}`}</div>
          <div><strong>Documento:</strong> {appointment.patient.docNumber}</div>
          <div><strong>Modalidad:</strong> <Badge variant="outline">{appointment.modality}</Badge></div>
          <div><strong>Estado:</strong> <Badge>{appointment.status}</Badge></div>
        </CardContent>
      </Card>

      {/* --- Detalles del Encuentro (si existe) -- */}
      {appointment.encounter ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Observaciones</CardTitle>
                <AddObservationDialog 
                  encounterId={appointment.encounter.id}
                  appointment={appointment}
                  mutate={mutate}
                />
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Categoría</TableHead><TableHead>Código</TableHead><TableHead>Valor</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {appointment.encounter.observations.map(obs => (
                      <TableRow key={obs.id}>
                        <TableCell>{obs.category}</TableCell>
                        <TableCell>{obs.code}</TableCell>
                        <TableCell>{obs.valueString || `${obs.valueQuantity} ${obs.valueUnit}`}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Diagnósticos</CardTitle>
                <AddConditionDialog 
                  encounterId={appointment.encounter.id}
                  onConditionAdded={mutate} 
                />
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Estado</TableHead><TableHead>Verificación</TableHead><TableHead>Código</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {appointment.encounter.conditions.map(cond => (
                      <TableRow key={cond.id}>
                        <TableCell>{cond.clinicalStatus}</TableCell>
                        <TableCell>{cond.verificationStatus}</TableCell>
                        <TableCell>{cond.code}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* --- Prescripciones -- */}
          <Card className="mt-8">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Prescripciones</CardTitle>
              {appointment.practitioner && (
                <Button onClick={() => setPrescriptionDialogOpen(true)}>
                  + Prescribir Medicamento
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {appointment.encounter.prescriptions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medicamento</TableHead>
                      <TableHead>Dosis</TableHead>
                      <TableHead>Frecuencia</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointment.encounter.prescriptions.map(presc => (
                      <TableRow key={presc.id}>
                        <TableCell className="font-medium">{presc.medicationName}</TableCell>
                        <TableCell>{presc.dosage}</TableCell>
                        <TableCell>{presc.frequency}</TableCell>
                        <TableCell><Badge variant={presc.status === 'active' ? 'default' : 'outline'}>{presc.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-gray-500 text-center py-4">No hay prescripciones registradas.</p>
              )}
            </CardContent>
          </Card>

          {/* Diálogo de Prescripción */}
          {appointment.practitioner && (
            <AddPrescriptionDialog
              open={prescriptionDialogOpen}
              onOpenChange={setPrescriptionDialogOpen}
              patientId={appointment.patient.docNumber}
              encounterId={appointment.encounter.id}
              practitionerId={appointment.practitioner.id}
              onSuccess={() => mutate()}
            />
          )}
        </>
      ) : (
        <Card className="text-center p-8">
          <CardHeader>
            <CardTitle>Encuentro no iniciado</CardTitle>
            <CardDescription>Esta cita aún no tiene un encuentro clínico asociado. Haga clic en 'Iniciar Encuentro' para comenzar.</CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
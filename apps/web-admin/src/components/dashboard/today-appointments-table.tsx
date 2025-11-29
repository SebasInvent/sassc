'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { API_URL } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

// Tipos de datos para las citas
interface Patient {
  firstName: string;
  lastName: string;
  docNumber: string;
}

interface Appointment {
  id: string;
  start: string;
  modality: string;
  status: 'booked' | 'arrived' | 'finished';
  patient: Patient;
  encounter: { id: string } | null;
}

export function TodayAppointmentsTable() {
  const { token } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    async function fetchTodaysAppointments() {
      try {
        const response = await fetch(`${API_URL}/fhir/Appointment/today`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch today\'s appointments');
        }

        const data = await response.json();
        setAppointments(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchTodaysAppointments();
  }, [token]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (loading) {
    return <div>Cargando citas de hoy...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-base sm:text-lg">Citas para Hoy</CardTitle>
      </CardHeader>
      <CardContent className="p-0 sm:p-6 sm:pt-0">
        {/* Vista móvil: Cards */}
        <div className="block sm:hidden">
          {appointments.length > 0 ? (
            <div className="divide-y">
              {appointments.map((apt) => (
                <div key={apt.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{formatTime(apt.start)}</span>
                    <Badge variant={apt.encounter ? 'default' : 'secondary'} className="text-xs">
                      {apt.encounter ? 'En Consulta' : 'Confirmada'}
                    </Badge>
                  </div>
                  <p className="font-medium">{`${apt.patient.firstName} ${apt.patient.lastName}`}</p>
                  <p className="text-xs text-gray-500">CC: {apt.patient.docNumber} • {apt.modality}</p>
                  <Button asChild variant="outline" size="sm" className="w-full mt-2">
                    <Link href={`/dashboard/encounter/${apt.id}`}>Ver Ficha</Link>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8 px-4">No hay citas programadas para hoy.</p>
          )}
        </div>

        {/* Vista desktop: Tabla */}
        <div className="hidden sm:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hora</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Cédula</TableHead>
                <TableHead>Modalidad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {appointments.length > 0 ? (
                appointments.map((apt) => (
                  <TableRow key={apt.id}>
                    <TableCell className="font-medium">{formatTime(apt.start)}</TableCell>
                    <TableCell>{`${apt.patient.firstName} ${apt.patient.lastName}`}</TableCell>
                    <TableCell>{apt.patient.docNumber}</TableCell>
                    <TableCell>{apt.modality}</TableCell>
                    <TableCell>
                      <Badge variant={apt.encounter ? 'default' : 'secondary'}>
                        {apt.encounter ? 'En Consulta' : 'Confirmada'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/dashboard/encounter/${apt.id}`}>Ver Ficha</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No hay citas programadas para hoy.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
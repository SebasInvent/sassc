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
        const response = await fetch('${API_URL}/fhir/Appointment/today', {
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
      <CardHeader>
        <CardTitle>Citas para Hoy</CardTitle>
      </CardHeader>
      <CardContent>
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
      </CardContent>
    </Card>
  );
}
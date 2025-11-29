"use client";

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Plus, Clock, User, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import useSWR from 'swr';
import Link from 'next/link';
import { ModernDataTable } from '@/components/ModernDataTable';
import { API_URL } from '@/lib/api';

const fetcher = async (url: string, token: string) => {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Error al cargar citas');
  return res.json();
};

interface Patient {
  firstName: string;
  lastName: string;
  docNumber: string;
}

interface Appointment {
  id: string;
  start: string;
  end: string;
  modality: string;
  status: 'booked' | 'arrived' | 'finished' | 'cancelled';
  patient: Patient;
  encounter: { id: string } | null;
}

export default function AppointmentsPage() {
  const { token } = useAuth();
  const [filter, setFilter] = useState<'all' | 'today' | 'upcoming'>('all');

  const { data: appointments, isLoading, mutate } = useSWR<Appointment[]>(
    token ? `${API_URL}/fhir/Appointment` : null,
    (url: string) => fetcher(url, token!)
  );

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      booked: 'default',
      arrived: 'secondary',
      finished: 'outline',
      cancelled: 'destructive',
    };

    const labels: Record<string, string> = {
      booked: 'Agendada',
      arrived: 'Llegó',
      finished: 'Finalizada',
      cancelled: 'Cancelada',
    };

    return (
      <Badge variant={variants[status] || 'default'}>
        {labels[status] || status}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredAppointments = appointments?.filter((apt) => {
    if (filter === 'today') {
      const today = new Date().toDateString();
      return new Date(apt.start).toDateString() === today;
    }
    if (filter === 'upcoming') {
      return new Date(apt.start) > new Date();
    }
    return true;
  });

  const stats = {
    total: appointments?.length || 0,
    today: appointments?.filter(a => new Date(a.start).toDateString() === new Date().toDateString()).length || 0,
    upcoming: appointments?.filter(a => new Date(a.start) > new Date()).length || 0,
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-6 w-6 sm:h-8 sm:w-8" />
            Gestión de Citas
          </h2>
          <p className="text-muted-foreground mt-1">
            Administra todas las citas médicas del sistema
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Cita
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Citas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Citas Hoy</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.today}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximas Citas</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.upcoming}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          Todas ({stats.total})
        </Button>
        <Button
          variant={filter === 'today' ? 'default' : 'outline'}
          onClick={() => setFilter('today')}
        >
          Hoy ({stats.today})
        </Button>
        <Button
          variant={filter === 'upcoming' ? 'default' : 'outline'}
          onClick={() => setFilter('upcoming')}
        >
          Próximas ({stats.upcoming})
        </Button>
      </div>

      {/* Appointments Table */}
      <ModernDataTable
        data={filteredAppointments || []}
        isLoading={isLoading}
        columns={[
          {
            key: 'patient',
            label: 'Paciente',
            render: (appointment: Appointment) => (
              <div className="font-medium">
                {appointment.patient?.firstName || 'N/A'} {appointment.patient?.lastName || ''}
              </div>
            ),
          },
          {
            key: 'docNumber',
            label: 'Documento',
            render: (appointment: Appointment) => appointment.patient?.docNumber || 'N/A',
          },
          {
            key: 'date',
            label: 'Fecha',
            render: (appointment: Appointment) => formatDate(appointment.start),
          },
          {
            key: 'time',
            label: 'Hora',
            render: (appointment: Appointment) => formatTime(appointment.start),
          },
          {
            key: 'modality',
            label: 'Modalidad',
            render: (appointment: Appointment) => (
              <span className="capitalize">{appointment.modality}</span>
            ),
          },
          {
            key: 'status',
            label: 'Estado',
            render: (appointment: Appointment) => getStatusBadge(appointment.status),
          },
          {
            key: 'actions',
            label: 'Acciones',
            render: (appointment: Appointment) => (
              <div className="flex gap-2">
                {appointment.encounter ? (
                  <Link href={`/dashboard/encounters/${appointment.encounter.id}`}>
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4 mr-1" />
                      Ver Encuentro
                    </Button>
                  </Link>
                ) : (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    disabled={appointment.status !== 'arrived'}
                  >
                    Iniciar Atención
                  </Button>
                )}
              </div>
            ),
          },
        ]}
        searchKeys={['patient', 'modality', 'status'] as any}
        emptyMessage={`No hay citas ${filter === 'today' ? 'para hoy' : filter === 'upcoming' ? 'próximas' : 'registradas'}`}
      />
    </div>
  );
}

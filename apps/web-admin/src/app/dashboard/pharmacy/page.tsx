"use client";

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DispenseMedicationDialog } from '@/components/dashboard/dispense-medication-dialog';
import { CreatePrescriptionDialog } from '@/components/dashboard/create-prescription-dialog';
import { Pill, Package, CheckCircle2, Search, Filter } from 'lucide-react';
import { API_URL } from '@/lib/api';

// --- SWR Fetcher ---
const fetcher = async (url: string, token: string) => {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    throw new Error('No se pudieron cargar las prescripciones.');
  }
  return res.json();
};

// --- Tipos de Datos ---
type Patient = {
  firstName: string;
  lastName: string;
  docNumber: string;
};

type Practitioner = {
  firstName: string;
  lastName: string;
  specialty: string;
};

type Prescription = {
  id: string;
  medicationName: string;
  medicationCode: string;
  dosage: string;
  frequency: string;
  duration: number | null;
  status: string;
  createdAt: string;
  patient: Patient;
  practitioner: Practitioner;
};

export default function PharmacyPage() {
  const { token } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('active');

  const apiUrl = `${API_URL}/fhir/MedicationRequest`;
  const { data: prescriptions, error, isLoading, mutate } = useSWR<Prescription[]>(
    token ? apiUrl : null,
    (url: string) => fetcher(url, token!)
  );

  const { data: dispensations } = useSWR<any[]>(
    token ? `${API_URL}/fhir/MedicationDispense` : null,
    (url: string) => fetcher(url, token!)
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filtrar prescripciones
  const filteredPrescriptions = prescriptions?.filter(p => {
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesSearch = searchTerm === '' || 
      `${p.patient.firstName} ${p.patient.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.medicationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.patient.docNumber.includes(searchTerm);
    return matchesStatus && matchesSearch;
  }) || [];

  // Estadísticas
  const stats = {
    total: prescriptions?.filter(p => p.status === 'active').length || 0,
    dispensed: dispensations?.length || 0,
    pending: prescriptions?.filter(p => p.status === 'active').length || 0,
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Pill className="h-6 w-6 sm:h-8 sm:w-8" />
            Farmacia - Dispensación
          </h2>
          <p className="text-muted-foreground mt-1">
            Gestión de prescripciones y dispensación de medicamentos
          </p>
        </div>
        <div className="flex gap-2">
          <CreatePrescriptionDialog onSuccess={() => mutate()} />
          <Link href="/dashboard">
            <Button variant="outline">Volver al Dashboard</Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prescripciones Activas</CardTitle>
            <Pill className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Pendientes de dispensar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dispensadas Hoy</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{stats.dispensed}</div>
            <p className="text-xs text-muted-foreground">Medicamentos entregados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Inventario</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Ver inventario completo</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por paciente, medicamento o documento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={statusFilter === 'active' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('active')}
            size="sm"
          >
            Activas
          </Button>
          <Button
            variant={statusFilter === 'completed' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('completed')}
            size="sm"
          >
            Completadas
          </Button>
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('all')}
            size="sm"
          >
            Todas
          </Button>
        </div>
      </div>

      {/* Prescriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Prescripciones ({filteredPrescriptions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p className="text-center py-8 text-muted-foreground">Cargando prescripciones...</p>}
          {error && <p className="text-center py-8 text-red-500">Error al cargar las prescripciones.</p>}
          {!isLoading && filteredPrescriptions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Medicamento</TableHead>
                  <TableHead>Dosis</TableHead>
                  <TableHead>Frecuencia</TableHead>
                  <TableHead>Prescrito por</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPrescriptions.map((prescription) => (
                  <TableRow key={prescription.id}>
                    <TableCell className="font-medium">
                      {`${prescription.patient.firstName} ${prescription.patient.lastName}`}
                    </TableCell>
                    <TableCell>{prescription.patient.docNumber}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{prescription.medicationName}</p>
                        {prescription.medicationCode !== 'N/A' && (
                          <p className="text-xs text-gray-500">{prescription.medicationCode}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{prescription.dosage}</TableCell>
                    <TableCell>{prescription.frequency}</TableCell>
                    <TableCell>
                      <div>
                        <p>{`${prescription.practitioner.firstName} ${prescription.practitioner.lastName}`}</p>
                        <p className="text-xs text-gray-500">{prescription.practitioner.specialty}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(prescription.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant="default">{prescription.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <DispenseMedicationDialog
                        prescriptionId={prescription.id}
                        patientId={prescription.patient.docNumber}
                        medicationName={prescription.medicationName}
                        onSuccess={() => mutate()}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : !isLoading ? (
            <p className="text-center text-muted-foreground py-8">
              {searchTerm ? 'No se encontraron prescripciones con ese criterio de búsqueda.' : 'No hay prescripciones disponibles.'}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

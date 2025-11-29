"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useAuth } from '@/context/AuthContext';
import { ModernDataTable, Column } from '@/components/ModernDataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ApproveAuthorizationDialog } from '@/components/dashboard/approve-authorization-dialog';
import { DenyAuthorizationDialog } from '@/components/dashboard/deny-authorization-dialog';
import { AuthorizationDetailDialog } from '@/components/dashboard/authorization-detail-dialog';
import { AlertCircle, FileCheck, Clock, CheckCircle2, XCircle, ArrowLeft, Eye, Calendar, User, AlertTriangle, Search } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { API_URL } from '@/lib/api';

// --- SWR Fetcher ---
const fetcher = async (url: string, token: string) => {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    throw new Error('No se pudieron cargar las autorizaciones.');
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
};

type Prescription = {
  medicationName: string;
  dosage: string;
};

type Authorization = {
  id: string;
  authorizationNumber: string | null;
  requestDate: string;
  responseDate: string | null;
  status: string;
  priority: string;
  justification: string;
  diagnosis: string;
  insuranceEntity: string | null;
  approvedQuantity: number | null;
  denialReason: string | null;
  validUntil: string | null;
  patient: Patient;
  prescription: Prescription;
  requester: Practitioner;
  reviewer: Practitioner | null;
};

export default function AuthorizationsPage() {
  const { token } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'denied'>('all');
  const [selectedAuth, setSelectedAuth] = useState<Authorization | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [denyDialogOpen, setDenyDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const apiUrl = `${API_URL}/fhir/Authorization`;
  const { data: authorizations, error, isLoading, mutate } = useSWR<Authorization[]>(
    apiUrl, // Temporalmente sin verificar token
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Error al cargar autorizaciones');
      return res.json();
    }
  );

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-CO', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      pending: 'outline',
      approved: 'default',
      denied: 'destructive',
      cancelled: 'secondary'
    };
    const labels: Record<string, string> = {
      pending: 'Pendiente',
      approved: 'Aprobada',
      denied: 'Negada',
      cancelled: 'Cancelada'
    };
    return <Badge variant={variants[status] || 'outline'}>{labels[status] || status}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    return priority === 'urgent' 
      ? <Badge variant="destructive">Urgente</Badge>
      : <Badge variant="outline">Rutina</Badge>;
  };

  const handleApprove = (auth: Authorization) => {
    setSelectedAuth(auth);
    setApproveDialogOpen(true);
  };

  const handleDeny = (auth: Authorization) => {
    setSelectedAuth(auth);
    setDenyDialogOpen(true);
  };

  const handleViewDetail = (auth: Authorization) => {
    setSelectedAuth(auth);
    setDetailDialogOpen(true);
  };

  // Filtrar autorizaciones
  const filteredAuthorizations = authorizations?.filter(auth => {
    const matchesStatus = statusFilter === 'all' || auth.status === statusFilter;
    const matchesSearch = searchTerm === '' ||
      `${auth.patient.firstName} ${auth.patient.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      auth.prescription.medicationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      auth.patient.docNumber.includes(searchTerm) ||
      auth.authorizationNumber?.includes(searchTerm);
    return matchesStatus && matchesSearch;
  }) || [];

  const pendingAuths = authorizations?.filter(a => a.status === 'pending') || [];
  const urgentPending = pendingAuths.filter(a => a.priority === 'urgent');
  const approvedAuths = authorizations?.filter(a => a.status === 'approved') || [];
  const deniedAuths = authorizations?.filter(a => a.status === 'denied') || [];

  // Manejo de estados de carga y error
  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando autorizaciones...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 space-y-6 p-8 pt-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error al cargar autorizaciones</AlertTitle>
          <AlertDescription>
            {error.message || 'No se pudieron cargar las autorizaciones. Por favor, verifica tu conexión e intenta nuevamente.'}
            <br /><br />
            <strong>Nota:</strong> Este módulo requiere autenticación. Asegúrate de haber iniciado sesión correctamente.
          </AlertDescription>
        </Alert>
        <Link href="/dashboard">
          <Button variant="outline">Volver al Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileCheck className="h-8 w-8" />
            Autorizaciones de Medicamentos
          </h2>
          <p className="text-muted-foreground mt-1">
            Gestión de solicitudes de autorización y aprobaciones
          </p>
        </div>
        <Link href="/dashboard">
          <Button variant="outline">Volver al Dashboard</Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{authorizations?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Autorizaciones registradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pendingAuths.length}</div>
            <p className="text-xs text-muted-foreground">Esperando revisión</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprobadas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{approvedAuths.length}</div>
            <p className="text-xs text-muted-foreground">Autorizaciones activas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Negadas</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{deniedAuths.length}</div>
            <p className="text-xs text-muted-foreground">Solicitudes rechazadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerta Urgente */}
      {urgentPending.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>⚠️ Autorizaciones Urgentes Pendientes</AlertTitle>
          <AlertDescription>
            Hay {urgentPending.length} autorización(es) urgente(s) que requieren atención inmediata.
          </AlertDescription>
        </Alert>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por paciente, medicamento, N° autorización..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={statusFilter === 'pending' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('pending')}
            size="sm"
          >
            Pendientes ({pendingAuths.length})
          </Button>
          <Button
            variant={statusFilter === 'approved' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('approved')}
            size="sm"
          >
            Aprobadas ({approvedAuths.length})
          </Button>
          <Button
            variant={statusFilter === 'denied' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('denied')}
            size="sm"
          >
            Negadas ({deniedAuths.length})
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

      {/* Tabla de Autorizaciones */}
      <ModernDataTable
        data={filteredAuthorizations}
        isLoading={isLoading}
        columns={[
          {
            key: 'authorizationNumber',
            label: 'N° Autorización',
            render: (auth: Authorization) => (
              <span className="font-mono text-sm">{auth.authorizationNumber || 'Pendiente'}</span>
            ),
          },
          {
            key: 'patient',
            label: 'Paciente',
            render: (auth: Authorization) => (
              <div>
                <p className="font-medium">{`${auth.patient.firstName} ${auth.patient.lastName}`}</p>
                <p className="text-xs text-gray-500">{auth.patient.docNumber}</p>
              </div>
            ),
          },
          {
            key: 'medication',
            label: 'Medicamento',
            render: (auth: Authorization) => (
              <div>
                <p className="font-medium">{auth.prescription.medicationName}</p>
                <p className="text-xs text-gray-500">{auth.prescription.dosage}</p>
              </div>
            ),
          },
          {
            key: 'diagnosis',
            label: 'Diagnóstico',
            render: (auth: Authorization) => (
              <span className="text-sm max-w-xs truncate" title={auth.diagnosis}>{auth.diagnosis}</span>
            ),
          },
          {
            key: 'requester',
            label: 'Solicitante',
            render: (auth: Authorization) => (
              <span className="text-sm">{`${auth.requester.firstName} ${auth.requester.lastName}`}</span>
            ),
          },
          {
            key: 'requestDate',
            label: 'Fecha',
            render: (auth: Authorization) => (
              <span className="text-sm">{formatDate(auth.requestDate)}</span>
            ),
          },
          {
            key: 'priority',
            label: 'Prioridad',
            render: (auth: Authorization) => getPriorityBadge(auth.priority),
          },
          {
            key: 'status',
            label: 'Estado',
            render: (auth: Authorization) => getStatusBadge(auth.status),
          },
          {
            key: 'actions',
            label: 'Acciones',
            render: (auth: Authorization) => (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleViewDetail(auth)}
                    title="Ver detalles completos"
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                  {auth.status === 'pending' && (
                    <>
                      <Button 
                        size="sm" 
                        variant="default"
                        onClick={() => handleApprove(auth)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Aprobar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => handleDeny(auth)}
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Negar
                      </Button>
                    </>
                  )}
                </div>
                {auth.status === 'approved' && (
                  <div className="text-sm text-green-600">
                    ✓ Aprobada: {auth.approvedQuantity} unidades
                  </div>
                )}
                {auth.status === 'denied' && (
                  <div className="text-sm text-red-600" title={auth.denialReason || ''}>
                    ✗ Negada
                  </div>
                )}
              </div>
            ),
          },
        ]}
        searchKeys={['patient', 'prescription', 'status'] as any}
        emptyMessage={searchTerm ? 'No se encontraron autorizaciones con ese criterio.' : 'No hay autorizaciones registradas.'}
      />

      {/* Dialogs */}
      {selectedAuth && (
        <>
          <ApproveAuthorizationDialog
            open={approveDialogOpen}
            onOpenChange={setApproveDialogOpen}
            authorization={selectedAuth}
            onSuccess={() => mutate()}
          />
          <DenyAuthorizationDialog
            open={denyDialogOpen}
            onOpenChange={setDenyDialogOpen}
            authorization={selectedAuth}
            onSuccess={() => mutate()}
          />
          <AuthorizationDetailDialog
            open={detailDialogOpen}
            onOpenChange={setDetailDialogOpen}
            authorization={selectedAuth}
            onUpdate={() => mutate()}
          />
        </>
      )}
    </div>
  );
}

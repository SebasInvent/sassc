"use client";

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ModernDataTable } from '@/components/ModernDataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Scan, 
  FileText, 
  Clock, 
  CheckCircle2, 
  Search, 
  Plus,
  Eye,
  AlertCircle,
  FileUp
} from 'lucide-react';
import { API_URL } from '@/lib/api';
import { CreateImagingOrderDialog } from '@/components/dashboard/create-imaging-order-dialog';
import { UploadImagingResultDialog } from '@/components/dashboard/upload-imaging-result-dialog';
import { ImagingOrderDetailDialog } from '@/components/dashboard/imaging-order-detail-dialog';

const fetcher = async (url: string, token: string) => {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Error al cargar órdenes');
  return res.json();
};

type Patient = {
  firstName: string;
  lastName: string;
  docNumber: string;
};

type Practitioner = {
  firstName: string;
  lastName: string;
  specialty?: string;
};

type ImagingOrder = {
  id: string;
  orderDate: string;
  studyType: string;
  bodyRegion: string;
  clinicalInfo?: string;
  priority: string;
  status: string;
  scheduledDate?: string;
  notes?: string;
  patient: Patient;
  practitioner: Practitioner;
  results?: any[];
};

export default function ImagingPage() {
  const { token } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'scheduled' | 'in_progress' | 'completed'>('all');
  const [createOrderOpen, setCreateOrderOpen] = useState(false);
  const [uploadResultOpen, setUploadResultOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ImagingOrder | null>(null);

  const { data: orders, isLoading, mutate } = useSWR<ImagingOrder[]>(
    token ? '${API_URL}/fhir/Imaging/orders' : null,
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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'destructive',
      scheduled: 'default',
      in_progress: 'default',
      completed: 'secondary',
      cancelled: 'outline',
    };

    const labels: Record<string, string> = {
      pending: 'Pendiente',
      scheduled: 'Programado',
      in_progress: 'En Proceso',
      completed: 'Completado',
      cancelled: 'Cancelado',
    };

    return <Badge variant={variants[status] || 'outline'}>{labels[status] || status}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    if (priority === 'stat') {
      return <Badge variant="destructive">🚨 STAT</Badge>;
    }
    return priority === 'urgent' 
      ? <Badge variant="destructive">⚡ Urgente</Badge>
      : <Badge variant="outline">Rutina</Badge>;
  };

  const getStudyTypeIcon = (studyType: string) => {
    const type = studyType.toLowerCase();
    if (type.includes('x-ray') || type.includes('rayos')) return '📷';
    if (type.includes('ct') || type.includes('tac')) return '🔄';
    if (type.includes('mri') || type.includes('resonancia')) return '🧲';
    if (type.includes('ultrasound') || type.includes('eco')) return '📡';
    if (type.includes('mammo')) return '🩺';
    return '🔬';
  };

  // Filtrar órdenes
  const filteredOrders = orders?.filter(order => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesSearch = searchTerm === '' ||
      `${order.patient.firstName} ${order.patient.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.patient.docNumber.includes(searchTerm) ||
      order.studyType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.bodyRegion.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  }) || [];

  // Estadísticas
  const stats = {
    total: orders?.length || 0,
    pending: orders?.filter(o => o.status === 'pending').length || 0,
    scheduled: orders?.filter(o => o.status === 'scheduled').length || 0,
    completed: orders?.filter(o => o.status === 'completed').length || 0,
  };

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Scan className="h-8 w-8" />
            Imágenes Diagnósticas
          </h2>
          <p className="text-muted-foreground mt-1">
            Gestión de órdenes de radiología y estudios imagenológicos
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setCreateOrderOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Orden
          </Button>
          <Link href="/dashboard">
            <Button variant="outline">Volver al Dashboard</Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Órdenes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Estudios registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Sin programar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Programados</CardTitle>
            <Scan className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.scheduled}</div>
            <p className="text-xs text-muted-foreground">Agendados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completados</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">Con resultados</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por paciente, documento, tipo de estudio o región..."
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
            Pendientes ({stats.pending})
          </Button>
          <Button
            variant={statusFilter === 'scheduled' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('scheduled')}
            size="sm"
          >
            Programados ({stats.scheduled})
          </Button>
          <Button
            variant={statusFilter === 'completed' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('completed')}
            size="sm"
          >
            Completados ({stats.completed})
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

      {/* Orders Table */}
      <ModernDataTable
        data={filteredOrders}
        isLoading={isLoading}
        columns={[
          {
            key: 'patient',
            label: 'Paciente',
            render: (order: ImagingOrder) => (
              <div>
                <p className="font-medium">{order.patient.firstName} {order.patient.lastName}</p>
                <p className="text-xs text-gray-500">{order.patient.docNumber}</p>
              </div>
            ),
          },
          {
            key: 'studyType',
            label: 'Estudio',
            render: (order: ImagingOrder) => (
              <div className="flex items-center gap-2">
                <span className="text-xl">{getStudyTypeIcon(order.studyType)}</span>
                <span className="font-medium">{order.studyType}</span>
              </div>
            ),
          },
          {
            key: 'bodyRegion',
            label: 'Región',
            render: (order: ImagingOrder) => (
              <span className="capitalize">{order.bodyRegion}</span>
            ),
          },
          {
            key: 'orderDate',
            label: 'Fecha',
            render: (order: ImagingOrder) => (
              <span className="text-sm">{formatDate(order.orderDate)}</span>
            ),
          },
          {
            key: 'practitioner',
            label: 'Médico',
            render: (order: ImagingOrder) => (
              <span className="text-sm">
                Dr. {order.practitioner.firstName} {order.practitioner.lastName}
              </span>
            ),
          },
          {
            key: 'priority',
            label: 'Prioridad',
            render: (order: ImagingOrder) => getPriorityBadge(order.priority),
          },
          {
            key: 'status',
            label: 'Estado',
            render: (order: ImagingOrder) => getStatusBadge(order.status),
          },
          {
            key: 'actions',
            label: 'Acciones',
            render: (order: ImagingOrder) => (
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  title="Ver detalles"
                  onClick={() => {
                    setSelectedOrder(order);
                    setDetailOpen(true);
                  }}
                >
                  <Eye className="h-3 w-3" />
                </Button>
                {(order.status === 'scheduled' || order.status === 'in_progress' || order.status === 'pending') && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      setSelectedOrder(order);
                      setUploadResultOpen(true);
                    }}
                  >
                    <FileUp className="h-3 w-3 mr-1" />
                    Subir
                  </Button>
                )}
              </div>
            ),
          },
        ]}
        searchKeys={['patient', 'studyType', 'bodyRegion', 'status'] as any}
        emptyMessage={searchTerm ? 'No se encontraron órdenes con ese criterio' : 'No hay órdenes de imagenología'}
      />

      {/* Dialogs */}
      <CreateImagingOrderDialog
        open={createOrderOpen}
        onOpenChange={setCreateOrderOpen}
        onSuccess={() => mutate()}
      />

      {selectedOrder && (
        <>
          <UploadImagingResultDialog
            open={uploadResultOpen}
            onOpenChange={setUploadResultOpen}
            order={selectedOrder}
            onSuccess={() => {
              mutate();
              setUploadResultOpen(false);
            }}
          />

          <ImagingOrderDetailDialog
            open={detailOpen}
            onOpenChange={setDetailOpen}
            order={selectedOrder}
          />
        </>
      )}
    </div>
  );
}

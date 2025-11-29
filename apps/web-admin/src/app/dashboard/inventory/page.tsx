"use client";

import Link from 'next/link';
import useSWR from 'swr';
import { useAuth } from '@/context/AuthContext';
import { ModernDataTable, Column } from '@/components/ModernDataTable';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AddInventoryDialog } from '@/components/dashboard/add-inventory-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, AlertTriangle, Package, ArrowLeft, Calendar, DollarSign } from 'lucide-react';
import { UserMenu } from '@/components/UserMenu';
import { NotificationsBell } from '@/components/dashboard/notifications-bell';
import { API_URL } from '@/lib/api';

// --- SWR Fetcher ---
const fetcher = async (url: string, token: string) => {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    throw new Error('No se pudieron cargar los datos del inventario.');
  }
  return res.json();
};

// --- Tipos de Datos ---
type InventoryItem = {
  id: string;
  medicationCode: string;
  medicationName: string;
  presentation: string;
  quantity: number;
  quantityUnit: string;
  minQuantity: number;
  batchNumber: string | null;
  expiryDate: string | null;
  location: string | null;
  supplier: string | null;
  unitPrice: number | null;
  totalValue: number | null;
  status: string;
  createdAt: string;
};

export default function InventoryPage() {
  const { token } = useAuth();

  const apiUrl = `${API_URL}/fhir/Inventory`;
  const { data: inventory, error, isLoading, mutate } = useSWR<InventoryItem[]>(
    token ? apiUrl : null,
    (url: string) => fetcher(url, token!)
  );

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-CO', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('es-CO', { 
      style: 'currency', 
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
      available: 'default',
      low_stock: 'destructive',
      expired: 'outline',
      discontinued: 'secondary'
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const isExpiringSoon = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return new Date(expiryDate) <= thirtyDaysFromNow && new Date(expiryDate) >= new Date();
  };

  // Filtros
  const lowStockItems = inventory?.filter(item => item.status === 'low_stock' || item.quantity <= item.minQuantity) || [];
  const expiringSoonItems = inventory?.filter(item => isExpiringSoon(item.expiryDate)) || [];
  const expiredItems = inventory?.filter(item => item.status === 'expired') || [];

  // Definir columnas para la tabla
  const columns: Column<InventoryItem>[] = [
    {
      key: 'medicationName',
      label: 'Medicamento',
      render: (item) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            {item.medicationName[0]}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{item.medicationName}</p>
            <p className="text-xs text-gray-500">{item.presentation}</p>
          </div>
        </div>
      )
    },
    {
      key: 'quantity',
      label: 'Stock',
      render: (item) => (
        <div>
          <Badge className={item.quantity <= item.minQuantity ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}>
            {item.quantity} {item.quantityUnit}
          </Badge>
          <p className="text-xs text-gray-500 mt-1">Mín: {item.minQuantity}</p>
        </div>
      )
    },
    {
      key: 'batchNumber',
      label: 'Lote',
      render: (item) => (
        <Badge variant="outline" className="font-mono">
          {item.batchNumber || 'N/A'}
        </Badge>
      )
    },
    {
      key: 'expiryDate',
      label: 'Vencimiento',
      render: (item) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className={isExpiringSoon(item.expiryDate) ? 'text-orange-600 font-semibold' : 'text-gray-600'}>
            {formatDate(item.expiryDate)}
          </span>
        </div>
      )
    },
    {
      key: 'unitPrice',
      label: 'Precio',
      render: (item) => (
        <div className="flex items-center gap-1 text-gray-700">
          <DollarSign className="h-4 w-4" />
          {formatCurrency(item.unitPrice)}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Estado',
      render: (item) => getStatusBadge(item.status)
    },
  ];

  return (
    <div>
      {/* Modern Header */}
      <div className="bg-gradient-to-r from-slate-800 via-teal-900 to-cyan-900 shadow-xl">
        <div className="container mx-auto px-8 py-6">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors mb-4 group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Volver al Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Package className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white">Inventario de Medicamentos</h1>
                <p className="text-cyan-100 mt-1">Gestión y control de stock de farmacia</p>
              </div>
            </div>
            <AddInventoryDialog onSuccess={() => mutate()} />
          </div>
        </div>
      </div>

      <div className="container mx-auto p-8 space-y-6">
        {/* Alertas */}
      {(lowStockItems.length > 0 || expiringSoonItems.length > 0 || expiredItems.length > 0) && (
        <div className="space-y-4">
          {lowStockItems.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Stock Bajo</AlertTitle>
              <AlertDescription>
                Hay {lowStockItems.length} medicamento(s) con stock bajo que requieren reabastecimiento.
              </AlertDescription>
            </Alert>
          )}

          {expiringSoonItems.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Próximos a Vencer</AlertTitle>
              <AlertDescription>
                Hay {expiringSoonItems.length} medicamento(s) que vencerán en los próximos 30 días.
              </AlertDescription>
            </Alert>
          )}

          {expiredItems.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Medicamentos Vencidos</AlertTitle>
              <AlertDescription>
                Hay {expiredItems.length} medicamento(s) vencidos que deben ser retirados del inventario.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

        {/* Tabla de Inventario con ModernDataTable */}
        <ModernDataTable
          data={inventory}
          columns={columns}
          isLoading={isLoading}
          error={error}
          searchPlaceholder="Buscar por medicamento, código o lote..."
          searchKeys={['medicationName', 'medicationCode', 'batchNumber']}
          emptyMessage="No hay medicamentos en el inventario"
          emptyIcon={<Package className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />}
        />
      </div>
    </div>
  );
}

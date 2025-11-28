"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import useSWR from 'swr';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

const fetcher = async (url: string, token: string) => {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Error al cargar stock');
  return res.json();
};

type InventoryItem = {
  id: string;
  medicationName: string;
  quantity: number;
  minQuantity: number;
  status: string;
};

export function CriticalStockWidget() {
  const { token } = useAuth();

  const { data: lowStock, isLoading } = useSWR<InventoryItem[]>(
    token ? 'http://localhost:3001/fhir/Inventory/low-stock' : null,
    (url: string) => fetcher(url, token!)
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Stock Crítico
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </CardContent>
      </Card>
    );
  }

  const criticalItems = lowStock?.slice(0, 5) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Stock Crítico
          {criticalItems.length > 0 && (
            <Badge variant="destructive" className="ml-auto">
              {criticalItems.length}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>Medicamentos con stock bajo</CardDescription>
      </CardHeader>
      <CardContent>
        {criticalItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">✓ No hay alertas de stock</p>
        ) : (
          <div className="space-y-3">
            {criticalItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2 rounded-lg bg-red-50 border border-red-200"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <div>
                    <p className="font-medium text-sm">{item.medicationName}</p>
                    <p className="text-xs text-muted-foreground">
                      Stock: {item.quantity} / Mínimo: {item.minQuantity}
                    </p>
                  </div>
                </div>
                <Badge variant="destructive" className="text-xs">
                  Bajo
                </Badge>
              </div>
            ))}
            {lowStock && lowStock.length > 5 && (
              <Link href="/dashboard/inventory">
                <p className="text-sm text-blue-600 hover:underline cursor-pointer">
                  Ver todos ({lowStock.length})
                </p>
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
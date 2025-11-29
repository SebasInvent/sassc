"use client";

import { useState, useEffect } from 'react';
import { Bell, FileCheck, Package, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { API_URL } from '@/lib/api';
import useSWR from 'swr';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

const fetcher = async (url: string, token: string) => {
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return [];
    return res.json();
  } catch (error) {
    // Silenciar errores de red
    return [];
  }
};

export function NotificationsBell() {
  const { token } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Notificaciones del sistema SASSC
  const { data: resumen } = useSWR(
    token ? '${API_URL}/notificaciones/resumen' : null,
    (url: string) => fetcher(url, token!),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
      refreshInterval: 30000, // Actualizar cada 30 segundos
    }
  );

  const totalNotifications = resumen?.totalAlertas || 0;
  const controlesVencidos = resumen?.controlesVencidos || 0;
  const pagosPendientes = resumen?.pagosPendientes || 0;
  const remisionesEnProceso = resumen?.remisionesEnProceso || 0;

  // Evitar error de hidratación
  if (!mounted) {
    return (
      <div className="p-2.5 rounded-xl bg-gray-100 border border-gray-200">
        <Bell className="h-5 w-5 text-gray-700" />
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative p-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-all duration-300 hover:scale-110 group">
          <Bell className={`h-5 w-5 text-gray-700 transition-transform duration-300 ${
            totalNotifications > 0 ? 'animate-pulse' : ''
          } group-hover:rotate-12`} />
          {totalNotifications > 0 && (
            <div className="absolute -top-1 -right-1 h-5 w-5 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg animate-bounce">
              {totalNotifications > 9 ? '9+' : totalNotifications}
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-96 p-0 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              <h3 className="font-bold text-lg">Notificaciones</h3>
            </div>
            {totalNotifications > 0 && (
              <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                {totalNotifications} nueva(s)
              </Badge>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-96 overflow-y-auto">
          {totalNotifications === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-900">Todo al día</p>
              <p className="text-xs text-gray-500 mt-1">No tienes notificaciones pendientes</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {/* Controles Vencidos */}
              {controlesVencidos > 0 && (
                <Link href="/dashboard/preventivo" className="block">
                  <div className="p-4 hover:bg-red-50 transition-colors duration-200 group cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-gray-900 text-sm">Controles Vencidos</p>
                          <Badge className="bg-red-100 text-red-700 hover:bg-red-200">
                            {controlesVencidos}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600">
                          {controlesVencidos} control{controlesVencidos !== 1 ? 'es' : ''} preventivo{controlesVencidos !== 1 ? 's' : ''} vencido{controlesVencidos !== 1 ? 's' : ''}
                        </p>
                        <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>Requiere atención urgente</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              {/* Pagos Pendientes */}
              {pagosPendientes > 0 && (
                <Link href="/dashboard/financiero" className="block">
                  <div className="p-4 hover:bg-amber-50 transition-colors duration-200 group cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-amber-100 rounded-lg group-hover:bg-amber-200 transition-colors">
                        <Package className="h-5 w-5 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-gray-900 text-sm">Pagos Pendientes</p>
                          <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200">
                            {pagosPendientes}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600">
                          {pagosPendientes} pago{pagosPendientes !== 1 ? 's' : ''} esperando firma biométrica
                        </p>
                        <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                          <FileCheck className="h-3 w-3" />
                          <span>Requiere aprobación</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              {/* Remisiones en Proceso */}
              {remisionesEnProceso > 0 && (
                <Link href="/dashboard/remisiones" className="block">
                  <div className="p-4 hover:bg-blue-50 transition-colors duration-200 group cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                        <FileCheck className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-gray-900 text-sm">Remisiones en Proceso</p>
                          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">
                            {remisionesEnProceso}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600">
                          {remisionesEnProceso} remisi{remisionesEnProceso !== 1 ? 'ones' : 'ón'} en tránsito
                        </p>
                        <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>Seguimiento activo</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {totalNotifications > 0 && (
          <div className="p-3 bg-gray-50 border-t border-gray-100">
            <Link 
              href="/dashboard/preventivo" 
              className="block text-center text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              Ver todas las alertas
            </Link>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
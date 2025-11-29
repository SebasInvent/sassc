"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { API_URL } from '@/lib/api';
import {
  Bell,
  AlertTriangle,
  Info,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  Check,
} from 'lucide-react';

interface Notificacion {
  id: string;
  tipo: 'alerta' | 'info' | 'exito' | 'advertencia';
  titulo: string;
  mensaje: string;
  entidadTipo?: string;
  entidadId?: string;
  leida: boolean;
  fecha: string;
  accion?: string;
}

interface Resumen {
  controlesVencidos: number;
  pagosPendientes: number;
  remisionesEnProceso: number;
  firmasHoy: number;
  totalAlertas: number;
}

const tipoConfig = {
  alerta: {
    icon: AlertTriangle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
  advertencia: {
    icon: AlertCircle,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  info: {
    icon: Info,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  exito: {
    icon: CheckCircle2,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
  },
};

export function NotificacionesBell() {
  const { token } = useAuth();
  const router = useRouter();
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchNotificaciones = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [notifRes, resumenRes] = await Promise.all([
        fetch(`${API_URL}/notificaciones`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/notificaciones/resumen`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (notifRes.ok) setNotificaciones(await notifRes.json());
      if (resumenRes.ok) setResumen(await resumenRes.json());
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotificaciones();
    // Actualizar cada 30 segundos
    const interval = setInterval(fetchNotificaciones, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const handleNotificacionClick = (notif: Notificacion) => {
    if (notif.accion) {
      router.push(notif.accion);
      setOpen(false);
    }
  };

  const marcarTodasLeidas = async () => {
    try {
      await fetch(`${API_URL}/notificaciones/leer-todas`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchNotificaciones();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const formatFecha = (fecha: string) => {
    const date = new Date(fecha);
    const ahora = new Date();
    const diff = ahora.getTime() - date.getTime();
    const minutos = Math.floor(diff / 60000);
    const horas = Math.floor(diff / 3600000);
    const dias = Math.floor(diff / 86400000);

    if (minutos < 60) return `Hace ${minutos} min`;
    if (horas < 24) return `Hace ${horas}h`;
    if (dias < 7) return `Hace ${dias}d`;
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  };

  const totalAlertas = resumen?.totalAlertas || 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {totalAlertas > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-medium">
              {totalAlertas > 9 ? '9+' : totalAlertas}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold text-gray-900">Notificaciones</h3>
            <p className="text-xs text-gray-500">
              {totalAlertas} alertas pendientes
            </p>
          </div>
          {notificaciones.length > 0 && (
            <Button variant="ghost" size="sm" onClick={marcarTodasLeidas}>
              <Check className="h-4 w-4 mr-1" />
              Marcar leídas
            </Button>
          )}
        </div>

        {/* Resumen rápido */}
        {resumen && (
          <div className="grid grid-cols-4 gap-2 p-3 bg-gray-50 border-b">
            <div className="text-center">
              <p className="text-lg font-bold text-red-600">{resumen.controlesVencidos}</p>
              <p className="text-xs text-gray-500">Vencidos</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-amber-600">{resumen.pagosPendientes}</p>
              <p className="text-xs text-gray-500">Pagos</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-blue-600">{resumen.remisionesEnProceso}</p>
              <p className="text-xs text-gray-500">Remisiones</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-emerald-600">{resumen.firmasHoy}</p>
              <p className="text-xs text-gray-500">Firmas</p>
            </div>
          </div>
        )}

        {/* Lista de notificaciones */}
        <div className="max-h-80 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">
              <Clock className="h-8 w-8 mx-auto mb-2 animate-spin" />
              Cargando...
            </div>
          ) : notificaciones.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              No hay notificaciones
            </div>
          ) : (
            notificaciones.map((notif) => {
              const config = tipoConfig[notif.tipo];
              const Icon = config.icon;

              return (
                <div
                  key={notif.id}
                  className={`p-3 border-b hover:bg-gray-50 cursor-pointer transition-colors ${
                    !notif.leida ? 'bg-blue-50/30' : ''
                  }`}
                  onClick={() => handleNotificacionClick(notif)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${config.bg}`}>
                      <Icon className={`h-4 w-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {notif.titulo}
                        </p>
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                          {formatFecha(notif.fecha)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{notif.mensaje}</p>
                    </div>
                    {notif.accion && (
                      <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {notificaciones.length > 0 && (
          <div className="p-3 border-t bg-gray-50">
            <Button
              variant="ghost"
              className="w-full text-sm"
              onClick={() => {
                router.push('/dashboard/preventivo');
                setOpen(false);
              }}
            >
              Ver todas las alertas
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

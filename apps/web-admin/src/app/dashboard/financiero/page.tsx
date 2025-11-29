"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { API_URL } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DollarSign,
  TrendingUp,
  Building2,
  Hospital,
  ArrowRight,
  PieChart,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  Plus,
  Loader2,
  RefreshCw,
  Send,
  XCircle,
  ScanFace,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import { FirmaBiometrica } from '@/components/FirmaBiometrica';

interface Estadisticas {
  presupuestoNacional: number;
  presupuestoEjecutado: number;
  porcentajeEjecucion: string;
  upcPromedio: number;
  totalAfiliados: number;
  totalCaps: number;
  totalIps: number;
  pagosDelMes: { monto: number; cantidad: number };
  deudaPendiente: { monto: number; cantidad: number };
  regionales: Array<{
    id: string;
    nombre: string;
    departamento: string;
    presupuesto: number;
    ejecutado: number;
    caps: number;
    ips: number;
  }>;
}

interface Pago {
  id: string;
  concepto: string;
  monto: number;
  estado: string;
  fechaPago: string;
  numeroFactura?: string;
  periodo?: string;
  ipsDestinoId: string;
  adresRegional: {
    id: string;
    nombre: string;
    departamento: string;
  };
}

interface IPS {
  id: string;
  nombre: string;
  ciudad: string;
}

const formatCurrency = (value: number) => {
  if (value >= 1000000000000) {
    return `$${(value / 1000000000000).toFixed(1)}B`;
  }
  if (value >= 1000000000) {
    return `$${(value / 1000000000).toFixed(1)}MM`;
  }
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  return `$${value.toLocaleString()}`;
};

export default function FinancieroPage() {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [estadisticas, setEstadisticas] = useState<Estadisticas | null>(null);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [ipsList, setIpsList] = useState<IPS[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [procesando, setProcesando] = useState<string | null>(null);
  
  // Estado para firma biométrica
  const [firmaOpen, setFirmaOpen] = useState(false);
  const [pagoAFirmar, setPagoAFirmar] = useState<Pago | null>(null);
  
  // Form state para nuevo pago
  const [nuevoPago, setNuevoPago] = useState({
    adresRegionalId: '',
    ipsDestinoId: '',
    concepto: '',
    monto: '',
    numeroFactura: '',
    periodo: '',
  });

  const fetchData = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      // Obtener estadísticas
      const statsRes = await fetch(`${API_URL}/adres/estadisticas`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (statsRes.ok) {
        const data = await statsRes.json();
        setEstadisticas(data);
      }

      // Obtener pagos
      const pagosRes = await fetch(`${API_URL}/adres/pagos`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (pagosRes.ok) {
        const data = await pagosRes.json();
        setPagos(data);
      }

      // Obtener lista de IPS
      const ipsRes = await fetch(`${API_URL}/ips`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ipsRes.ok) {
        const data = await ipsRes.json();
        setIpsList(data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const crearPago = async () => {
    if (!nuevoPago.adresRegionalId || !nuevoPago.ipsDestinoId || !nuevoPago.concepto || !nuevoPago.monto) {
      toast.error('Complete todos los campos requeridos');
      return;
    }

    try {
      const res = await fetch(`${API_URL}/adres/pagos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...nuevoPago,
          monto: parseFloat(nuevoPago.monto),
        }),
      });

      if (res.ok) {
        toast.success('Pago creado exitosamente');
        setDialogOpen(false);
        setNuevoPago({
          adresRegionalId: '',
          ipsDestinoId: '',
          concepto: '',
          monto: '',
          numeroFactura: '',
          periodo: '',
        });
        fetchData();
      } else {
        const error = await res.json();
        toast.error(error.message || 'Error al crear pago');
      }
    } catch (error) {
      toast.error('Error de conexión');
    }
  };

  // Abrir modal de firma biométrica para aprobar
  const iniciarFirmaPago = (pago: Pago) => {
    setPagoAFirmar(pago);
    setFirmaOpen(true);
  };

  // Callback cuando la firma es exitosa
  const onFirmaExitosa = async (firma: any) => {
    if (!pagoAFirmar) return;
    
    setProcesando(pagoAFirmar.id);
    try {
      const res = await fetch(`${API_URL}/adres/pagos/${pagoAFirmar.id}/procesar`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ estado: 'procesado', firmaBiometricaId: firma.id }),
      });

      if (res.ok) {
        toast.success('Pago aprobado con firma biométrica');
        fetchData();
      } else {
        const error = await res.json();
        toast.error(error.message || 'Error al procesar pago');
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setProcesando(null);
      setFirmaOpen(false);
      setPagoAFirmar(null);
    }
  };

  const rechazarPago = async (id: string) => {
    setProcesando(id);
    try {
      const res = await fetch(`${API_URL}/adres/pagos/${id}/procesar`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ estado: 'rechazado' }),
      });

      if (res.ok) {
        toast.success('Pago rechazado');
        fetchData();
      } else {
        const error = await res.json();
        toast.error(error.message || 'Error al rechazar pago');
      }
    } catch (error) {
      toast.error('Error de conexión');
    } finally {
      setProcesando(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const stats = estadisticas || {
    presupuestoNacional: 0,
    presupuestoEjecutado: 0,
    porcentajeEjecucion: '0',
    upcPromedio: 1200000,
    totalAfiliados: 0,
    totalCaps: 0,
    totalIps: 0,
    pagosDelMes: { monto: 0, cantidad: 0 },
    deudaPendiente: { monto: 0, cantidad: 0 },
    regionales: [],
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <DollarSign className="h-7 w-7 text-emerald-600" />
            Gestión Financiera - ADRES
          </h1>
          <p className="text-gray-500 mt-1">Pagos directos a IPS · Sin intermediarios</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Badge className="bg-emerald-100 text-emerald-700 border-0 px-4 py-2">
            <TrendingUp className="h-4 w-4 mr-2" />
            Reforma Salud
          </Badge>
        </div>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-green-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-emerald-600 font-medium">Presupuesto Nacional</p>
              <div className="p-2 bg-emerald-500 rounded-lg">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-emerald-900">{formatCurrency(stats.presupuestoNacional)}</p>
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-emerald-600">Ejecutado</span>
                <span className="font-medium text-emerald-700">{stats.porcentajeEjecucion}%</span>
              </div>
              <div className="h-2 bg-emerald-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${stats.porcentajeEjecucion}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-blue-600 font-medium">UPC Promedio</p>
              <div className="p-2 bg-blue-500 rounded-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-blue-900">{formatCurrency(stats.upcPromedio)}</p>
            <p className="text-xs text-blue-600 mt-2">Por paciente / año</p>
            <p className="text-sm text-blue-700 mt-1 font-medium">
              {stats.totalAfiliados.toLocaleString()} afiliados
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-violet-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-purple-600 font-medium">Pagos del Mes</p>
              <div className="p-2 bg-purple-500 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-purple-900">{formatCurrency(stats.pagosDelMes.monto)}</p>
            <p className="text-xs text-purple-600 mt-2">Directos a IPS</p>
            <p className="text-sm text-purple-700 mt-1 font-medium">
              {stats.pagosDelMes.cantidad} transacciones
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-orange-100">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-amber-600 font-medium">Pagos Pendientes</p>
              <div className="p-2 bg-amber-500 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
            </div>
            <p className="text-3xl font-bold text-amber-900">{formatCurrency(stats.deudaPendiente.monto)}</p>
            <p className="text-xs text-amber-600 mt-2">Por aprobar</p>
            <p className="text-sm text-amber-700 mt-1 font-medium">
              {stats.deudaPendiente.cantidad} pagos pendientes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Pagos */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-gray-400" />
            Pagos a IPS
          </CardTitle>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Pago
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Pago</DialogTitle>
                <DialogDescription>
                  Registre un pago directo de ADRES a una IPS
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>ADRES Regional</Label>
                  <Select
                    value={nuevoPago.adresRegionalId}
                    onValueChange={(v) => setNuevoPago({ ...nuevoPago, adresRegionalId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione regional" />
                    </SelectTrigger>
                    <SelectContent>
                      {stats.regionales.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.nombre} - {r.departamento}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>IPS Destino</Label>
                  <Select
                    value={nuevoPago.ipsDestinoId}
                    onValueChange={(v) => setNuevoPago({ ...nuevoPago, ipsDestinoId: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione IPS" />
                    </SelectTrigger>
                    <SelectContent>
                      {ipsList.map((ips) => (
                        <SelectItem key={ips.id} value={ips.id}>
                          {ips.nombre} - {ips.ciudad}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Concepto</Label>
                  <Input
                    value={nuevoPago.concepto}
                    onChange={(e) => setNuevoPago({ ...nuevoPago, concepto: e.target.value })}
                    placeholder="Ej: Pago servicios mes de enero"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Monto (COP)</Label>
                    <Input
                      type="number"
                      value={nuevoPago.monto}
                      onChange={(e) => setNuevoPago({ ...nuevoPago, monto: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Período</Label>
                    <Input
                      value={nuevoPago.periodo}
                      onChange={(e) => setNuevoPago({ ...nuevoPago, periodo: e.target.value })}
                      placeholder="Ej: 2024-01"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Número de Factura (opcional)</Label>
                  <Input
                    value={nuevoPago.numeroFactura}
                    onChange={(e) => setNuevoPago({ ...nuevoPago, numeroFactura: e.target.value })}
                    placeholder="Ej: FAC-001234"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={crearPago} className="bg-emerald-600 hover:bg-emerald-700">
                  Crear Pago
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {pagos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <DollarSign className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p>No hay pagos registrados</p>
              <p className="text-sm">Cree un nuevo pago para comenzar</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Regional</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagos.map((pago) => (
                  <TableRow key={pago.id}>
                    <TableCell className="font-medium">{pago.concepto}</TableCell>
                    <TableCell>{pago.adresRegional?.nombre || '-'}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(pago.monto)}</TableCell>
                    <TableCell>{pago.periodo || '-'}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          pago.estado === 'procesado'
                            ? 'bg-emerald-100 text-emerald-700'
                            : pago.estado === 'rechazado'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-amber-100 text-amber-700'
                        }
                      >
                        {pago.estado === 'procesado' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                        {pago.estado === 'rechazado' && <XCircle className="h-3 w-3 mr-1" />}
                        {pago.estado === 'pendiente' && <Clock className="h-3 w-3 mr-1" />}
                        {pago.estado}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(pago.fechaPago).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      {pago.estado === 'pendiente' && (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => iniciarFirmaPago(pago)}
                            disabled={procesando === pago.id}
                          >
                            {procesando === pago.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <ScanFace className="h-4 w-4 mr-1" />
                                Firmar y Aprobar
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => rechazarPago(pago.id)}
                            disabled={procesando === pago.id}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Rechazar
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Fondos Regionales */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <PieChart className="h-5 w-5 text-gray-400" />
            Fondos Regionales (Mini-ADRES)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats.regionales.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Building2 className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p>No hay regionales registradas</p>
            </div>
          ) : (
            <div className="space-y-4">
              {stats.regionales.map((regional) => {
                const porcentaje = regional.presupuesto > 0 
                  ? ((regional.ejecutado / regional.presupuesto) * 100).toFixed(0) 
                  : '0';
                return (
                  <div key={regional.id} className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900">{regional.nombre}</h4>
                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {regional.caps} CAPs
                          </span>
                          <span className="flex items-center gap-1">
                            <Hospital className="h-3 w-3" />
                            {regional.ips} IPS
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">{formatCurrency(regional.presupuesto)}</p>
                        <p className="text-sm text-gray-500">
                          Ejecutado: {formatCurrency(regional.ejecutado)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            parseInt(porcentaje) >= 80 ? 'bg-emerald-500' :
                            parseInt(porcentaje) >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${porcentaje}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700 w-12">{porcentaje}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Principios de la Reforma */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-gray-50 to-slate-50">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Principios del Modelo Financiero</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white rounded-xl border border-gray-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <ArrowRight className="h-4 w-4 text-emerald-600" />
                </div>
                <h4 className="font-semibold text-gray-900">Pago Directo</h4>
              </div>
              <p className="text-sm text-gray-600">
                ADRES paga directamente a hospitales y clínicas, sin intermediarios EPS.
              </p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-gray-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                </div>
                <h4 className="font-semibold text-gray-900">Transparencia</h4>
              </div>
              <p className="text-sm text-gray-600">
                Sistema único de información para trazabilidad de cada peso invertido.
              </p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-gray-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Building2 className="h-4 w-4 text-purple-600" />
                </div>
                <h4 className="font-semibold text-gray-900">Descentralización</h4>
              </div>
              <p className="text-sm text-gray-600">
                Fondos regionales (mini-ADRES) para gestión territorial eficiente.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Firma Biométrica */}
      {pagoAFirmar && (
        <FirmaBiometrica
          open={firmaOpen}
          onClose={() => {
            setFirmaOpen(false);
            setPagoAFirmar(null);
          }}
          onSuccess={onFirmaExitosa}
          titulo="Firma Biométrica Requerida"
          descripcion={`Aprobar pago: ${pagoAFirmar.concepto}`}
          monto={pagoAFirmar.monto}
          entidadTipo="PagoADRES"
          entidadId={pagoAFirmar.id}
          tipoAccion="APROBACION_PAGO"
        />
      )}
    </div>
  );
}

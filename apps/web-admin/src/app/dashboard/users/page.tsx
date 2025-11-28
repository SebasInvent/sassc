"use client";

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserMenu } from '@/components/UserMenu';
import { NotificationsBell } from '@/components/dashboard/notifications-bell';
import { 
  Users, 
  Search, 
  Plus,
  Shield,
  CheckCircle2,
  XCircle,
  Edit,
  Trash2,
  ArrowLeft
} from 'lucide-react';

const fetcher = async (url: string, token: string) => {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Error al cargar usuarios');
  return res.json();
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  DOCTOR: 'Médico',
  NURSE: 'Enfermera',
  PHARMACIST: 'Farmacéutico',
  RADIOLOGIST: 'Radiólogo',
  LAB_TECHNICIAN: 'Técnico de Laboratorio',
  RECEPTIONIST: 'Recepcionista',
  PATIENT: 'Paciente',
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-purple-500',
  DOCTOR: 'bg-blue-500',
  NURSE: 'bg-green-500',
  PHARMACIST: 'bg-orange-500',
  RADIOLOGIST: 'bg-indigo-500',
  LAB_TECHNICIAN: 'bg-cyan-500',
  RECEPTIONIST: 'bg-pink-500',
  PATIENT: 'bg-gray-500',
};

export default function UsersPage() {
  const { token } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  const { data: users, isLoading, mutate } = useSWR(
    token ? 'http://localhost:3001/users' : null,
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

  const getRoleBadge = (role: string) => {
    return (
      <Badge className={`${ROLE_COLORS[role]} text-white`}>
        {ROLE_LABELS[role] || role}
      </Badge>
    );
  };

  // Filter users
  const filteredUsers = users?.filter((user: any) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.firstName.toLowerCase().includes(searchLower) ||
      user.lastName.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      ROLE_LABELS[user.role]?.toLowerCase().includes(searchLower)
    );
  }) || [];

  // Stats
  const stats = {
    total: users?.length || 0,
    active: users?.filter((u: any) => u.isActive).length || 0,
    admins: users?.filter((u: any) => u.role === 'ADMIN').length || 0,
    doctors: users?.filter((u: any) => u.role === 'DOCTOR').length || 0,
  };

  return (
    <ProtectedRoute requiredRole={['ADMIN']}>
      <div>
        {/* Modern Header */}
        <div className="bg-gradient-to-r from-gray-700 via-slate-800 to-zinc-900 shadow-xl">
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
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Gestión de Usuarios</h1>
                  <p className="text-gray-300 mt-1">Control de acceso y roles del sistema</p>
                </div>
              </div>
              <Button className="bg-white text-gray-900 hover:bg-gray-100">
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Usuario
              </Button>
            </div>
          </div>
        </div>

        <div className="container mx-auto p-8 space-y-6">

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Registrados en el sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">Con acceso habilitado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administradores</CardTitle>
            <Shield className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.admins}</div>
            <p className="text-xs text-muted-foreground">Acceso completo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Médicos</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.doctors}</div>
            <p className="text-xs text-muted-foreground">Personal médico</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, email o rol..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Usuarios del Sistema ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Cargando usuarios...</p>
          ) : filteredUsers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Último Acceso</TableHead>
                  <TableHead>Fecha Registro</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.firstName} {user.lastName}
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>
                      {user.isActive ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Activo
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-red-100 text-red-800">
                          <XCircle className="mr-1 h-3 w-3" />
                          Inactivo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Nunca'}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(user.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-600">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <p className="mt-4 text-muted-foreground">
                {searchTerm ? 'No se encontraron usuarios con ese criterio' : 'No hay usuarios registrados'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role Permissions Info */}
      <Card>
        <CardHeader>
          <CardTitle>Permisos por Rol</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 border rounded-lg">
              <Badge className="bg-purple-500 text-white mb-2">Administrador</Badge>
              <p className="text-sm text-muted-foreground">
                Acceso completo a todos los módulos y configuración del sistema
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <Badge className="bg-blue-500 text-white mb-2">Médico</Badge>
              <p className="text-sm text-muted-foreground">
                Pacientes, citas, prescripciones, órdenes de lab e imágenes
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <Badge className="bg-green-500 text-white mb-2">Enfermera</Badge>
              <p className="text-sm text-muted-foreground">
                Citas, observaciones, signos vitales, asistencia médica
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <Badge className="bg-orange-500 text-white mb-2">Farmacéutico</Badge>
              <p className="text-sm text-muted-foreground">
                Prescripciones, dispensación, inventario de medicamentos
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <Badge className="bg-indigo-500 text-white mb-2">Radiólogo</Badge>
              <p className="text-sm text-muted-foreground">
                Órdenes de imágenes, subir reportes, visualizar estudios
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <Badge className="bg-cyan-500 text-white mb-2">Técnico Lab</Badge>
              <p className="text-sm text-muted-foreground">
                Órdenes de laboratorio, subir resultados, gestión de muestras
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <Badge className="bg-pink-500 text-white mb-2">Recepcionista</Badge>
              <p className="text-sm text-muted-foreground">
                Citas, registro de pacientes, check-in, información general
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <Badge className="bg-gray-500 text-white mb-2">Paciente</Badge>
              <p className="text-sm text-muted-foreground">
                Ver su historia clínica, resultados, citas y prescripciones
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}

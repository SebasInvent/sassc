"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AddPatientDialog } from '@/components/dashboard/add-patient-dialog';
import { EditPatientDialog } from '@/components/dashboard/edit-patient-dialog';
import { DeletePatientDialog } from '@/components/dashboard/delete-patient-dialog';
import { 
  Users, 
  Search, 
  Eye, 
  Calendar,
  Edit,
  Trash2,
  UserPlus,
  Phone,
  Mail,
  ChevronRight,
  Scan,
  UserCheck,
  Filter
} from 'lucide-react';
import { API_URL } from '@/lib/api';

// --- SWR Fetcher ---
const fetcher = async (url: string, token: string) => {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    throw new Error('No se pudieron cargar los datos de los pacientes.');
  }
  return res.json();
};

// --- Tipos de Datos ---
type Patient = {
  id: string;
  firstName: string;
  lastName: string;
  docNumber: string;
  docType?: string;
  birthDate: string;
  email?: string | null;
  phone?: string | null;
  biometricRegistered?: boolean;
};

export default function PatientsPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const apiUrl = searchTerm 
    ? `${API_URL}/fhir/Patient?search=${searchTerm}`
    : '${API_URL}/fhir/Patient';
  
  const { data: patients, error, isLoading, mutate } = useSWR<Patient[]>(
    token ? apiUrl : null,
    (url: string) => fetcher(url, token!)
  );

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const stats = {
    total: patients?.length || 0,
    withBiometric: patients?.filter(p => p.biometricRegistered).length || 0,
    recent: patients?.filter(p => {
      const created = new Date(p.birthDate);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return created > weekAgo;
    }).length || 0,
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="p-8 space-y-8">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-100 rounded-xl w-1/3" />
          <div className="grid grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="h-28 bg-gray-100 rounded-2xl" />)}
          </div>
          <div className="h-12 bg-gray-100 rounded-xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-44 bg-gray-100 rounded-2xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header elegante */}
      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all duration-500 ${
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Pacientes</h1>
          <p className="text-gray-500 mt-1">Gestión integral de pacientes del sistema</p>
        </div>
        <AddPatientDialog onSuccess={() => mutate()} />
      </div>

      {/* Stats Cards - Estilo minimalista */}
      <div className={`grid grid-cols-1 sm:grid-cols-3 gap-6 transition-all duration-500 delay-100 ${
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}>
        <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Pacientes</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <Users className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Con Biometría</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.withBiometric}</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl">
                <UserCheck className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Registros Hoy</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.recent}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl">
                <UserPlus className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar - Minimalista */}
      <div className={`transition-all duration-500 delay-200 ${
        mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Buscar por nombre o documento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12 bg-white border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          />
        </div>
      </div>

      {/* Patients Grid - Diseño elegante */}
      {!patients || patients.length === 0 ? (
        <Card className={`border-0 shadow-sm transition-all duration-500 delay-300 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <CardContent className="p-16 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="h-10 w-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay pacientes registrados</h3>
            <p className="text-gray-500 mb-6">Comienza agregando tu primer paciente al sistema</p>
            <AddPatientDialog onSuccess={() => mutate()} />
          </CardContent>
        </Card>
      ) : (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 transition-all duration-500 delay-300 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          {patients.map((patient, index) => (
            <Card 
              key={patient.id} 
              className="border-0 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group bg-white overflow-hidden"
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => router.push(`/dashboard/patients/${patient.id}`)}
            >
              <CardContent className="p-0">
                {/* Patient Header */}
                <div className="p-5 border-b border-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {patient.firstName[0]}{patient.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate group-hover:text-gray-700 transition-colors">
                        {patient.firstName} {patient.lastName}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {patient.docType || 'CC'} {patient.docNumber}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>

                {/* Patient Info */}
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="h-4 w-4" />
                      <span>{calculateAge(patient.birthDate)} años</span>
                    </div>
                    {patient.biometricRegistered ? (
                      <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-0">
                        <Scan className="h-3 w-3 mr-1" />
                        Verificado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-500 border-gray-200">
                        Sin biometría
                      </Badge>
                    )}
                  </div>

                  {patient.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Phone className="h-4 w-4" />
                      <span>{patient.phone}</span>
                    </div>
                  )}

                  {patient.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 truncate">
                      <Mail className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{patient.email}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="px-5 pb-5 flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/dashboard/patients/${patient.id}`);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPatient(patient);
                      setEditDialogOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-gray-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPatient(patient);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Footer info */}
      {patients && patients.length > 0 && (
        <div className="text-center text-sm text-gray-400 pt-4">
          Mostrando {patients.length} pacientes
        </div>
      )}

      {/* Dialogs */}
      {selectedPatient && (
        <>
          <EditPatientDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            patient={selectedPatient}
            onSuccess={() => {
              mutate();
              setEditDialogOpen(false);
            }}
          />
          <DeletePatientDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            patient={selectedPatient}
            onSuccess={() => {
              mutate();
              setDeleteDialogOpen(false);
            }}
          />
        </>
      )}
    </div>
  );
}

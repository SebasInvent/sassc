'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, Stethoscope } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/lib/api';

interface KpiData {
  totalPatients: number;
  appointmentsToday: number;
  activePractitioners: number;
}

export function KpiCards() {
  const { token } = useAuth();
  const [data, setData] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    async function fetchKpis() {
      try {
        const response = await fetch(`${API_URL}/dashboard/kpis`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error('Failed to fetch KPIs');
        }
        const kpis = await response.json();
        setData(kpis);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchKpis();
  }, [token]);

  if (loading) {
    return <div>Loading stats...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <div className="grid gap-3 sm:gap-4 lg:gap-6 grid-cols-1 sm:grid-cols-3">
      <Card className="relative overflow-hidden border-blue-200 bg-gradient-to-br from-white to-blue-50 hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
          <CardTitle className="text-xs sm:text-sm font-medium text-gray-700">Total Pacientes</CardTitle>
          <div className="p-2 sm:p-3 bg-blue-500 rounded-lg sm:rounded-xl shadow-md">
            <svg className="h-4 w-4 sm:h-6 sm:w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          <div className="text-2xl sm:text-3xl font-bold text-gray-900">{data?.totalPatients || 0}</div>
          <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Registrados en el sistema</p>
        </CardContent>
      </Card>
      
      <Card className="relative overflow-hidden border-green-200 bg-gradient-to-br from-white to-green-50 hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
          <CardTitle className="text-xs sm:text-sm font-medium text-gray-700">Citas Hoy</CardTitle>
          <div className="p-2 sm:p-3 bg-green-500 rounded-lg sm:rounded-xl shadow-md">
            <svg className="h-4 w-4 sm:h-6 sm:w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          <div className="text-2xl sm:text-3xl font-bold text-gray-900">{data?.appointmentsToday || 0}</div>
          <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Programadas para hoy</p>
        </CardContent>
      </Card>
      
      <Card className="relative overflow-hidden border-purple-200 bg-gradient-to-br from-white to-purple-50 hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 sm:p-6">
          <CardTitle className="text-xs sm:text-sm font-medium text-gray-700">Profesionales Activos</CardTitle>
          <div className="p-2 sm:p-3 bg-purple-500 rounded-lg sm:rounded-xl shadow-md">
            <svg className="h-4 w-4 sm:h-6 sm:w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
          <div className="text-2xl sm:text-3xl font-bold text-gray-900">{data?.activePractitioners || 0}</div>
          <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Disponibles</p>
        </CardContent>
      </Card>
    </div>
  );
}
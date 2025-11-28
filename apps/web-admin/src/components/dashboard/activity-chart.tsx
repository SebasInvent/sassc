"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import useSWR from 'swr';
import { useAuth } from '@/context/AuthContext';

const fetcher = async (url: string, token: string) => {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error('Error al cargar datos');
  return res.json();
};

export function ActivityChart() {
  const { token } = useAuth();

  // Datos de ejemplo (reemplazar con API real)
  const data = [
    { day: 'Lun', citas: 12, prescripciones: 8, dispensaciones: 6 },
    { day: 'Mar', citas: 15, prescripciones: 12, dispensaciones: 10 },
    { day: 'Mié', citas: 10, prescripciones: 7, dispensaciones: 5 },
    { day: 'Jue', citas: 18, prescripciones: 15, dispensaciones: 12 },
    { day: 'Vie', citas: 14, prescripciones: 11, dispensaciones: 9 },
    { day: 'Sáb', citas: 8, prescripciones: 5, dispensaciones: 4 },
    { day: 'Dom', citas: 5, prescripciones: 3, dispensaciones: 2 },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Actividad de la Semana</CardTitle>
        <CardDescription>Resumen de operaciones de los últimos 7 días</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="citas" fill="#8884d8" name="Citas" />
            <Bar dataKey="prescripciones" fill="#82ca9d" name="Prescripciones" />
            <Bar dataKey="dispensaciones" fill="#ffc658" name="Dispensaciones" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
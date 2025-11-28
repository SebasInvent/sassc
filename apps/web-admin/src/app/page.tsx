"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function HomePage() {
  const { token, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (token) {
        // Si hay token, redirigir al dashboard
        router.push('/dashboard');
      } else {
        // Si no hay token, redirigir al login
        router.push('/login');
      }
    }
  }, [token, loading, router]);

  // Mostrar loading mientras se verifica la autenticación
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    </main>
  );
}
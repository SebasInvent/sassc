"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string[];
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { token, user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Si no hay token, redirigir al login
      if (!token) {
        router.push('/login');
        return;
      }

      // Si se requiere un rol específico y el usuario no lo tiene
      if (requiredRole && user && !requiredRole.includes(user.role)) {
        router.push('/dashboard'); // Redirigir al dashboard si no tiene permisos
      }
    }
  }, [token, user, loading, requiredRole, router]);

  // Mostrar loading mientras se verifica
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // Si no hay token, no mostrar nada (se está redirigiendo)
  if (!token) {
    return null;
  }

  // Si se requiere un rol y el usuario no lo tiene, no mostrar nada
  if (requiredRole && user && !requiredRole.includes(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-2">Acceso Denegado</h2>
          <p className="text-muted-foreground">
            No tienes permisos para acceder a esta página.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

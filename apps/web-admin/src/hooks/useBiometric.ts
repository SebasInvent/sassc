import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { biometricService, BiometricStats } from '@/lib/api/biometric';
import { toast } from 'sonner';

export function useBiometricStats() {
  const { data, error, isLoading, mutate } = useSWR<BiometricStats>(
    '/biometric/stats',
    () => biometricService.getStats(),
    {
      refreshInterval: 30000, // Actualizar cada 30 segundos
      revalidateOnFocus: true,
    }
  );

  return {
    stats: data,
    isLoading,
    isError: error,
    refresh: mutate,
  };
}

export function useBiometricRegistration() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = useCallback(async (data: {
    patientId: string;
    biometricType: 'facial' | 'fingerprint';
    biometricData: string;
  }) => {
    setIsRegistering(true);
    setError(null);

    try {
      const result = await biometricService.register(data);
      toast.success('Registro biométrico exitoso');
      return result;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error al registrar datos biométricos';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setIsRegistering(false);
    }
  }, []);

  return {
    register,
    isRegistering,
    error,
  };
}

export function useBiometricVerification() {
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = useCallback(async (data: {
    biometricType: 'facial' | 'fingerprint';
    biometricData: string;
  }) => {
    setIsVerifying(true);
    setError(null);

    try {
      const result = await biometricService.verify(data);
      
      if (result.success) {
        const score = result.verificationScore ?? 0;
        toast.success(`Verificación exitosa - Confianza: ${(score * 100).toFixed(1)}%`);
      } else if (result.isNotRegistered) {
        // Persona no registrada
        toast.error('No estás registrado en el sistema', {
          description: 'Por favor, procede al registro para poder acceder.',
          action: {
            label: 'Ir al Registro',
            onClick: () => window.location.href = result.registrationUrl || '/auth/register',
          },
          duration: 10000,
        });
      } else {
        toast.error('No se pudo verificar tu identidad');
      }
      
      return result;
    } catch (err: any) {
      const errorData = err.response?.data;
      if (errorData?.isNotRegistered) {
        setError('No estás registrado en el sistema');
        toast.error('No estás registrado en el sistema', {
          description: 'Por favor, procede al registro.',
          action: {
            label: 'Ir al Registro',
            onClick: () => window.location.href = errorData.registrationUrl || '/auth/register',
          },
          duration: 10000,
        });
      } else {
        const errorMessage = errorData?.message || 'Error al verificar identidad';
        setError(errorMessage);
        toast.error(errorMessage);
      }
      throw err;
    } finally {
      setIsVerifying(false);
    }
  }, []);

  return {
    verify,
    isVerifying,
    error,
  };
}

export function useBiometricLogin() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (data: {
    method: 'FACIAL' | 'FINGERPRINT' | 'RA08';
    faceImageBase64?: string;
    fingerprintTemplate?: string;
    deviceId?: string;
  }) => {
    setIsLoggingIn(true);
    setError(null);

    try {
      const result = await biometricService.login(data);
      
      if (result.success) {
        toast.success(`Bienvenido ${result.user?.firstName} ${result.user?.lastName}`);
        
        // Guardar token si existe
        if (result.accessToken) {
          localStorage.setItem('accessToken', result.accessToken);
        }
      } else if (result.isNotRegistered) {
        // Persona no registrada - mostrar mensaje amigable con link de registro
        toast.error('No estás registrado en el sistema', {
          description: 'Por favor, procede al registro para poder acceder.',
          action: {
            label: 'Ir al Registro',
            onClick: () => window.location.href = result.registrationUrl || '/auth/register',
          },
          duration: 10000,
        });
      } else {
        toast.error('No se pudo verificar tu identidad', {
          description: 'Intenta de nuevo o contacta al administrador.',
        });
      }
      
      return result;
    } catch (err: any) {
      const errorData = err.response?.data;
      
      // Verificar si es error de no registrado
      if (errorData?.isNotRegistered) {
        setError('No estás registrado en el sistema');
        toast.error('No estás registrado en el sistema', {
          description: 'Por favor, procede al registro para poder acceder.',
          action: {
            label: 'Ir al Registro',
            onClick: () => window.location.href = errorData.registrationUrl || '/auth/register',
          },
          duration: 10000,
        });
      } else {
        const errorMessage = errorData?.message || 'Error en login biométrico';
        setError(errorMessage);
        toast.error(errorMessage);
      }
      throw err;
    } finally {
      setIsLoggingIn(false);
    }
  }, []);

  return {
    login,
    isLoggingIn,
    error,
  };
}

export function useBiometricCheckin() {
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkin = useCallback(async (data: {
    type: 'APPOINTMENT' | 'WALK_IN' | 'EMERGENCY';
    faceImageBase64: string;
    appointmentId?: string;
    locationName?: string;
    latitude?: number;
    longitude?: number;
    temperature?: number;
  }) => {
    setIsCheckingIn(true);
    setError(null);

    try {
      const result = await biometricService.checkin(data);
      
      if (result.success) {
        toast.success(
          `Check-in exitoso - ${result.patient?.firstName} ${result.patient?.lastName}`,
          {
            description: result.appointment 
              ? `Cita con ${result.appointment.practitionerName}` 
              : undefined,
          }
        );
      } else if (result.isNotRegistered) {
        // Persona no registrada
        toast.error('No estás registrado en el sistema', {
          description: 'Por favor, procede al registro para poder realizar el check-in.',
          action: {
            label: 'Ir al Registro',
            onClick: () => window.location.href = result.registrationUrl || '/auth/register',
          },
          duration: 10000,
        });
      } else {
        toast.error('Check-in fallido - No se pudo verificar identidad');
      }
      
      return result;
    } catch (err: any) {
      const errorData = err.response?.data;
      if (errorData?.isNotRegistered) {
        setError('No estás registrado en el sistema');
        toast.error('No estás registrado en el sistema', {
          description: 'Por favor, procede al registro.',
          action: {
            label: 'Ir al Registro',
            onClick: () => window.location.href = errorData.registrationUrl || '/auth/register',
          },
          duration: 10000,
        });
      } else {
        const errorMessage = errorData?.message || 'Error en check-in';
        setError(errorMessage);
        toast.error(errorMessage);
      }
      throw err;
    } finally {
      setIsCheckingIn(false);
    }
  }, []);

  return {
    checkin,
    isCheckingIn,
    error,
  };
}

export function useBiometricSearch() {
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);

  const search = useCallback(async (data: {
    faceImageBase64?: string;
    fingerprintTemplate?: string;
    documentNumber?: string;
    maxResults?: number;
    confidenceThreshold?: number;
  }) => {
    setIsSearching(true);
    setError(null);

    try {
      const result = await biometricService.search(data);
      setResults(result);
      
      if (result.length === 0) {
        toast.info('No se encontraron coincidencias');
      } else {
        toast.success(`Se encontraron ${result.length} coincidencia(s)`);
      }
      
      return result;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error en búsqueda';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    } finally {
      setIsSearching(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
  }, []);

  return {
    search,
    isSearching,
    error,
    results,
    clearResults,
  };
}
